/// <reference types="node" />
import test from "node:test";
import assert from "node:assert/strict";
import { buildPreapprovalBody, getMercadoPagoRequestOptions, isCardTokenServiceError, isPreapprovalPlanVisibilityError } from "./mercadopago";

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
