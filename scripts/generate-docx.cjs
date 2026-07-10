// Gera Documentacao_Sistema_Atelie_de_Beleza.docx com screenshots reais
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, PageBreak, Spacing, Header, Footer, PageNumber,
  NumberFormat, convertInchesToTwip, TableLayoutType,
} = require('docx');
const fs   = require('fs');
const path = require('path');

const SCREENS = path.join(__dirname, '..', 'generated', 'screens');
const OUT     = path.join(__dirname, '..', 'generated');

// ─── COLOUR PALETTE ──────────────────────────────────────────────────────────
const PURPLE  = '7c3aed';
const PURPLE2 = 'ede9fe';
const WHITE   = 'FFFFFF';
const GRAY    = 'f3f4f6';
const DGRAY   = '374151';
const BLACK   = '1e1b4b';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function heading1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: WHITE, size: 36, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.SOLID, fill: PURPLE },
    spacing: { before: 0, after: 200 },
  });
}

function heading2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: WHITE, size: 24, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_2,
    shading: { type: ShadingType.SOLID, fill: PURPLE },
    spacing: { before: 300, after: 100 },
  });
}

function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: PURPLE, size: 22, font: 'Calibri' })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
  });
}

function body(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: DGRAY, font: 'Calibri' })],
    spacing: { before: 40, after: 40 },
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text: `\u2022  ${text}`, size: 20, color: DGRAY, font: 'Calibri' })],
    indent: { left: convertInchesToTwip(0.3) },
    spacing: { before: 30, after: 30 },
  });
}

function caption(text) {
  return new Paragraph({
    children: [new TextRun({ text: `\uD83D\uDCF8  ${text}`, size: 16, color: PURPLE, italics: true, font: 'Calibri' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 120 },
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun('')], spacing: { before: 60, after: 60 } });
}

function insertImage(file, altText, widthPx) {
  widthPx = widthPx || 600;
  const fullPath = path.join(SCREENS, file);
  if (!fs.existsSync(fullPath)) {
    return body(`[Imagem não encontrada: ${file}]`);
  }
  const imgBuf = fs.readFileSync(fullPath);
  const ext = path.extname(file).replace('.', '').toLowerCase();
  const type = ext === 'png' ? 'png' : 'jpg';
  // Keep aspect approx 16:9 → height = widthPx * 0.56
  const w = widthPx;
  const h = Math.round(w * 0.5625);
  return new Paragraph({
    children: [
      new ImageRun({ data: imgBuf, transformation: { width: w, height: h }, type }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 40 },
  });
}

// Two-col info table
function infoTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: PURPLE, font: 'Calibri' })] })],
          shading: { type: ShadingType.SOLID, fill: PURPLE2 },
          width: { size: 30, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 120, right: 80 },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, color: DGRAY, font: 'Calibri' })] })],
          width: { size: 70, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 120, right: 80 },
        }),
      ],
    })),
  });
}

// ─── BUILD DOC ───────────────────────────────────────────────────────────────
async function buildDocumentation() {
  const sections = [];

  // ── CAPA ──────────────────────────────────────────────────────────────────
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: '', size: 2, break: 8 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Ateliê de Beleza', bold: true, size: 72, color: PURPLE, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Sistema de Gerenciamento', size: 36, color: DGRAY, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'DOCUMENTAÇÃO COMPLETA', bold: true, size: 30, color: WHITE, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, fill: PURPLE },
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Manual do Usuário e Guia Técnico — Versão 1.0', size: 22, color: DGRAY, italics: true, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 600 },
    }),
    infoTable([
      ['Proprietário',    'Leandro Oliveira Menezes'],
      ['E-mail',         'lleandro.m32@gmail.com'],
      ['Telefone',       '(11) 96402-7914'],
      ['Sistema',        'Ateliê de Beleza — Sistema de Gerenciamento'],
      ['Versão',         '1.0'],
      ['Data',           'Maio de 2026'],
      ['Stack',          'React · Node.js · TypeScript · PostgreSQL · Neon DB'],
    ]),
    spacer(),
    pageBreak(),
  );

  // ── 1. VISÃO GERAL ────────────────────────────────────────────────────────
  sections.push(
    heading1('1. Visão Geral do Sistema'),
    spacer(),
    body('O Ateliê de Beleza é um sistema web completo de gerenciamento para salões de beleza. Desenvolvido com tecnologias modernas, oferece uma interface pública para clientes e um robusto painel administrativo para gestão do negócio em tempo real.'),
    body('O sistema digitaliza toda a operação do salão, eliminando cadernos físicos e controles manuais:'),
    bullet('Agendamento online 24h com seleção de profissional e horário disponível'),
    bullet('Painel administrativo completo com sidebar de navegação'),
    bullet('Controle financeiro com registro de vendas e suporte a PIX com QR Code'),
    bullet('Gestão de equipe, serviços, clientes e avaliações'),
    bullet('Notificações automáticas via WhatsApp após confirmação de agendamento'),
    bullet('Design responsivo para celular, tablet e computador'),
    spacer(),
    heading2('Tela Inicial — Landing Page'),
    insertImage('real_00_home.jpg', 'Página inicial do Ateliê de Beleza — banner principal com identidade visual'),
    caption('Figura 1 — Landing page: banner, navbar e botões de ação principais'),
    pageBreak(),
  );

  // ── 2. TECNOLOGIAS ────────────────────────────────────────────────────────
  sections.push(
    heading1('2. Tecnologias Utilizadas'),
    spacer(),
    heading3('Frontend'),
    bullet('React 18 — interface de usuário reativa e componentes modernos'),
    bullet('TypeScript — tipagem estática para maior confiabilidade'),
    bullet('Vite — bundler ultrarrápido para desenvolvimento e produção'),
    bullet('Tailwind CSS — estilização responsiva com classes utilitárias'),
    bullet('shadcn/ui — componentes acessíveis e prontos para produção'),
    bullet('TanStack Query v5 — gerenciamento de estado assíncrono e cache'),
    bullet('Wouter — roteamento leve no lado do cliente'),
    bullet('React Hook Form + Zod — formulários com validação robusta'),
    heading3('Backend'),
    bullet('Node.js + Express.js — servidor HTTP eficiente e escalável'),
    bullet('TypeScript — código tipado e seguro no servidor'),
    bullet('Drizzle ORM — mapeamento objeto-relacional leve e tipado'),
    bullet('Passport.js — autenticação com sessões seguras'),
    bullet('Zod — validação de dados nas entradas de todas as rotas'),
    bullet('Multer — processamento de upload de imagens e arquivos'),
    heading3('Banco de Dados e Serviços Externos'),
    bullet('PostgreSQL via Neon — banco relacional em nuvem com backups automáticos'),
    bullet('Firebase — autenticação Google (OAuth 2.0)'),
    bullet('SendGrid — envio de e-mails transacionais automáticos'),
    bullet('WhatsApp API — notificações automáticas para clientes'),
    bullet('PIX QR Code — geração dinâmica de QR Code para pagamentos'),
    pageBreak(),
  );

  // ── 3. LANDING PAGE ───────────────────────────────────────────────────────
  sections.push(
    heading1('3. Página Pública — Landing Page'),
    spacer(),
    body('A landing page é a vitrine digital do salão — a primeira experiência do cliente. Todas as seções são configuráveis pelo administrador sem necessidade de conhecimento técnico, acessível em qualquer dispositivo.'),
    spacer(),
    heading2('Banner Principal — Seção Hero'),
    insertImage('real_00_home.jpg', 'Banner principal da landing page'),
    caption('Figura 2 — Hero section com imagem de destaque, slogan e botões de ação'),
    body('Imagem de destaque em tela cheia com sobreposição para legibilidade. Exibe o nome do salão, slogan e dois botões principais: "Agendar Horário" e "Nossos Serviços". A imagem é trocada pelo administrador nas Configurações sem tocar em código.'),
    spacer(),
    heading3('Outras Seções da Landing Page'),
    bullet('Serviços: cards com todos os serviços cadastrados organizados por categoria'),
    bullet('Preços: tabela de preços clara por categoria'),
    bullet('Agendamentos: formulário de agendamento online integrado'),
    bullet('Avaliações: depoimentos reais com estrelas, comentários e reações'),
    bullet('Rodapé: endereço, telefone, redes sociais e horário de funcionamento'),
    pageBreak(),
  );

  // ── 4. PAINEL ADMINISTRATIVO ─────────────────────────────────────────────
  sections.push(
    heading1('4. Painel Administrativo'),
    spacer(),
    body('O painel administrativo é acessado em /dashboard após login como administrador. Contém todos os módulos de gestão do salão organizados em uma sidebar de navegação.'),
    spacer(),
    heading2('Aba: Agendamentos'),
    insertImage('real_01_agendamentos.jpg', 'Painel — Aba Agendamentos'),
    caption('Figura 3 — Aba Agendamentos: listagem, filtro por status e ações de gerenciamento'),
    body('Visualize e gerencie todos os agendamentos dos clientes. Filtre por status (Pendente, Confirmado, Concluído, Cancelado). Ao confirmar ou cancelar, a mensagem para o cliente é copiada automaticamente para colar no WhatsApp Web.'),
    pageBreak(),

    heading2('Aba: Profissionais'),
    insertImage('real_02_profissionais.jpg', 'Painel — Aba Profissionais'),
    caption('Figura 4 — Aba Profissionais: cadastro de equipe com foto, nome e especialidades por categoria'),
    body('Gerencie a equipe do salão. Cadastre profissionais com foto (upload direto), nome e especialidades. Ative ou desative profissionais — apenas os ativos aparecem no formulário de agendamento do cliente. As categorias (Sombrancelha, Cabelo, Manicure, Maquiagem) organizam o cadastro.'),
    pageBreak(),

    heading2('Aba: Bloqueios de Agenda'),
    insertImage('real_03_bloqueios.jpg', 'Painel — Aba Bloqueios de Agenda'),
    caption('Figura 5 — Bloqueios de agenda: por profissional específico ou para toda a equipe'),
    body('Bloqueie períodos da agenda para férias, feriados, atestados médicos ou qualquer indisponibilidade. Bloqueio geral afeta toda a equipe. Bloqueio individual afeta apenas um profissional — os demais continuam disponíveis. As datas bloqueadas aparecem destacadas no formulário de agendamento com o motivo exibido ao cliente.'),
    pageBreak(),

    heading2('Aba: Gestão de Vendas'),
    insertImage('real_04_vendas.jpg', 'Painel — Aba Gestão de Vendas'),
    caption('Figura 6 — Gestão de Vendas: registro de transações, histórico e totais por período'),
    body('Registre vendas ao finalizar atendimentos. Informe: nome do cliente, serviço, valor cobrado, método de pagamento (Dinheiro, Débito, Crédito, PIX ou Outro) e data. Ao selecionar PIX, um QR Code é exibido em tela cheia com a chave cadastrada. O histórico mostra totais, quantidade de vendas e média por venda.'),
    pageBreak(),

    heading2('Aba: Clientes'),
    insertImage('real_05_clientes.jpg', 'Painel — Aba Clientes'),
    caption('Figura 7 — Aba Clientes: busca em tempo real, edição e remoção com confirmação'),
    body('Liste, busque, edite e remova clientes cadastrados. A busca é em tempo real por nome ou telefone. Remoção solicita confirmação via diálogo seguro (sem janelas nativas do navegador). Novos clientes podem ser cadastrados manualmente pelo botão "+ Novo Cliente".'),
    pageBreak(),

    heading2('Aba: Usuários do Sistema'),
    insertImage('real_06_usuarios.jpg', 'Painel — Aba Usuários do Sistema'),
    caption('Figura 8 — Usuários do sistema: lista com tipo (Admin/Cliente), contato e data de cadastro'),
    body('Gerencie os usuários com acesso ao sistema. Distingue Administradores (acesso completo ao painel) de Clientes (acesso à área do cliente). O administrador logado não pode excluir a própria conta. Datas exibidas no formato brasileiro (dd/mm/aaaa).'),
    pageBreak(),
  );

  // ── 5. SISTEMA DE AGENDAMENTOS ────────────────────────────────────────────
  sections.push(
    heading1('5. Sistema de Agendamentos'),
    spacer(),
    body('O módulo de agendamentos permite que clientes realizem agendamentos online 24 horas por dia, 7 dias por semana, diretamente pelo site — sem necessidade de ligação ou mensagem.'),
    spacer(),
    heading3('Fluxo de Agendamento do Cliente'),
    bullet('1. Acessa a landing page e clica em "Agendar Horário"'),
    bullet('2. Seleciona o serviço desejado no menu suspenso'),
    bullet('3. Escolhe o profissional preferido ou "Qualquer profissional"'),
    bullet('4. Seleciona a data — dias bloqueados mostram o motivo e ficam desabilitados'),
    bullet('5. Seleciona o horário disponível para a data escolhida'),
    bullet('6. Preenche nome, telefone e observações opcionais'),
    bullet('7. Confirma — notificação enviada via WhatsApp automaticamente'),
    spacer(),
    heading3('Lógica de Disponibilidade'),
    body('O sistema verifica em tempo real antes de exibir horários disponíveis:'),
    bullet('Horários já ocupados por outros agendamentos confirmados'),
    bullet('Bloqueios gerais — afetam toda a equipe (feriados, férias coletivas)'),
    bullet('Bloqueios individuais — afetam somente o profissional selecionado'),
    body('Se o bloqueio for individual, outros profissionais continuam disponíveis para o mesmo dia.'),
    pageBreak(),
  );

  // ── 6. CONFIGURAÇÕES ─────────────────────────────────────────────────────
  sections.push(
    heading1('6. Configurações do Sistema'),
    spacer(),
    heading3('Configurações Gerais'),
    bullet('Nome do salão/site exibido no navegador e nos e-mails automáticos'),
    bullet('Slogan exibido no rodapé e na landing page'),
    bullet('Logo do salão com upload e prévia imediata'),
    bullet('Chave PIX para geração automática do QR Code no módulo de vendas'),
    bullet('Número do WhatsApp para notificações automáticas de agendamento'),
    spacer(),
    heading3('Banner / Imagem de Destaque'),
    bullet('Upload de nova imagem para a seção hero da landing page'),
    bullet('Suporte a JPG, PNG e WebP sem limite rígido de tamanho'),
    bullet('Cache-busting automático — nova imagem aparece imediatamente'),
    bullet('Prévia da imagem atual exibida antes de substituir'),
    spacer(),
    heading3('Rodapé da Landing Page'),
    bullet('Nome do negócio, endereço completo (rua, número, cidade, estado, CEP)'),
    bullet('Telefone de contato e e-mail do salão'),
    bullet('Links de redes sociais: Instagram, Facebook e WhatsApp'),
    bullet('Horário de funcionamento personalizado'),
    spacer(),
    heading3('Serviços, Categorias e Preços'),
    bullet('Cadastro e edição de serviços com nome, descrição, duração e categoria'),
    bullet('Controle de visibilidade (ativo/inativo) sem deletar o cadastro'),
    bullet('Tabela de preços independente com valores em reais'),
    bullet('Categorias customizáveis que organizam serviços e preços'),
    pageBreak(),
  );

  // ── 7. SEGURANÇA ─────────────────────────────────────────────────────────
  sections.push(
    heading1('7. Segurança e Autenticação'),
    spacer(),
    heading3('Métodos de Autenticação'),
    bullet('E-mail e senha — hash seguro com algoritmo scrypt (Node.js crypto)'),
    bullet('Login com Google — Firebase OAuth 2.0, sem armazenamento de senhas Google'),
    bullet('Login via WhatsApp — autenticação por número de telefone'),
    bullet('Recuperação de senha por e-mail automático via SendGrid'),
    spacer(),
    heading3('Controle de Acesso'),
    bullet('Rotas administrativas exigem autenticação + flag isAdmin = true'),
    bullet('Validação de dados com Zod em todas as entradas do servidor'),
    bullet('Proteção contra exclusão da própria conta de administrador'),
    bullet('Diálogos de confirmação (shadcn AlertDialog) para ações destrutivas'),
    bullet('Variáveis de ambiente para todas as credenciais sensíveis'),
    bullet('Comunicação HTTPS em produção com certificado SSL automático'),
    pageBreak(),
  );

  // ── 8. BANCO DE DADOS ────────────────────────────────────────────────────
  sections.push(
    heading1('8. Banco de Dados'),
    spacer(),
    body('PostgreSQL hospedado na Neon (plataforma serverless em nuvem), com acesso via Drizzle ORM e schema versionado por migrações não-destrutivas.'),
    spacer(),
    infoTable([
      ['users',            'Usuários. Campos: id, name, username, password (hash), phone, email, isAdmin, createdAt'],
      ['professionals',    'Profissionais. Campos: id, name, specialty, photo, active'],
      ['services',         'Serviços. Campos: id, name, description, duration, categoryId, active'],
      ['categories',       'Categorias. Campos: id, name, order'],
      ['price_items',      'Preços. Campos: id, name, description, price, categoryId'],
      ['appointments',     'Agendamentos. Campos: id, name, phone, serviceId, professionalId, date, time, notes, status, createdAt'],
      ['schedule_blocks',  'Bloqueios. Campos: id, title, startTime, endTime, professionalId (null = geral)'],
      ['sales',            'Vendas. Campos: id, clientName, serviceId, serviceName, amount, paymentMethod, date'],
      ['reviews',          'Avaliações. Campos: id, clientName, rating, comment, likes, thumbsLikes, userId, createdAt'],
      ['review_comments',  'Comentários. Campos: id, reviewId, userId, userName, comment, heartLikes, thumbsLikes'],
      ['site_config',      'Configurações. Campos: id, siteName, siteSlogan, pixKey, whatsappNumber, logoUrl'],
      ['footer',           'Rodapé. Campos: id, businessName, address, phone, email, instagram, facebook, whatsapp, hours'],
      ['banner',           'Banner. Campos: id, imageUrl, updatedAt'],
    ]),
    pageBreak(),
  );

  // ── 9. INTEGRAÇÕES ────────────────────────────────────────────────────────
  sections.push(
    heading1('9. Integrações Externas'),
    spacer(),
    heading3('Firebase (Google Authentication)'),
    body('Login com conta Google em um clique. Token JWT verificado no servidor e vinculado ao usuário no banco. Configurado via VITE_FIREBASE_API_KEY nas variáveis de ambiente.'),
    heading3('SendGrid (E-mails Transacionais)'),
    body('Envio automático de: confirmações de agendamento, recuperação de senha e notificações. Chave de API configurada como variável de ambiente segura (SENDGRID_API_KEY).'),
    heading3('WhatsApp'),
    body('Notificações automáticas para clientes após confirmação de agendamento. Número do salão configurado nas configurações gerais — alterável sem código.'),
    heading3('PIX / QR Code'),
    body('QR Code gerado dinamicamente com a chave PIX cadastrada. Exibido em tela cheia no momento do pagamento para leitura facilitada pelo celular do cliente.'),
    heading3('Neon PostgreSQL'),
    body('Banco de dados PostgreSQL gerenciado em nuvem com backups automáticos, escalabilidade sob demanda e suporte a conexões serverless para baixa latência.'),
    pageBreak(),
  );

  // ── 10. REQUISITOS ────────────────────────────────────────────────────────
  sections.push(
    heading1('10. Requisitos do Sistema'),
    spacer(),
    heading3('Para Usuários Finais'),
    bullet('Navegador: Chrome, Firefox, Safari ou Edge (últimas 2 versões)'),
    bullet('Conexão com internet (banda larga ou 4G/5G)'),
    bullet('Dispositivo: computador, tablet ou smartphone — sem instalação'),
    spacer(),
    heading3('Para Execução do Servidor'),
    bullet('Node.js versão 18 ou superior'),
    bullet('PostgreSQL 14 ou superior (ou Neon serverless)'),
    bullet('Mínimo 512 MB de RAM (1 GB recomendado)'),
    spacer(),
    heading3('Variáveis de Ambiente'),
    infoTable([
      ['DATABASE_URL',         'URL de conexão com o PostgreSQL (Neon)'],
      ['SESSION_SECRET',       'Chave secreta para criptografia das sessões'],
      ['SENDGRID_API_KEY',     'Chave da API SendGrid para e-mails automáticos'],
      ['VITE_FIREBASE_API_KEY','Chave Firebase para login com Google'],
      ['NODE_ENV',             'Ambiente: development ou production'],
    ]),
    spacer(),
    new Paragraph({
      children: [new TextRun({
        text: 'Documentação gerada em Maio de 2026 · Ateliê de Beleza · Proprietário: Leandro Oliveira Menezes',
        size: 16, color: '9ca3af', italics: true, font: 'Calibri',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    }),
  );

  // ── ASSEMBLE DOC ──────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
    sections: [{
      properties: {},
      children: sections,
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const outFile = path.join(OUT, 'Documentacao_Sistema_Atelie_de_Beleza.docx');
  fs.writeFileSync(outFile, buf);
  console.log('✅ DOCX Documentação:', outFile);
}

buildDocumentation().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
