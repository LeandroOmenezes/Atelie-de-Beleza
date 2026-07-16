import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

type SaleReceiptEmailInput = {
  to: string;
  saleId: number;
  customerName: string;
  serviceName: string;
  saleDate: string | Date;
  amount: number;
  paymentMethod: string;
  notes?: string | null;
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
    auth: { user, pass },
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

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function paymentMethodLabel(method: string) {
  switch (method) {
    case "cash":
      return "Dinheiro";
    case "credit":
      return "Cartao de Credito";
    case "debit":
      return "Cartao de Debito";
    case "pix":
      return "PIX";
    case "appointment":
      return "Agendamento";
    default:
      return method;
  }
}

function generateReceiptPdfBuffer(input: SaleReceiptEmailInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const businessName = process.env.BUSINESS_NAME || "Atelie de Beleza";
    const businessCnpj = process.env.BUSINESS_CNPJ || "CNPJ nao informado";
    const businessPhone = process.env.BUSINESS_PHONE || "Telefone nao informado";
    const businessAddress = process.env.BUSINESS_ADDRESS || "Endereco nao informado";

    doc.fontSize(18).text("Comprovante de Servico", { align: "center" });
    doc.moveDown(1);

    doc.fontSize(12).text(`Atelie: ${businessName}`);
    doc.text(`CNPJ: ${businessCnpj}`);
    doc.text(`Telefone: ${businessPhone}`);
    doc.text(`Endereco: ${businessAddress}`);

    doc.moveDown(1);
    doc.text(`Comprovante: #${input.saleId}`);
    doc.text(`Data de emissao: ${new Date().toLocaleDateString("pt-BR")}`);
    doc.text(`Cliente: ${input.customerName}`);
    doc.text(`Servico: ${input.serviceName}`);
    doc.text(`Data do atendimento: ${formatDate(input.saleDate)}`);
    doc.text(`Forma de pagamento: ${paymentMethodLabel(input.paymentMethod)}`);
    doc.text(`Valor: ${formatCurrency(input.amount)}`);

    if (input.notes) {
      doc.moveDown(0.5);
      doc.text(`Observacoes: ${input.notes}`);
    }

    doc.moveDown(1);
    doc.fontSize(10).fillColor("#555555").text("Este comprovante nao substitui nota fiscal oficial.", {
      align: "left",
    });

    doc.end();
  });
}

export async function sendSaleReceiptEmail(input: SaleReceiptEmailInput) {
  const transporter = getMailTransport();
  const from = getFromAddress();

  if (!transporter || !from || !input.to) {
    console.warn("[Email] Envio de comprovante desativado: configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM");
    return;
  }

  const pdfBuffer = await generateReceiptPdfBuffer(input);

  await transporter.sendMail({
    from,
    to: input.to,
    subject: `Comprovante de servico #${input.saleId}`,
    text: [
      `Oi, ${input.customerName}!`,
      "",
      "Segue em anexo o comprovante do servico realizado.",
      `Servico: ${input.serviceName}`,
      `Data: ${formatDate(input.saleDate)}`,
      `Valor: ${formatCurrency(input.amount)}`,
    ].join("\n"),
    attachments: [
      {
        filename: `comprovante-servico-${input.saleId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
