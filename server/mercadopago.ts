import { MercadoPagoConfig, Payment, PreApproval, PreApprovalPlan, CardToken } from "mercadopago";

// Initialize Mercado Pago SDK
let payment: any = null;
let preApproval: any = null;
let preApprovalPlan: any = null;
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
  preApprovalPlan = new PreApprovalPlan(client);
  cardTokenClient = new CardToken(client);
}

initializeMercadoPago();

function collectErrorMessages(error: any): string[] {
  const values: string[] = [];
  const queue = [error, error?.cause, error?.response, error?.response?.cause, error?.response?.data];

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") {
      continue;
    }

    if (typeof current.message === "string" && current.message.trim()) {
      values.push(current.message);
    }
    if (typeof current.error === "string" && current.error.trim()) {
      values.push(current.error);
    }
    if (typeof current.description === "string" && current.description.trim()) {
      values.push(current.description);
    }
    if (typeof current.status === "number") {
      values.push(String(current.status));
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (current.cause) queue.push(current.cause);
    if (current.response) queue.push(current.response);
    if (current.data) queue.push(current.data);
  }

  return values;
}

export function isPreapprovalPlanVisibilityError(error: any): boolean {
  const messages = collectErrorMessages(error).join(" ").toLowerCase();
  const status = error?.status || error?.response?.status || error?.cause?.status || error?.cause?.response?.status;

  return (
    status === 404 &&
    /template with id|does not exist|not exist|preapproval_plan/i.test(messages)
  );
}

export function isCardTokenServiceError(error: any): boolean {
  const messages = collectErrorMessages(error).join(" ").toLowerCase();
  const status = error?.status || error?.response?.status || error?.cause?.status || error?.cause?.response?.status;

  return status === 404 && /card token service not found|card token/i.test(messages);
}

function extractMercadoPagoRequestId(error: any): string | undefined {
  const fromResponseHeaders =
    error?.response?.headers?.["x-request-id"] ||
    error?.response?.headers?.["X-Request-Id"] ||
    error?.headers?.["x-request-id"] ||
    error?.headers?.["X-Request-Id"];

  if (typeof fromResponseHeaders === "string" && fromResponseHeaders.trim()) {
    return fromResponseHeaders;
  }

  const cause = Array.isArray(error?.cause) ? error.cause : [];
  for (const item of cause) {
    const value = item?.request_id || item?.requestId || item?.x_request_id;
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

export function translateMercadoPagoError(error: any): string {
  const message = String(error?.message || error || "").trim();
  const normalized = message.toLowerCase();

  if (normalized.includes("unauthorized access to resource")) {
    return "O Mercado Pago não autorizou esta operação. Verifique se as credenciais da aplicação Vendedor no ambiente de produção estão corretas e pertencem à mesma aplicação que criou o plano.";
  }

  if (normalized.includes("card token service not found")) {
    return "O Mercado Pago não reconheceu o cartão neste ambiente. Confira se as credenciais e o ambiente de teste estão corretos.";
  }

  return message || "Não foi possível concluir a operação no Mercado Pago.";
}

export function getValidMercadoPagoBackUrl(): string | undefined {
  const raw = (process.env.APP_BASE_URL || "").trim();
  if (!raw) return "https://www.mercadopago.com.br";

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") {
      return "https://www.mercadopago.com.br";
    }
    return parsed.toString();
  } catch {
    return "https://www.mercadopago.com.br";
  }
}

export interface TokenizeCardData {
  cardNumber: string;
  cardholderName: string;
  cardExpirationDate: string;
  securityCode: string;
  identificationType?: string;
  identificationNumber?: string;
}

export function getMercadoPagoRequestOptions(accessToken: string | undefined) {
  return {
    testToken: Boolean(accessToken?.startsWith("TEST-")),
  };
}

export function buildPreapprovalBody({
  token,
  planPrice,
  planName,
  email,
  startDate,
  backUrl,
}: {
  token: string;
  planPrice: number;
  planName: string;
  email: string;
  startDate: Date;
  backUrl?: string;
}) {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setFullYear(today.getFullYear() + 1);

  const body: any = {
    payer_email: email,
    card_token_id: token,
    external_reference: planName,
    reason: `Plano de Assinatura: ${planName}`,
    status: "authorized",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: planPrice,
      currency_id: "BRL",
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    },
  };

  if (backUrl) {
    body.back_url = backUrl;
  }

  return body;
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
  const normalizedIdentificationNumber = (data.identificationNumber || "").replace(/\D+/g, "");
  const identificationType = (data.identificationType || "CPF").toUpperCase();
  // No sandbox do Mercado Pago, usar documento de teste padrão quando não for informado.
  const identificationNumber = normalizedIdentificationNumber || (isSandbox ? "12345678909" : undefined);

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
      identification: identificationNumber
        ? {
            type: identificationType,
            number: identificationNumber,
          }
        : undefined,
    },
  };

  try {
    const tokenData = await client.create({
      body,
      requestOptions: getMercadoPagoRequestOptions(process.env.MERCADOPAGO_ACCESS_TOKEN),
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
        external_reference: `appointment:${appointmentId}`,
        items: [
          {
            id: String(appointmentId),
            title: description,
            description: `Serviço de beleza referente ao agendamento #${appointmentId}`,
            category_id: "services",
            quantity: 1,
            unit_price: amount,
          },
        ],
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
    const backUrl = getValidMercadoPagoBackUrl();
    const body = buildPreapprovalBody({
      token,
      planPrice,
      planName,
      email,
      startDate,
      backUrl,
    });

    const result = await preApproval.create({
      body,
    } as any);

    console.info("[MercadoPago][Subscriptions] preapproval created", {
      preapprovalId: (result as any).id,
      status: (result as any).status,
    });

    return {
      id: (result as any).id,
      status: (result as any).status,
      nextBillingDate: (result as any).next_billing_date,
      nextPaymentDate: (result as any).next_payment_date,
    };
  } catch (error: any) {
    const requestId = extractMercadoPagoRequestId(error);
    console.error("Erro ao criar assinatura:", {
      message: error?.message,
      status: error?.status,
      requestId,
      cause: error?.cause,
    });
    const message = error?.message || "Falha ao criar assinatura recorrente";
    const enrichedMessage = requestId
      ? `${message} (request_id: ${requestId})`
      : message;

    if (isCardTokenServiceError(error)) {
      throw new Error("O token do cartão não foi aceito pelo Mercado Pago neste ambiente. Tente novamente ou use um cartão válido para o ambiente configurado.");
    }

    throw new Error(enrichedMessage);
  }
}

export async function createPreapprovalPlan(
  planPrice: number,
  planName: string,
  backUrl?: string,
) {
  if (!preApprovalPlan) {
    throw new Error("Mercado Pago não está configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.");
  }

  const body: any = {
    reason: `Plano de Assinatura: ${planName}`,
    status: "active",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      repetitions: 12,
      billing_day_proportional: true,
      transaction_amount: planPrice,
      currency_id: "BRL",
    },
  };

  if (backUrl) {
    body.back_url = backUrl;
  }

  try {
    const result = await preApprovalPlan.create({ body } as any);
    const initPoint = (result as any).init_point;

    if (!initPoint) {
      throw new Error("Mercado Pago não retornou o link de autorização da assinatura");
    }

    return {
      id: (result as any).id,
      initPoint,
      status: (result as any).status,
    };
  } catch (error: any) {
    const requestId = extractMercadoPagoRequestId(error);
    const message = translateMercadoPagoError(error);
    throw new Error(requestId ? `${message} (request_id: ${requestId})` : message);
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
    const message = (error as any)?.message || "Falha ao consultar status da assinatura";
    throw new Error(message);
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
