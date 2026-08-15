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

/**
 * Configuração de retry com backoff exponencial
 * Recomendações do guia Mercado Pago para rejeições por fraude:
 * - Não re-tentar imediatamente com os mesmos dados
 * - Aguardar alguns minutos (backoff) antes de nova tentativa
 * - Limitar número de tentativas para evitar suspeita adicional
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number; // Delay inicial em ms
  maxDelayMs: number; // Delay máximo em ms
  backoffMultiplier: number; // Multiplicador exponencial
}

export const DEFAULT_FRAUD_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 5 * 60 * 1000, // 5 minutos
  maxDelayMs: 2 * 60 * 60 * 1000, // 2 horas
  backoffMultiplier: 6, // 5min -> 30min -> 2h
};

/**
 * Calcula delay para próxima tentativa usando backoff exponencial
 * @param attemptNumber - Número da tentativa (começando em 1)
 * @param config - Configuração de retry
 * @returns Delay em milissegundos
 */
export function calculateBackoffDelay(attemptNumber: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1);
  return Math.min(exponentialDelay, config.maxDelayMs);
}

/**
 * Aguarda antes de tentar novamente (implementa backoff)
 * @param delayMs - Tempo de espera em milissegundos
 */
export async function waitForRetry(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Determina se um erro é "retriável" (pode tentar novamente)
 * Padrão: erros de fraude são retriáveis, mas o usuário precisa tentar com outro cartão/dados
 */
export function isRetriableError(error: any, statusDetail?: string): boolean {
  const detail = statusDetail || error?.statusDetail || (error as any).status_detail || "";
  const message = String(error?.message || error || "").toLowerCase();
  
  // Erros de fraude são retriáveis (mas usuário deve mudar dados/cartão)
  if (isFraudRejectionError(error, statusDetail)) {
    return true;
  }
  
  // Erros de timeout/conexão são retriáveis
  const retriablePatterns = [
    /timeout|econnrefused|enotfound/i,
    /temporarily unavailable|service unavailable/i,
  ];
  
  return retriablePatterns.some(pattern => pattern.test(message));
}

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

/**
 * Detecta se um erro é causado por risco de fraude (antifraude Mercado Pago)
 * Padrões conhecidos:
 * - cc_rejected_high_risk: Cartão rejeitado por alto risco
 * - rejected_high_risk: Operação rejeitada por alto risco geral
 * - cc_rejected_blacklist: Cartão está na blacklist
 * - cc_rejected_insufficient_data: Dados insuficientes do comprador
 */
export function isFraudRejectionError(error: any, statusDetail?: string): boolean {
  const detail = statusDetail || error?.statusDetail || (error as any).status_detail || "";
  const message = String(error?.message || error || "").toLowerCase();
  
  const fraudPatterns = [
    /cc_rejected_high_risk/i,
    /rejected_high_risk/i,
    /cc_rejected_blacklist/i,
    /cc_rejected_insufficient_data/i,
    /high.?risk/i,
    /fraude|fraud/i,
    /antifraude|anti.?fraud/i,
  ];
  
  return fraudPatterns.some(pattern => 
    pattern.test(detail) || pattern.test(message)
  );
}

/**
 * Retorna mensagem amigável sobre erro de fraude com orientações
 */
export function getFraudRejectionGuidance(statusDetail?: string): string {
  if (!statusDetail) {
    return "Sua operação foi rejeitada por análise de risco. Tente novamente com outro cartão ou meio de pagamento. Aguarde alguns minutos antes de tentar novamente.";
  }

  const detailLower = statusDetail.toLowerCase();
  
  if (detailLower.includes("high_risk")) {
    return "Seu cartão foi rejeitado por apresentar alto risco de fraude. Experimente um cartão diferente, aumente o valor da transação, ou aguarde alguns minutos antes de tentar novamente.";
  }
  
  if (detailLower.includes("blacklist")) {
    return "Seu cartão não pode ser usado. Por favor, use um cartão diferente.";
  }
  
  if (detailLower.includes("insufficient_data")) {
    return "Dados insuficientes do comprador. Verifique se seu nome, email e dados de identificação estão corretos.";
  }
  
  return "Sua operação foi rejeitada. Tente outro cartão ou meio de pagamento.";
}

export function translateMercadoPagoError(error: any): string {
  const message = String(error?.message || error || "").trim();
  const normalized = message.toLowerCase();
  const statusDetail = (error as any)?.statusDetail || (error as any)?.status_detail;

  // Verificar primeiro se é erro de fraude
  if (isFraudRejectionError(error, statusDetail)) {
    return getFraudRejectionGuidance(statusDetail);
  }

  if (normalized.includes("invalid access token") || normalized.includes("access token") && normalized.includes("invalid")) {
    return "As credenciais do Mercado Pago estão inválidas ou não pertencem ao mesmo ambiente/aplicativo. Verifique MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_PUBLIC_KEY no backend e confirme que ambos foram gerados na mesma conta/aplicação do Mercado Pago.";
  }

  if (normalized.includes("unauthorized access to resource")) {
    return "O Mercado Pago não autorizou esta operação. Verifique se as credenciais da aplicação Vendedor no ambiente de produção estão corretas e pertencem à mesma aplicação que criou o plano.";
  }

  if (normalized.includes("card token service not found")) {
    return "O Mercado Pago não reconheceu o cartão neste ambiente. Confira se as credenciais e o ambiente de teste estão corretos.";
  }

  if (normalized.includes("cannot pay an amount lower than") || normalized.includes("amount lower than r$ 0.50")) {
    return "O valor da assinatura precisa ser de pelo menos R$ 0,50.";
  }

  return message || "Não foi possível concluir a operação no Mercado Pago.";
}

export function getValidMercadoPagoBackUrl(): string | undefined {
  const candidates = [
    process.env.APP_BASE_URL || "",
    process.env.APP_BASE_URL_LOCAL || "",
  ].filter(Boolean);

  for (const raw of candidates) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "https:") {
        return parsed.toString();
      }

      if (parsed.hostname === "localhost" && process.env.NODE_ENV !== "production") {
        return parsed.toString();
      }
    } catch {
      // ignore invalid candidate and keep checking
    }
  }

  return "https://www.mercadopago.com.br";
}

export function getMercadoPagoWebhookUrl(): string {
  const baseUrl = getValidMercadoPagoBackUrl();
  if (!baseUrl) {
    return "https://www.mercadopago.com.br/api/webhooks/mercadopago";
  }

  return `${baseUrl.replace(/\/$/, "")}/api/webhooks/mercadopago`;
}

export function getMercadoPagoSubscriptionCallbackState(rawUrl?: string) {
  const url = new URL(rawUrl || (typeof window !== "undefined" ? window.location.href : "https://example.com"));
  const pathname = url.pathname.toLowerCase();
  const params = url.searchParams;

  const explicitStatus = [
    params.get("status"),
    params.get("collection_status"),
    params.get("payment_status"),
    params.get("subscription_status"),
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0);

  const inferredStatus = pathname.includes("/congrats/rejected")
    ? "rejected"
    : pathname.includes("/congrats/approved")
      ? "approved"
      : pathname.includes("/congrats/cancelled")
        ? "cancelled"
        : undefined;

  const status = (explicitStatus || inferredStatus || "unknown").toLowerCase();

  return {
    status,
    preapprovalId: params.get("preapproval_id") || params.get("preapprovalId") || undefined,
    planId: params.get("subscription_plan_id") || params.get("plan_id") || params.get("planId") || undefined,
    rawUrl: url.toString(),
  };
}

export function getMercadoPagoPaymentIdFromWebhookPayload(data: any, type?: string): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const maybeFromOrderPayment = Array.isArray(data?.transactions?.payments)
    ? data.transactions.payments.find((payment: any) => typeof payment?.id === "string" && payment.id.trim())
    : undefined;

  if (maybeFromOrderPayment) {
    return String(maybeFromOrderPayment.id);
  }

  if (typeof data?.id === "string" && data.id.trim()) {
    return String(data.id);
  }

  if (typeof data?.payment_id === "string" && data.payment_id.trim()) {
    return String(data.payment_id);
  }

  if (type === "payment" && typeof data?.id === "number") {
    return String(data.id);
  }

  return undefined;
}

export interface MercadoPagoAddressInput {
  streetName?: string;
  streetNumber?: string;
  zipCode?: string;
  neighborhood?: string;
  city?: string;
  federalUnit?: string;
  country?: string;
}

export interface TokenizeCardData {
  cardNumber: string;
  cardholderName: string;
  cardExpirationDate: string;
  securityCode: string;
  identificationType?: string;
  identificationNumber?: string;
}

export function buildAppointmentPaymentBody({
  amount,
  token,
  description,
  email,
  appointmentId,
  notificationUrl,
  payerName,
  payerPhone,
  payerIdentification,
  payerAddress,
}: {
  amount: number;
  token: string;
  description: string;
  email: string;
  appointmentId: number;
  notificationUrl?: string;
  payerName?: string;
  payerPhone?: string;
  payerIdentification?: string;
  payerAddress?: MercadoPagoAddressInput;
}) {
  const body: any = {
    transaction_amount: amount,
    token,
    description: `Agendamento #${appointmentId}: ${description}`,
    external_reference: `appointment:${appointmentId}`,
    notification_url: notificationUrl || getMercadoPagoWebhookUrl(),
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
      email,
    },
    metadata: {
      appointmentId,
    },
  };

  if (payerName || payerPhone || payerIdentification || payerAddress) {
    body.payer = { ...body.payer };

    if (payerName) {
      body.payer.name = payerName;
    }

    if (payerPhone) {
      body.payer.phone = {
        area_code: "55",
        number: payerPhone.replace(/\D+/g, ""),
      };
    }

    if (payerIdentification) {
      body.payer.identification = {
        type: "CPF",
        number: payerIdentification.replace(/\D+/g, ""),
      };
    }

    if (payerAddress) {
      const zipCode = (payerAddress.zipCode || "").replace(/\D+/g, "");
      body.payer.address = {
        street_name: payerAddress.streetName || "",
        street_number: payerAddress.streetNumber || "",
        zip_code: zipCode,
        neighborhood: payerAddress.neighborhood || "",
        city: payerAddress.city || "",
        federal_unit: payerAddress.federalUnit || "",
        country: (payerAddress.country || "BR").toUpperCase(),
      };
    }
  }

  return body;
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
  payerName,
  payerPhone,
  payerIdentification,
}: {
  token: string;
  planPrice: number;
  planName: string;
  email: string;
  startDate: Date;
  backUrl?: string;
  payerName?: string;
  payerPhone?: string;
  payerIdentification?: string;
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

  // Adicionar dados do pagador para reduzir sinais de risco de fraude
  // Conforme guia: "envie o máximo de dados do comprador"
  if (payerName || payerPhone || payerIdentification) {
    body.payer = {};
    if (payerName) {
      body.payer.name = payerName;
    }
    if (payerPhone) {
      body.payer.phone = {
        area_code: "55", // Brasil
        number: payerPhone.replace(/\D+/g, ""),
      };
    }
    if (payerIdentification) {
      // Assumir CPF para Brasil
      body.payer.identification = {
        type: "CPF",
        number: payerIdentification.replace(/\D+/g, ""),
      };
    }
  }

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
  appointmentId: number,
  notificationUrl?: string,
  payerInfo?: {
    name?: string;
    phone?: string;
    identification?: string;
    address?: MercadoPagoAddressInput;
  },
) {
  if (!payment) {
    throw new Error("Mercado Pago não está configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.");
  }

  const resolvedNotificationUrl = notificationUrl || getMercadoPagoWebhookUrl();

  try {
    const result = await payment.create({
      body: buildAppointmentPaymentBody({
        amount,
        token,
        description,
        email,
        appointmentId,
        notificationUrl: resolvedNotificationUrl,
        payerName: payerInfo?.name,
        payerPhone: payerInfo?.phone,
        payerIdentification: payerInfo?.identification,
        payerAddress: payerInfo?.address,
      }),
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
      isFraudRejection: isFraudRejectionError({ statusDetail: result.status_detail }),
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
 * @param payerName - Nome do titular do cartão (reduz risco de fraude)
 * @param payerPhone - Telefone do comprador (reduz risco de fraude)
 * @param payerIdentification - CPF do comprador (reduz risco de fraude)
 * @returns ID da assinatura (preapprovalId) e status
 */
export async function createPreapproval(
  token: string,
  planPrice: number,
  planName: string,
  email: string,
  startDate: Date,
  payerName?: string,
  payerPhone?: string,
  payerIdentification?: string
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
      payerName,
      payerPhone,
      payerIdentification,
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
    const statusDetail = error?.status_detail || (error as any).statusDetail;
    
    console.error("Erro ao criar assinatura:", {
      message: error?.message,
      status: error?.status,
      statusDetail,
      requestId,
      cause: error?.cause,
    });

    // Se for erro de fraude, retornar mensagem específica
    if (isFraudRejectionError(error, statusDetail)) {
      const enrichedMessage = requestId
        ? `${getFraudRejectionGuidance(statusDetail)} (request_id: ${requestId})`
        : getFraudRejectionGuidance(statusDetail);
      throw new Error(enrichedMessage);
    }

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
  idempotencyKey?: string,
  notificationUrl?: string,
) {
  if (!preApprovalPlan) {
    throw new Error("Mercado Pago não está configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.");
  }

  const body: any = {
    reason: `Plano de Assinatura: ${planName}`,
    status: "active",
    description: `Plano de assinatura: ${planName}`,
    items: [
      {
        id: `plan-${planName}`,
        title: `Plano de Assinatura: ${planName}`,
        description: `Acesso ao plano de assinatura ${planName} com cobrança recorrente mensal.`,
        category_id: "services",
        quantity: 1,
        unit_price: planPrice,
      },
    ],
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

  // Add notification_url for Mercado Pago to send webhook notifications
  if (notificationUrl) {
    body.notification_url = notificationUrl;
  }

  // Add external_reference to correlate with internal system
  if (idempotencyKey) {
    body.external_reference = idempotencyKey;
  }

  try {
    const result = await preApprovalPlan.create({
      body,
      requestOptions: idempotencyKey ? { idempotencyKey } : undefined,
    } as any);
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
    const statusDetail = (result as any).status_detail || (result as any).statusDetail;
    
    return {
      id: result.id,
      status: (result as any).status,
      statusDetail: statusDetail,
      isFraudRejection: isFraudRejectionError({ statusDetail }, statusDetail),
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
