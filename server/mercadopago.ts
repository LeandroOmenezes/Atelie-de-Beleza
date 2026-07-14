import { MercadoPagoConfig, Payment, PreApproval, CardToken } from "mercadopago";

// Initialize Mercado Pago SDK
let payment: any = null;
let preApproval: any = null;
let cardTokenClient: any = null;

function initializeMercadoPago() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return;
  }
  
  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  });

  payment = new Payment(client);
  preApproval = new PreApproval(client);
  cardTokenClient = new CardToken(client);
}

initializeMercadoPago();

export interface TokenizeCardData {
  cardNumber: string;
  cardholderName: string;
  cardExpirationDate: string;
  securityCode: string;
}

function getMercadoPagoClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("Mercado Pago não está configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.");
  }

  if (!cardTokenClient) {
    const client = new MercadoPagoConfig({
      accessToken,
    });
    cardTokenClient = new CardToken(client);
  }

  return {
    client: cardTokenClient,
    isSandbox: accessToken.startsWith("TEST-"),
  };
}

export async function tokenizeCardWithMercadoPago(data: TokenizeCardData) {
  const { client, isSandbox } = getMercadoPagoClient();

  const normalizedCardNumber = data.cardNumber.replace(/\s+/g, "");
  const [expirationMonth, expirationYear] = data.cardExpirationDate.split("/");
  const normalizedExpirationYear = expirationYear?.length === 2 ? `20${expirationYear}` : expirationYear;

  if (!normalizedCardNumber || !data.cardholderName || !expirationMonth || !normalizedExpirationYear || !data.securityCode) {
    throw new Error("Dados do cartão incompletos para tokenização");
  }

  const body = {
    card_number: normalizedCardNumber,
    expiration_month: expirationMonth.padStart(2, "0"),
    expiration_year: normalizedExpirationYear,
    security_code: data.securityCode,
    cardholder: {
      name: data.cardholderName,
    },
  };

  try {
    const tokenData = await client.create({
      body,
      requestOptions: {
        testToken: isSandbox,
      },
    });

    if (!tokenData?.id) {
      throw new Error("Mercado Pago não retornou um token válido");
    }

    return {
      token: tokenData.id as string,
      id: tokenData.id as string,
    };
  } catch (error: any) {
    const errorCode = error?.code || error?.error || "unknown_error";
    const errorCause = Array.isArray(error?.cause) ? error.cause.map((cause: any) => cause.description).join("; ") : undefined;
    const formattedError = [error?.message || "Erro ao tokenizar cartão", errorCode, errorCause].filter(Boolean).join(" - ");
    console.error("Mercado Pago tokenization SDK error:", error);
    throw new Error(formattedError);
  }
}

/**
 * Cria um pagamento avulso para um agendamento específico
 * @param amount - Valor do pagamento em reais
 * @param token - Token do cartão gerado pelo Payment Brick
 * @param description - Descrição do pagamento
 * @param email - Email do pagador
 * @param appointmentId - ID do agendamento
 * @returns ID do pagamento no Mercado Pago
 */
export async function createAppointmentPayment(
  amount: number,
  token: string,
  description: string,
  email: string,
  appointmentId: number
) {
  if (!payment) {
    throw new Error("Mercado Pago não está configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.");
  }
  
  try {
    const result = await payment.create({
      body: {
        transaction_amount: amount,
        token: token,
        description: `Agendamento #${appointmentId}: ${description}`,
        installments: 1,
        payment_method_id: "credit_card",
        payer: {
          email: email,
        },
        // Metadata para rastrear o pagamento
        metadata: {
          appointmentId: appointmentId,
        },
      },
    });

    return {
      id: result.id,
      status: result.status,
      amount: result.transaction_amount,
    };
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    throw new Error("Falha ao processar pagamento");
  }
}

/**
 * Consulta o status de um pagamento
 * @param paymentId - ID do pagamento no Mercado Pago
 * @returns Status e detalhes do pagamento
 */
export async function getPayment(paymentId: number) {
  if (!payment) {
    throw new Error("Mercado Pago não está configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.");
  }
  
  try {
    const result = await payment.get({ id: paymentId });
    return {
      id: result.id,
      status: result.status,
      statusDetail: result.status_detail,
      amount: result.transaction_amount,
      approvedAt: result.date_approved,
    };
  } catch (error) {
    console.error("Erro ao consultar pagamento:", error);
    throw new Error("Falha ao consultar status do pagamento");
  }
}

/**
 * Cria uma assinatura recorrente (cobrança mensal automática)
 * @param token - Token do cartão
 * @param planPrice - Valor da mensalidade
 * @param planName - Nome do plano
 * @param email - Email do cliente
 * @param startDate - Data de início da assinatura
 * @returns ID da assinatura (preapprovalId) e status
 */
export async function createPreapproval(
  token: string,
  planPrice: number,
  planName: string,
  email: string,
  startDate: Date
) {
  if (!preApproval) {
    throw new Error("Mercado Pago não está configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.");
  }
  
  try {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setFullYear(today.getFullYear() + 1); // Assinatura válida por 1 ano

    const result = await preApproval.create({
      body: ({
        payer_email: email,
        card_token_id: token,
        external_reference: planName,
        reason: `Plano de Assinatura: ${planName}`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: planPrice,
          currency_id: "BRL",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      } as any),
    } as any);

    return {
      id: (result as any).id,
      status: (result as any).status,
      nextBillingDate: (result as any).next_billing_date,
    };
  } catch (error) {
    console.error("Erro ao criar assinatura:", error);
    throw new Error("Falha ao criar assinatura recorrente");
  }
}

/**
 * Consulta o status de uma assinatura
 * @param preapprovalId - ID da assinatura no Mercado Pago
 * @returns Status e detalhes da assinatura
 */
export async function getPreapproval(preapprovalId: string) {
  if (!preApproval) {
    throw new Error("Mercado Pago não está configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.");
  }
  
  try {
    const result = await preApproval.get({ id: preapprovalId });
    return {
      id: result.id,
      status: (result as any).status,
      nextBillingDate: (result as any).next_billing_date,
      reason: (result as any).reason,
      summarized: (result as any).summarized,
    };
  } catch (error) {
    console.error("Erro ao consultar assinatura:", error);
    throw new Error("Falha ao consultar status da assinatura");
  }
}

/**
 * Cancela uma assinatura ativa
 * @param preapprovalId - ID da assinatura no Mercado Pago
 * @returns Confirmação do cancelamento
 */
export async function cancelPreapproval(preapprovalId: string) {
  if (!preApproval) {
    throw new Error("Mercado Pago não está configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.");
  }
  
  try {
    const result = await preApproval.update({
      id: preapprovalId,
      body: {
        status: "cancelled",
      },
    });

    return {
      id: result.id,
      status: result.status,
    };
  } catch (error) {
    console.error("Erro ao cancelar assinatura:", error);
    throw new Error("Falha ao cancelar assinatura");
  }
}

/**
 * Retorna a chave pública do Mercado Pago para o frontend
 * (usado para inicializar o SDK no navegador)
 */
export function getPublicKey(): string {
  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;
  if (!publicKey) {
    console.warn("AVISO: Mercado Pago não está configurado. Configure MERCADOPAGO_PUBLIC_KEY para usar pagamentos.");
    return ""; // Retorna string vazia para permitir que a aplicação continue funcionando
  }
  return publicKey;
}

export function isMercadoPagoConfigured(): boolean {
  return !!process.env.MERCADOPAGO_PUBLIC_KEY && !!process.env.MERCADOPAGO_ACCESS_TOKEN;
}
