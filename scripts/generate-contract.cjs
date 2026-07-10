// Gera Contrato_Propriedade_Sistema_Atelie_de_Beleza.docx — valor R$ 5.000
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  ShadingType, Table, TableRow, TableCell, WidthType, BorderStyle,
  ImageRun, convertInchesToTwip, TableLayoutType, PageBreak,
} = require('docx');
const fs   = require('fs');
const path = require('path');

const OUT  = path.join(__dirname, '..', 'generated');
const PURPLE  = '7c3aed';
const PURPLE2 = 'ede9fe';
const DGRAY   = '374151';
const WHITE   = 'FFFFFF';
const BLACK   = '111827';

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function h1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 32, color: WHITE, font: 'Calibri' })],
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.SOLID, fill: PURPLE },
    spacing: { before: 200, after: 200 },
  });
}

function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: PURPLE, font: 'Calibri' })],
    spacing: { before: 300, after: 100 },
  });
}

function clauseTitle(num, text) {
  return new Paragraph({
    children: [
      new TextRun({ text: `CLÁUSULA ${num}ª — `, bold: true, size: 22, color: PURPLE, font: 'Calibri' }),
      new TextRun({ text, bold: true, size: 22, color: BLACK, font: 'Calibri' }),
    ],
    spacing: { before: 280, after: 80 },
  });
}

function body(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: DGRAY, font: 'Calibri' })],
    spacing: { before: 40, after: 60 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text: `\u2022  ${text}`, size: 20, color: DGRAY, font: 'Calibri' })],
    indent: { left: convertInchesToTwip(0.3) },
    spacing: { before: 30, after: 30 },
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun('')], spacing: { before: 80, after: 80 } });
}

function sigBlock(label, name, role, city) {
  return [
    spacer(),
    new Paragraph({
      children: [new TextRun({ text: '_______________________________________________', size: 20, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${name}`, bold: true, size: 20, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: role, size: 18, italics: true, font: 'Calibri', color: DGRAY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
    }),
  ];
}

function infoRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: 'Calibri', color: PURPLE })] })],
        shading: { type: ShadingType.SOLID, fill: PURPLE2 },
        width: { size: 30, type: WidthType.PERCENTAGE },
        margins: { top: 60, bottom: 60, left: 120, right: 80 },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: 'Calibri', color: DGRAY })] })],
        width: { size: 70, type: WidthType.PERCENTAGE },
        margins: { top: 60, bottom: 60, left: 120, right: 80 },
      }),
    ],
  });
}

async function buildContract() {
  const today = new Date();
  const day   = today.getDate();
  const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const month = monthNames[today.getMonth()];
  const year  = today.getFullYear();
  const dateStr = `${day} de ${month} de ${year}`;

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      properties: {},
      children: [

        // ── CAPA ──────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'Ateliê de Beleza', bold: true, size: 64, color: PURPLE, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 1400, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Sistema de Gerenciamento', size: 30, color: DGRAY, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'CONTRATO DE COMPRA E VENDA DE SISTEMA', bold: true, size: 28, color: WHITE, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          shading: { type: ShadingType.SOLID, fill: PURPLE },
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'DE SOFTWARE SOB MEDIDA', bold: true, size: 28, color: WHITE, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          shading: { type: ShadingType.SOLID, fill: PURPLE },
          spacing: { before: 0, after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Celebrado em ${dateStr}`, size: 22, italics: true, color: DGRAY, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 600 },
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            infoRow('VENDEDOR', 'Leandro Oliveira Menezes'),
            infoRow('CPF / E-mail', '(a informar) / lleandro.m32@gmail.com'),
            infoRow('COMPRADOR', '(Nome completo do comprador)'),
            infoRow('CPF / E-mail', '(CPF do comprador) / (e-mail do comprador)'),
            infoRow('Sistema',  'Ateliê de Beleza — Sistema de Gerenciamento para Salão'),
            infoRow('Valor Total', 'R$ 5.000,00 (cinco mil reais)'),
            infoRow('Data',     dateStr),
          ],
        }),

        pageBreak(),

        // ── PREÂMBULO ─────────────────────────────────────────────────────
        h1('CONTRATO DE COMPRA E VENDA DE SOFTWARE'),
        spacer(),
        body(`Pelo presente instrumento particular, celebrado em ${dateStr}, as partes a seguir qualificadas acordam as condições abaixo:`),
        spacer(),

        h2('IDENTIFICAÇÃO DAS PARTES'),
        body('VENDEDOR: Leandro Oliveira Menezes, doravante denominado simplesmente "VENDEDOR", titular dos direitos de propriedade intelectual do sistema objeto deste contrato.'),
        spacer(),
        body('COMPRADOR: [Nome completo do comprador], doravante denominado simplesmente "COMPRADOR", interessado na aquisição do sistema descrito neste instrumento.'),
        spacer(),

        // ── CLÁUSULAS ─────────────────────────────────────────────────────
        clauseTitle('1', 'OBJETO DO CONTRATO'),
        body('O presente contrato tem por objeto a compra e venda definitiva do sistema web denominado "Ateliê de Beleza — Sistema de Gerenciamento", desenvolvido sob medida para gestão de salões de beleza, compreendendo:'),
        bullet('Código-fonte completo do sistema (frontend e backend)'),
        bullet('Scripts de banco de dados e migrações (PostgreSQL / Drizzle ORM)'),
        bullet('Documentação técnica e manual do usuário'),
        bullet('Arquivos de configuração e variáveis de ambiente'),
        bullet('Direitos de uso, modificação e distribuição do sistema'),

        clauseTitle('2', 'ESPECIFICAÇÕES TÉCNICAS DO SISTEMA'),
        body('O sistema transferido compreende as seguintes funcionalidades e tecnologias:'),
        bullet('Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query v5'),
        bullet('Backend: Node.js, Express.js, TypeScript, Drizzle ORM, Passport.js'),
        bullet('Banco de dados: PostgreSQL (compatível com Neon serverless)'),
        bullet('Autenticação: E-mail/senha (hash scrypt), Google OAuth 2.0 (Firebase), WhatsApp'),
        bullet('Módulos: Agendamentos online, Profissionais, Bloqueios de Agenda, Gestão de Vendas'),
        bullet('Módulos: Clientes, Usuários, Avaliações, Configurações, Banner, Rodapé'),
        bullet('Integrações: SendGrid (e-mails), Firebase (Google auth), WhatsApp, PIX QR Code'),
        bullet('Design responsivo para desktop, tablet e mobile'),

        clauseTitle('3', 'VALOR E FORMA DE PAGAMENTO'),
        body('O COMPRADOR pagará ao VENDEDOR o valor total de R$ 5.000,00 (cinco mil reais) pela aquisição definitiva do sistema, conforme condições acordadas entre as partes.'),
        spacer(),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Item', bold: true, size: 20, font: 'Calibri', color: WHITE })] })],
                  shading: { type: ShadingType.SOLID, fill: PURPLE },
                  margins: { top: 80, bottom: 80, left: 120, right: 80 },
                  width: { size: 60, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Valor', bold: true, size: 20, font: 'Calibri', color: WHITE })] })],
                  shading: { type: ShadingType.SOLID, fill: PURPLE },
                  margins: { top: 80, bottom: 80, left: 120, right: 80 },
                  width: { size: 40, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Sistema Ateliê de Beleza (código-fonte completo)', size: 20, font: 'Calibri' })] })],
                  margins: { top: 60, bottom: 60, left: 120, right: 80 },
                  shading: { type: ShadingType.SOLID, fill: PURPLE2 },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'R$ 4.000,00', size: 20, font: 'Calibri' })] })],
                  margins: { top: 60, bottom: 60, left: 120, right: 80 },
                  shading: { type: ShadingType.SOLID, fill: PURPLE2 },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Documentação técnica e manual do usuário', size: 20, font: 'Calibri' })] })],
                  margins: { top: 60, bottom: 60, left: 120, right: 80 },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'R$ 500,00', size: 20, font: 'Calibri' })] })],
                  margins: { top: 60, bottom: 60, left: 120, right: 80 },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Suporte técnico pós-entrega (30 dias)', size: 20, font: 'Calibri' })] })],
                  margins: { top: 60, bottom: 60, left: 120, right: 80 },
                  shading: { type: ShadingType.SOLID, fill: PURPLE2 },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'R$ 500,00', size: 20, font: 'Calibri' })] })],
                  margins: { top: 60, bottom: 60, left: 120, right: 80 },
                  shading: { type: ShadingType.SOLID, fill: PURPLE2 },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL', bold: true, size: 22, font: 'Calibri', color: WHITE })] })],
                  shading: { type: ShadingType.SOLID, fill: PURPLE },
                  margins: { top: 80, bottom: 80, left: 120, right: 80 },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'R$ 5.000,00', bold: true, size: 22, font: 'Calibri', color: WHITE })] })],
                  shading: { type: ShadingType.SOLID, fill: PURPLE },
                  margins: { top: 80, bottom: 80, left: 120, right: 80 },
                }),
              ],
            }),
          ],
        }),

        clauseTitle('4', 'ENTREGA E TRANSFERÊNCIA'),
        body('A entrega do sistema será realizada por meio digital (repositório Git, arquivo comprimido ou acesso direto ao código-fonte), conforme acordado entre as partes. A transferência de titularidade ocorre integralmente após a confirmação do pagamento total.'),
        bullet('Entrega do código-fonte completo (frontend, backend e banco de dados)'),
        bullet('Entrega da documentação técnica e manual do usuário'),
        bullet('Transferência das credenciais e configurações do sistema'),
        bullet('Treinamento básico de operação ao COMPRADOR (até 2 horas por videoconferência)'),

        clauseTitle('5', 'DIREITOS DE PROPRIEDADE INTELECTUAL'),
        body('Após o pagamento integral do valor estipulado na Cláusula 3ª, o COMPRADOR torna-se o único e exclusivo proprietário do sistema, incluindo:'),
        bullet('Código-fonte completo do frontend e do backend'),
        bullet('Estrutura do banco de dados e todas as migrações'),
        bullet('Documentação técnica e manual do usuário'),
        bullet('Direito de uso, modificação, redistribuição e comercialização do sistema'),
        bullet('Direito de registrar o software em seu nome perante o INPI ou órgão competente'),
        spacer(),
        body('O VENDEDOR, após a transferência, não retém quaisquer direitos sobre o sistema, salvo autorização expressa do COMPRADOR.'),

        clauseTitle('6', 'SUPORTE TÉCNICO PÓS-ENTREGA'),
        body('O VENDEDOR prestará suporte técnico ao COMPRADOR pelo período de 30 (trinta) dias corridos após a entrega, incluindo:'),
        bullet('Correção de bugs e erros existentes no sistema entregue'),
        bullet('Esclarecimento de dúvidas sobre o funcionamento e configuração'),
        bullet('Auxílio na configuração do ambiente de produção (hosting, banco de dados)'),
        spacer(),
        body('Após o período de 30 dias, eventuais suportes adicionais serão objeto de novo contrato e precificação separada.'),

        clauseTitle('7', 'CONFIDENCIALIDADE'),
        body('Ambas as partes se comprometem a manter sigilo sobre informações confidenciais trocadas durante a vigência deste contrato, não podendo divulgá-las a terceiros sem autorização prévia e expressa da outra parte.'),

        clauseTitle('8', 'DECLARAÇÕES E GARANTIAS DO VENDEDOR'),
        body('O VENDEDOR declara e garante que:'),
        bullet('É o legítimo criador e proprietário do sistema objeto deste contrato'),
        bullet('O sistema não infringe direitos de terceiros (patentes, marcas, direitos autorais)'),
        bullet('Tem plena capacidade legal para celebrar este contrato e efetuar a transferência'),
        bullet('O sistema entregue estará livre de ônus, vínculos ou restrições que impeçam sua utilização'),

        clauseTitle('9', 'RESCISÃO'),
        body('O presente contrato poderá ser rescindido:'),
        bullet('Por mútuo acordo entre as partes, formalizado por escrito'),
        bullet('Por descumprimento de qualquer cláusula, mediante notificação prévia de 15 (quinze) dias'),
        bullet('Em caso de rescisão por culpa do VENDEDOR, os valores pagos serão devolvidos integralmente'),
        bullet('Em caso de rescisão por culpa do COMPRADOR após a entrega, o valor pago não será restituído'),

        clauseTitle('10', 'DISPOSIÇÕES GERAIS'),
        body('10.1. O presente contrato é celebrado em caráter irrevogável e irretratável, obrigando as partes, seus herdeiros e sucessores.'),
        body('10.2. As partes elegem o foro da comarca de [cidade a definir] para dirimir quaisquer dúvidas ou litígios decorrentes deste instrumento.'),
        body('10.3. Este contrato, assinado pelas partes e por duas testemunhas, tem força de título executivo extrajudicial nos termos da legislação vigente.'),
        body('10.4. Qualquer alteração neste instrumento deverá ser formalizada por escrito e assinada por ambas as partes.'),

        spacer(),
        new Paragraph({
          children: [new TextRun({ text: `[Cidade], ${dateStr}`, size: 20, font: 'Calibri', color: DGRAY })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 100 },
        }),

        // Assinaturas
        pageBreak(),
        h1('ASSINATURAS'),
        spacer(),

        ...sigBlock('VENDEDOR', 'Leandro Oliveira Menezes', 'Vendedor · CPF: _________________', ''),
        spacer(),
        ...sigBlock('COMPRADOR', '_____________________________', 'Comprador · CPF: ________________', ''),
        spacer(),

        new Paragraph({
          children: [new TextRun({ text: 'TESTEMUNHAS', bold: true, size: 22, color: PURPLE, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 40 },
        }),

        ...sigBlock('T1', '1. ___________________________________', 'CPF: ____________________________', ''),
        ...sigBlock('T2', '2. ___________________________________', 'CPF: ____________________________', ''),

        spacer(),
        new Paragraph({
          children: [new TextRun({ text: `Documento gerado em ${dateStr} · Ateliê de Beleza · Valor: R$ 5.000,00`, size: 16, italics: true, color: '9ca3af', font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        }),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const outFile = path.join(OUT, 'Contrato_Propriedade_Sistema_Atelie_de_Beleza.docx');
  fs.writeFileSync(outFile, buf);
  console.log('✅ DOCX Contrato:', outFile);
}

buildContract().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
