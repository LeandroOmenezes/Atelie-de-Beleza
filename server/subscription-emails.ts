import nodemailer from "nodemailer";

type SubscriptionApprovedEmailInput = {
  to: string;
  customerName?: string | null;
  planName: string;
  planPrice: number;
  nextBillingDate?: Date | null;
};

type SubscriptionCancelledEmailInput = {
  to: string;
  customerName?: string | null;
  planName: string;
};

function getMailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || Number.isNaN(port)) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "";
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

export async function sendSubscriptionApprovedEmail(input: SubscriptionApprovedEmailInput) {
  const transporter = getMailTransport();
  const from = getFromAddress();

  if (!transporter || !from || !input.to) {
    console.warn("[Email] Envio de email desativado: configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM");
    return;
  }

  const customerName = input.customerName || "cliente";

  await transporter.sendMail({
    from,
    to: input.to,
    subject: "Assinatura confirmada com sucesso",
    text: [
      `Oi, ${customerName}!`,
      "",
      "Sua assinatura foi confirmada com sucesso.",
      `Plano: ${input.planName}`,
      `Valor mensal: ${formatCurrency(input.planPrice)}`,
      `Proxima cobranca: ${formatDate(input.nextBillingDate)}`,
      "",
      "Voce pode acompanhar sua assinatura no seu perfil.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">Assinatura confirmada</h2>
        <p>Oi, <strong>${customerName}</strong>!</p>
        <p>Sua assinatura foi confirmada com sucesso.</p>
        <ul>
          <li><strong>Plano:</strong> ${input.planName}</li>
          <li><strong>Valor mensal:</strong> ${formatCurrency(input.planPrice)}</li>
          <li><strong>Proxima cobranca:</strong> ${formatDate(input.nextBillingDate)}</li>
        </ul>
        <p>Voce pode acompanhar sua assinatura no seu perfil.</p>
      </div>
    `,
  });
}

export async function sendSubscriptionCancelledEmail(input: SubscriptionCancelledEmailInput) {
  const transporter = getMailTransport();
  const from = getFromAddress();

  if (!transporter || !from || !input.to) {
    console.warn("[Email] Envio de email desativado: configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM");
    return;
  }

  const customerName = input.customerName || "cliente";

  await transporter.sendMail({
    from,
    to: input.to,
    subject: "Sua assinatura foi cancelada",
    text: [
      `Oi, ${customerName}!`,
      "",
      "Confirmamos o cancelamento da sua assinatura.",
      `Plano: ${input.planName}`,
      "",
      "Se quiser reativar no futuro, e so acessar a area de planos.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">Assinatura cancelada</h2>
        <p>Oi, <strong>${customerName}</strong>!</p>
        <p>Confirmamos o cancelamento da sua assinatura.</p>
        <ul>
          <li><strong>Plano:</strong> ${input.planName}</li>
        </ul>
        <p>Se quiser reativar no futuro, e so acessar a area de planos.</p>
      </div>
    `,
  });
}
