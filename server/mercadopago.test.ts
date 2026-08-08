import test from "node:test";
import assert from "node:assert/strict";
import { getMercadoPagoRequestOptions, isCardTokenServiceError, isPreapprovalPlanVisibilityError } from "./mercadopago";

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
