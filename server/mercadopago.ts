import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error("MERCADOPAGO_ACCESS_TOKEN must be set in environment variables");
}

// Initialize Mercado Pago SDK
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const payment = new Payment(client);
const preApproval = new PreApproval(client);

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
  try {
    const result = await payment.create({
      body: {
        transaction_amount: amount,
        token: token,
        description: `Agendamento #${appointmentId}: ${description}`,
        installments: 1,
        payment_method_id: "debit_card",
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
    throw new Error("MERCADOPAGO_PUBLIC_KEY must be set in environment variables");
  }
  return publicKey;
}
