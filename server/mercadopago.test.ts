/// <reference types="node" />
import test from "node:test";
import assert from "node:assert/strict";
import { buildPreapprovalBody, getMercadoPagoRequestOptions, getMercadoPagoSubscriptionCallbackState, getValidMercadoPagoBackUrl, isCardTokenServiceError, isPreapprovalPlanVisibilityError, translateMercadoPagoError } from "./mercadopago.ts";

test("detecta erro de visibilidade do plano de assinatura do Mercado Pago", () => {
  const error = {
    status: 404,
    message: "The template with id 123 does not exist",
  };

  assert.equal(isPreapprovalPlanVisibilityError(error), true);
});

test("não marca outros erros como problema de visibilidade do plano", () => {
  const error = {
    status: 400,
    message: "Invalid card token",
  };

  assert.equal(isPreapprovalPlanVisibilityError(error), false);
});

test("detecta erro de visibilidade do plano mesmo quando vem encapsulado em cause", () => {
  const error = {
    cause: {
      status: 404,
      message: "The template with id abc does not exist",
    },
  };

  assert.equal(isPreapprovalPlanVisibilityError(error), true);
});

test("detecta erro de serviço de token do cartão", () => {
  const error = {
    status: 404,
    message: "Card token service not found",
  };

  assert.equal(isCardTokenServiceError(error), true);
});

test("usa request options de sandbox para tokens de teste", () => {
  assert.deepEqual(getMercadoPagoRequestOptions("TEST-abc"), { testToken: true });
  assert.deepEqual(getMercadoPagoRequestOptions("APP-USR-abc"), { testToken: false });
});

test("monta corpo de assinatura recorrente sem template associado para evitar 404 do Mercado Pago", () => {
  const startDate = new Date("2026-08-08T10:00:00.000Z");
  const body = buildPreapprovalBody({
    token: "card_token_123",
    planPrice: 170,
    planName: "Plano Premium",
    email: "cliente@teste.com",
    startDate,
    backUrl: "https://app.example.com/planos",
  });

  assert.equal(body.card_token_id, "card_token_123");
  assert.equal(body.payer_email, "cliente@teste.com");
  assert.equal(body.reason, "Plano de Assinatura: Plano Premium");
  assert.equal(body.preapproval_plan_id, undefined);
  assert.equal(body.auto_recurring.frequency, 1);
  assert.equal(body.auto_recurring.frequency_type, "months");
  assert.equal(body.auto_recurring.transaction_amount, 170);
  assert.equal(body.back_url, "https://app.example.com/planos");
});

test("prioriza APP_BASE_URL pública em desenvolvimento para o callback da recorrência", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousBaseUrl = process.env.APP_BASE_URL;
  const previousLocalBaseUrl = process.env.APP_BASE_URL_LOCAL;

  process.env.NODE_ENV = "development";
  process.env.APP_BASE_URL = "https://prod.example.com";
  process.env.APP_BASE_URL_LOCAL = "http://localhost:5000";

  const result = getValidMercadoPagoBackUrl();

  assert.equal(result, "https://prod.example.com/");

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;

  if (previousBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = previousBaseUrl;

  if (previousLocalBaseUrl === undefined) delete process.env.APP_BASE_URL_LOCAL;
  else process.env.APP_BASE_URL_LOCAL = previousLocalBaseUrl;
});

test("detecta retorno rejeitado do Mercado Pago na assinatura recorrente", () => {
  const url = "https://www.mercadopago.com.br/checkout/v1/subscription/redirect/example/congrats/rejected/?preference-id=123&router-request-id=abc";

  const result = getMercadoPagoSubscriptionCallbackState(url);

  assert.equal(result.status, "rejected");
  assert.equal(result.preapprovalId, undefined);
  assert.equal(result.planId, undefined);
});

test("traduz erro de token inválido do Mercado Pago com mensagem clara", () => {
  const translated = translateMercadoPagoError({ message: "invalid access token" });

  assert.match(translated, /credenciais do Mercado Pago/i);
  assert.match(translated, /MERCADOPAGO_ACCESS_TOKEN/i);
});
