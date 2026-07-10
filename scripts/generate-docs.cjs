const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'generated');
const screensDir = path.join(outputDir, 'screens');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// ─── COLORS ─────────────────────────────────────────────────────────────────
const PURPLE   = '#7c3aed';
const PURPLE_L = '#ede9fe';
const DARK     = '#1e1b4b';
const GRAY     = '#6b7280';

// ─── HELPERS ────────────────────────────────────────────────────────────────
function checkPageBreak(doc, needed = 80) {
  if (doc.y > doc.page.height - needed - 50) doc.addPage();
}

function header(doc, title, subtitle) {
  doc.rect(0, 0, doc.page.width, 58).fill(PURPLE);
  doc.fillColor('white').fontSize(17).font('Helvetica-Bold')
    .text(title, 40, 13, { align: 'center', width: doc.page.width - 80 });
  if (subtitle) {
    doc.fillColor('rgba(255,255,255,0.75)').fontSize(9.5).font('Helvetica')
      .text(subtitle, 40, 36, { align: 'center', width: doc.page.width - 80 });
  }
  doc.y = 74;
}

function sectionTitle(doc, text) {
  checkPageBreak(doc, 60);
  doc.moveDown(0.5);
  const y = doc.y;
  doc.rect(40, y, doc.page.width - 80, 22).fill(PURPLE);
  doc.fillColor('white').fontSize(10.5).font('Helvetica-Bold')
    .text(text, 48, y + 5, { width: doc.page.width - 96 });
  doc.y = y + 28;
  doc.moveDown(0.2);
}

function subTitle(doc, text) {
  checkPageBreak(doc, 40);
  doc.moveDown(0.3);
  doc.fillColor(PURPLE).fontSize(10).font('Helvetica-Bold').text(text, 40);
  doc.fillColor(DARK).moveDown(0.1);
}

function body(doc, text, indent) {
  indent = indent || 40;
  doc.fillColor('#374151').fontSize(9.5).font('Helvetica')
    .text(text, indent, doc.y, { width: doc.page.width - indent - 40, lineGap: 2 });
  doc.moveDown(0.2);
}

function bullet(doc, text) {
  body(doc, '\u2022 ' + text, 52);
}

function addScreenshot(doc, file, caption, opts) {
  opts = opts || {};
  var fullPath = path.join(screensDir, file);
  if (!fs.existsSync(fullPath)) {
    checkPageBreak(doc, 50);
    doc.moveDown(0.3);
    doc.rect(40, doc.y, doc.page.width - 80, 30).fill('#f3f4f6');
    doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
      .text('[Screenshot: ' + caption + ']', 40, doc.y - 22, { width: doc.page.width - 80, align: 'center' });
    doc.moveDown(0.5);
    return;
  }
  checkPageBreak(doc, 260);
  doc.moveDown(0.4);

  var maxW = doc.page.width - 80;
  var maxH = opts.maxH || 200;
  var imgX = 40;
  var imgY = doc.y;

  doc.rect(imgX - 1, imgY - 1, maxW + 2, maxH + 2).stroke('#d1d5db');
  doc.image(fullPath, imgX, imgY, { width: maxW, height: maxH, cover: [maxW, maxH], align: 'center', valign: 'top' });

  doc.y = imgY + maxH + 4;

  doc.rect(40, doc.y, maxW, 20).fill(PURPLE_L);
  var capY = doc.y + 4;
  doc.fillColor(PURPLE).fontSize(8.5).font('Helvetica-Bold')
    .text('\uD83D\uDCF8  ' + caption, 46, capY, { width: maxW - 12 });
  doc.y = capY + 18;
  doc.moveDown(0.5);
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTAÇÃO DO SISTEMA
// ═══════════════════════════════════════════════════════════════════════════
function generateDocumentation() {
  var doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 50, left: 40, right: 40 }, autoFirstPage: true });
  var out = path.join(outputDir, 'Documentacao_Sistema_Atelie_de_Beleza.pdf');
  doc.pipe(fs.createWriteStream(out));

  // ── CAPA ──────────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PURPLE);
  doc.circle(doc.page.width / 2, 175, 62).fill('rgba(255,255,255,0.12)');
  doc.circle(doc.page.width / 2, 175, 46).fill('rgba(255,255,255,0.18)');
  doc.fillColor('white').fontSize(34).font('Helvetica-Bold')
    .text('\u2702', doc.page.width / 2 - 22, 156);

  doc.fillColor('white').fontSize(32).font('Helvetica-Bold')
    .text('Atelie\u0302 de Beleza', 0, 264, { align: 'center' });
  doc.fontSize(14).font('Helvetica')
    .text('Sistema de Gerenciamento', 0, 302, { align: 'center' });

  doc.fillColor('rgba(255,255,255,0.5)').fontSize(11)
    .text('\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014', 0, 328, { align: 'center' });

  doc.fillColor('white').fontSize(17).font('Helvetica-Bold')
    .text('DOCUMENTAÇÃO COMPLETA', 0, 354, { align: 'center' });
  doc.fontSize(11).font('Helvetica')
    .text('Manual do Usuário e Guia Técnico', 0, 376, { align: 'center' });
  doc.fillColor('rgba(255,255,255,0.65)').fontSize(10)
    .text('Versão 1.0  \u00B7  Maio de 2026', 0, 408, { align: 'center' });

  doc.rect(80, 454, doc.page.width - 160, 82).fill('rgba(255,255,255,0.1)');
  doc.fillColor('rgba(255,255,255,0.85)').fontSize(9.5).font('Helvetica-Bold')
    .text('PROPRIETÁRIO', 0, 466, { align: 'center' });
  doc.fontSize(13).font('Helvetica-Bold')
    .text('Leandro Oliveira Menezes', 0, 482, { align: 'center' });
  doc.fontSize(9).font('Helvetica')
    .text('lleandro.m32@gmail.com', 0, 502, { align: 'center' });

  doc.fillColor('rgba(255,255,255,0.45)').fontSize(8)
    .text('React \u00B7 Node.js \u00B7 TypeScript \u00B7 PostgreSQL \u00B7 Neon DB', 0, 700, { align: 'center' });

  // ── ÍNDICE ────────────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, 'Índice Geral', 'Ateliê de Beleza — Sistema de Gerenciamento');

  var sections = [
    ['1', 'Visão Geral do Sistema', '3'],
    ['2', 'Tecnologias Utilizadas', '4'],
    ['3', 'Página Pública — Landing Page', '5'],
    ['4', 'Sistema de Agendamentos', '7'],
    ['5', 'Painel Administrativo', '9'],
    ['6', 'Gestão de Profissionais', '11'],
    ['7', 'Gestão de Serviços e Preços', '12'],
    ['8', 'Gestão de Vendas e PIX', '13'],
    ['9', 'Avaliações e Comentários', '14'],
    ['10', 'Bloqueios de Agenda', '15'],
    ['11', 'Gerenciamento de Usuários e Clientes', '16'],
    ['12', 'Configurações do Sistema', '17'],
    ['13', 'Segurança e Autenticação', '18'],
    ['14', 'Banco de Dados', '19'],
    ['15', 'Integrações Externas', '20'],
    ['16', 'Requisitos do Sistema', '21'],
  ];

  doc.moveDown(0.5);
  sections.forEach(function(s) {
    var num = s[0], title = s[1], pg = s[2];
    var y = doc.y;
    doc.fillColor(PURPLE).fontSize(10).font('Helvetica-Bold')
      .text(num + '.', 50, y, { continued: true, width: 28 });
    doc.fillColor(DARK).font('Helvetica').text('  ' + title, { continued: true, width: 370 });
    doc.fillColor('#d1d5db').text(' . . . . . . . . . . . . . . . . . . . . . . .', { continued: true, width: 70 });
    doc.fillColor(PURPLE).font('Helvetica-Bold').text(' ' + pg, { width: 25, align: 'right' });
    doc.moveDown(0.38);
  });

  // ── 1. VISÃO GERAL ────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '1. Visão Geral do Sistema', 'O que é o Ateliê de Beleza');

  body(doc, 'O Ateliê de Beleza é um sistema web completo de gerenciamento para salões de beleza. Desenvolvido com tecnologias modernas, oferece uma interface pública para clientes e um robusto painel administrativo para gestão do negócio em tempo real.');
  doc.moveDown(0.2);
  body(doc, 'O sistema substitui cadernos físicos e controles manuais, digitalizando toda a operação do salão:');
  bullet(doc, 'Agendamento online 24h com seleção de profissional e horário disponível');
  bullet(doc, 'Painel administrativo completo com sidebar de navegação');
  bullet(doc, 'Controle financeiro com registro de vendas e suporte a PIX com QR Code');
  bullet(doc, 'Gestão de equipe, serviços, clientes e avaliações');
  bullet(doc, 'Notificações automáticas via WhatsApp');
  bullet(doc, 'Design responsivo para celular, tablet e computador');

  sectionTitle(doc, 'Estrutura do Sistema');
  subTitle(doc, 'Área Pública (acesso livre)');
  bullet(doc, 'Landing page com banner, serviços, preços, agendamentos e avaliações');
  bullet(doc, 'Formulário de agendamento online com seleção de profissional');
  bullet(doc, 'Sistema de avaliações com reações e comentários');
  bullet(doc, 'Login e cadastro de cliente');

  doc.moveDown(0.2);
  subTitle(doc, 'Painel Administrativo (acesso restrito)');
  bullet(doc, 'Dashboard com gerenciamento completo do salão');
  bullet(doc, 'Módulos: Agendamentos, Profissionais, Vendas, Clientes, Usuários, Configurações');
  bullet(doc, 'Bloqueios de agenda por profissional ou para toda a equipe');

  // ── 2. TECNOLOGIAS ────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '2. Tecnologias Utilizadas', 'Stack Tecnológica');

  subTitle(doc, 'Frontend');
  bullet(doc, 'React 18 — interface de usuário reativa com componentes modernos');
  bullet(doc, 'TypeScript — tipagem estática para maior confiabilidade do código');
  bullet(doc, 'Vite — bundler e servidor de desenvolvimento ultrarrápido');
  bullet(doc, 'Tailwind CSS — estilização responsiva com classes utilitárias');
  bullet(doc, 'shadcn/ui — componentes acessíveis e prontos para produção');
  bullet(doc, 'TanStack Query v5 — gerenciamento de estado assíncrono e cache');
  bullet(doc, 'Wouter — roteamento leve no lado do cliente');
  bullet(doc, 'React Hook Form + Zod — formulários com validação robusta');
  bullet(doc, 'Lucide React — biblioteca de ícones consistente');

  doc.moveDown(0.2);
  subTitle(doc, 'Backend');
  bullet(doc, 'Node.js + Express.js — servidor HTTP eficiente');
  bullet(doc, 'TypeScript — código tipado e seguro no servidor');
  bullet(doc, 'Drizzle ORM — mapeamento objeto-relacional leve e tipado');
  bullet(doc, 'Passport.js — autenticação com sessões seguras');
  bullet(doc, 'Zod — validação de dados nas entradas de todas as rotas');
  bullet(doc, 'Multer — processamento de upload de imagens e arquivos');
  bullet(doc, 'express-session — gestão de sessões com cookies seguros');

  doc.moveDown(0.2);
  subTitle(doc, 'Banco de Dados e Serviços Externos');
  bullet(doc, 'PostgreSQL via Neon — banco relacional em nuvem com backups automáticos');
  bullet(doc, 'Drizzle Kit — migrações de schema versionadas');
  bullet(doc, 'Firebase — autenticação Google (OAuth 2.0)');
  bullet(doc, 'SendGrid — envio de e-mails transacionais');
  bullet(doc, 'WhatsApp API — notificações automáticas para clientes');
  bullet(doc, 'PIX QR Code — geração dinâmica de QR Code para pagamentos');

  // ── 3. LANDING PAGE ────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '3. Página Pública — Landing Page', 'A vitrine digital do salão');

  body(doc, 'A landing page é a primeira experiência do cliente com o salão. Todas as seções são configuráveis pelo administrador sem necessidade de conhecimento técnico. Acessível em qualquer navegador e dispositivo.');

  addScreenshot(doc, 's01_landing.jpg', 'Tela inicial — Banner com identidade visual e botões de ação principais', { maxH: 215 });

  sectionTitle(doc, 'Navegação Superior (Navbar)');
  body(doc, 'Barra de navegação fixa no topo com o logo e nome do salão à esquerda. Links de navegação suave para as seções: Serviços, Preços, Agendamentos e Avaliações. Botão "Login" à direita para acesso à área do cliente ou ao painel administrativo.');

  sectionTitle(doc, 'Seção Hero — Banner Principal');
  body(doc, 'Imagem de destaque em tela cheia com sobreposição para garantir legibilidade do texto. Exibe o nome do salão, slogan e dois botões principais: "Agendar Horário" (ação primária) e "Nossos Serviços". A imagem é trocada pelo administrador nas Configurações do sistema.');

  sectionTitle(doc, 'Seção de Serviços');
  body(doc, 'Cards com todos os serviços cadastrados, organizados por categoria. Cada card exibe nome, descrição, duração estimada e preço do serviço.');

  sectionTitle(doc, 'Tabela de Preços');
  body(doc, 'Listagem clara de preços por categoria, facilitando a consulta antes do agendamento. Atualizada automaticamente ao cadastrar novos itens no painel.');

  sectionTitle(doc, 'Seção de Avaliações');
  body(doc, 'Depoimentos reais com estrelas (1–5), comentários e reações dos clientes (❤️ e 👍). Transmite confiança para novos clientes.');

  sectionTitle(doc, 'Rodapé');
  body(doc, 'Endereço, telefone, e-mail, redes sociais (Instagram, Facebook, WhatsApp), horário de funcionamento e direitos reservados com ano atual. Totalmente editável nas Configurações.');

  // ── 4. AGENDAMENTOS ────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '4. Sistema de Agendamentos', 'Agendamento online para clientes');

  body(doc, 'O módulo permite que clientes agendem horários diretamente pelo site, com seleção de serviço, profissional, data e horário disponíveis — 24 horas por dia, 7 dias por semana.');

  addScreenshot(doc, 's04_booking.png', 'Formulário de agendamento — Seleção de profissional, data com bloqueio e motivo exibido', { maxH: 210 });

  sectionTitle(doc, 'Fluxo de Agendamento do Cliente');
  bullet(doc, '1. Acessa a landing page e clica em "Agendar Horário"');
  bullet(doc, '2. Seleciona o serviço desejado no menu suspenso');
  bullet(doc, '3. Escolhe o profissional preferido ou "Qualquer profissional"');
  bullet(doc, '4. Seleciona a data — dias bloqueados mostram o motivo e ficam desabilitados');
  bullet(doc, '5. Seleciona o horário disponível na data escolhida');
  bullet(doc, '6. Preenche nome, telefone e observações');
  bullet(doc, '7. Confirma o agendamento — notificação enviada via WhatsApp');

  sectionTitle(doc, 'Lógica de Disponibilidade');
  body(doc, 'O sistema verifica em tempo real antes de exibir os horários disponíveis:');
  bullet(doc, 'Horários já ocupados por outros agendamentos confirmados');
  bullet(doc, 'Bloqueios gerais — afetam toda a equipe (feriados, férias coletivas)');
  bullet(doc, 'Bloqueios individuais — afetam somente o profissional selecionado');
  body(doc, 'Quando uma data está bloqueada, o sistema exibe o motivo (ex: "Viagem", "Feriado"). Se o bloqueio for individual, outros profissionais continuam disponíveis para o mesmo dia.');

  sectionTitle(doc, 'Gerenciamento de Agendamentos (Administrador)');
  addScreenshot(doc, 's09_appointments.png', 'Painel — Aba Agendamentos com status, cliente, serviço e ações', { maxH: 190 });
  bullet(doc, 'Listar agendamentos com filtro por status e data');
  bullet(doc, 'Status: Pendente, Confirmado, Concluído, Cancelado');
  bullet(doc, 'Confirmar, concluir ou cancelar com um clique');
  bullet(doc, 'Ver detalhes completos: cliente, serviço, profissional, horário, observações');

  // ── 5. PAINEL ADMINISTRATIVO ───────────────────────────────────────────────
  doc.addPage();
  header(doc, '5. Painel Administrativo', 'Central de controle do salão');

  body(doc, 'O painel administrativo é acessado em /dashboard. Requer login com e-mail e senha de administrador. Após autenticação, todas as funcionalidades de gestão estão disponíveis na barra lateral esquerda.');

  addScreenshot(doc, 's07_login.jpg', 'Tela de Login — E-mail e senha, Login com Google, Login via WhatsApp', { maxH: 190 });

  sectionTitle(doc, 'Sidebar — Módulos Disponíveis');

  var tabs = [
    ['Agendamentos', 'Lista e gerencia todos os agendamentos com status em tempo real'],
    ['Profissionais', 'Cadastra e gerencia a equipe com fotos e especialidades'],
    ['Bloqueios de Agenda', 'Bloqueia dias por profissional ou para toda a equipe'],
    ['Gestão de Vendas', 'Registra vendas, exibe histórico e totais por período com suporte a PIX'],
    ['Clientes', 'Lista clientes com busca, edição e remoção segura'],
    ['Usuários do Sistema', 'Gerencia usuários administradores e clientes com controle de acesso'],
    ['Configurações', 'Nome, slogan, banner, rodapé, chave PIX e número WhatsApp'],
  ];
  tabs.forEach(function(t) {
    checkPageBreak(doc, 28);
    doc.fillColor(PURPLE).fontSize(9.5).font('Helvetica-Bold')
      .text('\u2022 ' + t[0] + ':', 52, doc.y, { continued: true });
    doc.fillColor('#374151').font('Helvetica').text('  ' + t[1]);
    doc.moveDown(0.15);
  });

  // ── 6. PROFISSIONAIS ────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '6. Gestão de Profissionais', 'Cadastro e gerenciamento da equipe');

  addScreenshot(doc, 's10_professionals.png', 'Aba Profissionais — Foto, nome, especialidade e status ativo/inativo', { maxH: 200 });

  sectionTitle(doc, 'Funcionalidades');
  bullet(doc, 'Cadastrar profissional com foto (upload direto), nome e especialidades');
  bullet(doc, 'Editar informações de qualquer profissional a qualquer momento');
  bullet(doc, 'Ativar ou desativar profissional com um clique');
  bullet(doc, 'Profissionais inativos não aparecem no formulário de agendamento');
  bullet(doc, 'Profissionais ativos são listados como opção no formulário do cliente');
  bullet(doc, 'Foto do profissional exibida no painel e no formulário de agendamento');

  // ── 7. SERVIÇOS E PREÇOS ────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '7. Gestão de Serviços e Preços', 'Catálogo e tabela de preços');

  sectionTitle(doc, 'Serviços');
  body(doc, 'Configura o catálogo de serviços do salão. Cada serviço pode ter:');
  bullet(doc, 'Nome do serviço (ex: Corte de Cabelo, Manicure, Maquiagem)');
  bullet(doc, 'Descrição detalhada do que é realizado');
  bullet(doc, 'Duração estimada em minutos');
  bullet(doc, 'Categoria para organização (ex: Cabelo, Unhas, Pele)');
  bullet(doc, 'Status ativo/inativo — controla visibilidade na landing page');
  body(doc, 'Serviços ativos aparecem automaticamente na landing page e no formulário de agendamento.');

  sectionTitle(doc, 'Preços');
  body(doc, 'Tabela de preços independente do catálogo de serviços. Permite cadastrar itens com:');
  bullet(doc, 'Nome do item de precificação');
  bullet(doc, 'Descrição opcional');
  bullet(doc, 'Valor em reais com duas casas decimais');
  bullet(doc, 'Categoria para agrupamento na exibição');
  body(doc, 'Os preços são exibidos na seção "Preços" da landing page, organizados por categoria.');

  sectionTitle(doc, 'Categorias');
  body(doc, 'As categorias organizam tanto os serviços quanto os preços. São criadas nas configurações e aparecem como agrupadores na landing page e como filtros no painel.');

  // ── 8. VENDAS E PIX ─────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '8. Gestão de Vendas e PIX', 'Controle financeiro do salão');

  addScreenshot(doc, 's12_sales.png', 'Aba Gestão de Vendas — Registro de transações e histórico financeiro', { maxH: 180 });

  sectionTitle(doc, 'Registro de Venda');
  body(doc, 'Ao finalizar um atendimento, o administrador registra a transação:');
  bullet(doc, 'Nome do cliente atendido');
  bullet(doc, 'Serviço realizado (selecionado do catálogo)');
  bullet(doc, 'Valor cobrado (pode diferir do preço base)');
  bullet(doc, 'Método de pagamento: Dinheiro, Débito, Crédito, PIX ou Outro');
  bullet(doc, 'Data e hora registradas automaticamente no momento do cadastro');

  sectionTitle(doc, 'PIX com QR Code');
  body(doc, 'Ao selecionar PIX como forma de pagamento, o sistema gera e exibe automaticamente um QR Code em tela cheia com a chave PIX cadastrada nas configurações. O cliente aponta o celular e paga instantaneamente — sem troco, sem maquininha.');
  body(doc, 'A chave PIX é configurada pelo administrador nas Configurações Gerais e pode ser atualizada a qualquer momento.');

  sectionTitle(doc, 'Histórico de Vendas');
  bullet(doc, 'Listagem completa de todas as transações em ordem cronológica');
  bullet(doc, 'Total acumulado de vendas no período');
  bullet(doc, 'Método de pagamento identificado em cada registro');

  // ── 9. AVALIAÇÕES ───────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '9. Avaliações e Comentários', 'Engajamento com clientes');

  sectionTitle(doc, 'Sistema de Avaliações');
  body(doc, 'Clientes autenticados podem deixar avaliações do salão com:');
  bullet(doc, 'Nota de 1 a 5 estrelas');
  bullet(doc, 'Comentário escrito descrevendo a experiência');
  bullet(doc, 'Reações: Coração (\u2764\uFE0F) e Curtida (\uD83D\uDC4D) — qualquer visitante pode reagir');
  body(doc, 'As avaliações aparecem automaticamente na seção "Avaliações" da landing page, transmitindo credibilidade para novos clientes.');

  sectionTitle(doc, 'Comentários nas Avaliações');
  body(doc, 'Cada avaliação suporta comentários encadeados de outros usuários autenticados. Os comentários também têm reações independentes (❤️ e 👍).');

  sectionTitle(doc, 'Gestão pelo Administrador');
  bullet(doc, 'Visualizar todas as avaliações e comentários no painel');
  bullet(doc, 'Editar ou remover avaliações impróprias com confirmação');
  bullet(doc, 'Moderar comentários inadequados');
  bullet(doc, 'Avaliações removidas desaparecem imediatamente da landing page');

  // ── 10. BLOQUEIOS ────────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '10. Bloqueios de Agenda', 'Controle de disponibilidade por profissional');

  addScreenshot(doc, 's11_blocks.png', 'Aba Bloqueios de Agenda — Filtro por profissional e listagem de bloqueios ativos', { maxH: 220 });

  sectionTitle(doc, 'Tipos de Bloqueio');
  subTitle(doc, 'Bloqueio Geral (Toda a Equipe)');
  body(doc, 'Bloqueia todos os profissionais no período informado. Usado para feriados, férias coletivas, reformas ou qualquer situação que impeça o funcionamento total do salão.');

  subTitle(doc, 'Bloqueio Individual (Por Profissional)');
  body(doc, 'Bloqueia a agenda apenas de um profissional específico. Usado para folgas, viagens pessoais ou compromissos individuais. Os demais profissionais permanecem disponíveis para agendamento.');

  sectionTitle(doc, 'Como Criar um Bloqueio');
  bullet(doc, '1. Clicar em "+ Novo Bloqueio"');
  bullet(doc, '2. Selecionar data de início e data de fim do bloqueio');
  bullet(doc, '3. Informar o motivo/título (ex: "Viagem", "Feriado Nacional")');
  bullet(doc, '4. Opcionalmente selecionar um profissional específico (ou deixar em branco para bloqueio geral)');
  bullet(doc, '5. Salvar — o bloqueio entra em vigor imediatamente');

  sectionTitle(doc, 'Impacto no Agendamento');
  body(doc, 'Datas bloqueadas ficam destacadas visualmente no seletor de data do formulário de agendamento. O sistema exibe automaticamente o motivo do bloqueio ao passar o mouse ou selecionar a data. Se o bloqueio for individual, outros profissionais continuam disponíveis no mesmo período.');

  // ── 11. USUÁRIOS E CLIENTES ──────────────────────────────────────────────────
  doc.addPage();
  header(doc, '11. Usuários e Clientes', 'Gerenciamento de acesso ao sistema');

  addScreenshot(doc, 's14_users.png', 'Aba Usuários do Sistema — Lista com tipo, contato e data de cadastro', { maxH: 185 });

  sectionTitle(doc, 'Usuários do Sistema');
  body(doc, 'Controle completo dos usuários com acesso ao sistema:');
  bullet(doc, 'Administradores — acesso completo ao painel administrativo');
  bullet(doc, 'Clientes — acesso à área do cliente e histórico pessoal');
  bullet(doc, 'Criar novos usuários com nome, e-mail, senha e telefone');
  bullet(doc, 'Remover usuários com confirmação via diálogo seguro (sem janelas do navegador)');
  bullet(doc, 'Proteção: o administrador logado não pode excluir a própria conta');
  bullet(doc, 'Datas exibidas no formato brasileiro (dd/mm/aaaa)');

  addScreenshot(doc, 's13_clients.png', 'Aba Clientes — Busca em tempo real, edição e remoção de clientes', { maxH: 175 });

  sectionTitle(doc, 'Gestão de Clientes');
  bullet(doc, 'Listar todos os clientes com nome, telefone e data de cadastro');
  bullet(doc, 'Busca em tempo real por nome ou telefone');
  bullet(doc, 'Editar dados do cliente (nome, telefone, e-mail)');
  bullet(doc, 'Remover cliente com diálogo de confirmação');
  bullet(doc, 'Cadastrar novos clientes manualmente quando necessário');

  // ── 12. CONFIGURAÇÕES ─────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '12. Configurações do Sistema', 'Personalização sem conhecimento técnico');

  sectionTitle(doc, 'Configurações Gerais');
  bullet(doc, 'Nome do salão/site exibido no navegador e nos e-mails');
  bullet(doc, 'Slogan exibido no rodapé e na landing page');
  bullet(doc, 'Logo do salão com upload e prévia imediata');
  bullet(doc, 'Chave PIX para geração automática do QR Code de pagamento');
  bullet(doc, 'Número do WhatsApp para notificações automáticas de agendamento');

  sectionTitle(doc, 'Banner / Imagem de Destaque');
  bullet(doc, 'Upload de nova imagem para a seção hero da landing page');
  bullet(doc, 'Suporte a JPG, PNG e WebP');
  bullet(doc, 'Cache-busting automático — nova imagem aparece imediatamente sem recarregar a página');
  bullet(doc, 'Prévia da imagem atual exibida antes de substituir');

  sectionTitle(doc, 'Rodapé');
  bullet(doc, 'Nome do negócio exibido no rodapé');
  bullet(doc, 'Endereço completo (rua, número, cidade, estado, CEP)');
  bullet(doc, 'Telefone de contato e e-mail do salão');
  bullet(doc, 'Links de redes sociais: Instagram, Facebook e WhatsApp');
  bullet(doc, 'Horário de funcionamento (dias e horas)');

  // ── 13. SEGURANÇA ─────────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '13. Segurança e Autenticação', 'Proteção de dados e controle de acesso');

  sectionTitle(doc, 'Métodos de Autenticação');
  subTitle(doc, 'E-mail e Senha');
  bullet(doc, 'Senhas armazenadas com hash seguro (algoritmo scrypt do Node.js crypto)');
  bullet(doc, 'Sessões gerenciadas com express-session e cookies HttpOnly');
  bullet(doc, 'Opção "Lembrar-me" para manter sessão ativa entre navegações');
  bullet(doc, 'Recuperação de senha por e-mail automático via SendGrid');

  subTitle(doc, 'Login Social — Google');
  bullet(doc, 'Integração com Firebase Authentication');
  bullet(doc, 'Autenticação via OAuth 2.0 — padrão da indústria');
  bullet(doc, 'Sem armazenamento de senhas Google — credencial gerenciada pelo Google');

  subTitle(doc, 'Login via WhatsApp');
  bullet(doc, 'Fluxo de autenticação por número de telefone');
  bullet(doc, 'Usuário criado automaticamente e vinculado ao número');

  sectionTitle(doc, 'Controle de Acesso');
  bullet(doc, 'Rotas administrativas exigem autenticação + flag isAdmin = true');
  bullet(doc, 'Rotas de cliente requerem autenticação básica com sessão válida');
  bullet(doc, 'Validação de dados com Zod em todas as entradas do servidor');
  bullet(doc, 'Proteção contra exclusão da própria conta de administrador');
  bullet(doc, 'Diálogos de confirmação (shadcn AlertDialog) para ações destrutivas');

  sectionTitle(doc, 'Boas Práticas Implementadas');
  bullet(doc, 'Credenciais sensíveis armazenadas como variáveis de ambiente (nunca no código)');
  bullet(doc, 'Comunicação HTTPS em produção com certificado SSL automático');
  bullet(doc, 'Erros do servidor não expõem detalhes técnicos ao cliente');
  bullet(doc, 'Sanitização de inputs antes de qualquer operação no banco de dados');
  bullet(doc, 'Arquivos de upload isolados em diretório /uploads separado e versionado');

  // ── 14. BANCO DE DADOS ────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '14. Banco de Dados', 'Estrutura e armazenamento de dados');

  body(doc, 'O sistema utiliza PostgreSQL hospedado na Neon (plataforma serverless em nuvem), com acesso via Drizzle ORM e schema versionado por migrações.');

  sectionTitle(doc, 'Tabelas do Sistema');

  var tables = [
    ['users', 'Usuários do sistema. Campos: id, name, username, password (hash), phone, email, isAdmin, createdAt'],
    ['professionals', 'Profissionais do salão. Campos: id, name, specialty, photo, active'],
    ['services', 'Catálogo de serviços. Campos: id, name, description, duration, categoryId, active'],
    ['categories', 'Categorias de serviços e preços. Campos: id, name, order'],
    ['price_items', 'Tabela de preços. Campos: id, name, description, price, categoryId'],
    ['appointments', 'Agendamentos. Campos: id, name, phone, serviceId, professionalId, date, time, notes, status, createdAt'],
    ['schedule_blocks', 'Bloqueios de agenda. Campos: id, title, startTime, endTime, professionalId (null = bloqueio geral)'],
    ['sales', 'Registro de vendas. Campos: id, clientName, serviceId, serviceName, amount, paymentMethod, date'],
    ['reviews', 'Avaliações. Campos: id, clientName, rating, comment, likes, thumbsLikes, userId, createdAt'],
    ['review_comments', 'Comentários em avaliações. Campos: id, reviewId, userId, userName, comment, heartLikes, thumbsLikes'],
    ['site_config', 'Configurações gerais. Campos: id, siteName, siteSlogan, pixKey, whatsappNumber, logoUrl'],
    ['footer', 'Dados do rodapé. Campos: id, businessName, address, phone, email, instagram, facebook, whatsapp, hours'],
    ['banner', 'Imagem de destaque. Campos: id, imageUrl, updatedAt'],
  ];

  tables.forEach(function(t) {
    checkPageBreak(doc, 34);
    doc.fillColor(PURPLE).fontSize(9.5).font('Helvetica-Bold')
      .text('\u2022 ' + t[0], 52, doc.y, { continued: true });
    doc.fillColor('#374151').font('Helvetica').fontSize(9).text(' \u2014 ' + t[1], { lineGap: 2 });
    doc.moveDown(0.22);
  });

  sectionTitle(doc, 'Estratégia de Alterações de Schema');
  bullet(doc, 'Todas as alterações usam ADD COLUMN IF NOT EXISTS — não-destrutivo');
  bullet(doc, 'Migrações versionadas via Drizzle Kit (npm run db:push)');
  bullet(doc, 'Backup automático pela Neon com ponto de recuperação disponível');

  // ── 15. INTEGRAÇÕES ────────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '15. Integrações Externas', 'Serviços conectados ao sistema');

  var integrations = [
    ['Firebase (Google Authentication)', 'Permite que clientes e administradores entrem com sua conta Google com um clique. O token JWT é verificado no servidor e vinculado ao usuário no banco de dados automaticamente.'],
    ['SendGrid (E-mails Transacionais)', 'Envio automático de e-mails: confirmações de agendamento, recuperação de senha e notificações. A chave de API é configurada como variável de ambiente segura.'],
    ['WhatsApp', 'Notificações automáticas para clientes após confirmação de agendamento. O número do salão é configurado nas configurações gerais e pode ser alterado sem código.'],
    ['PIX / QR Code', 'QR Code gerado dinamicamente com a chave PIX cadastrada. Exibido em tela cheia no momento do pagamento para leitura facilitada pelo celular do cliente.'],
    ['Neon PostgreSQL', 'Banco de dados PostgreSQL gerenciado em nuvem com backups automáticos, escalabilidade sob demanda e suporte a conexões serverless.'],
  ];

  integrations.forEach(function(i) {
    subTitle(doc, i[0]);
    body(doc, i[1]);
    doc.moveDown(0.2);
  });

  // ── 16. REQUISITOS ────────────────────────────────────────────────────────────
  doc.addPage();
  header(doc, '16. Requisitos do Sistema', 'Especificações técnicas e de uso');

  sectionTitle(doc, 'Para Usuários Finais (Clientes e Administradores)');
  bullet(doc, 'Navegador: Chrome, Firefox, Safari ou Edge (versões dos últimos 2 anos)');
  bullet(doc, 'Conexão com internet (banda larga ou 4G/5G)');
  bullet(doc, 'Dispositivo: computador, notebook, tablet ou smartphone');
  bullet(doc, 'Não requer instalação — acesso apenas pelo navegador');

  sectionTitle(doc, 'Compatibilidade de Telas');
  bullet(doc, 'Desktop (\u2265 1280px): layout completo com sidebar e tabelas');
  bullet(doc, 'Tablet (768px – 1279px): layout adaptado com elementos redimensionados');
  bullet(doc, 'Mobile (< 768px): layout vertical otimizado para uso com o polegar');

  sectionTitle(doc, 'Para Execução do Servidor (Ambiente de Produção)');
  bullet(doc, 'Node.js versão 18 ou superior');
  bullet(doc, 'PostgreSQL 14 ou superior (ou Neon serverless)');
  bullet(doc, 'Mínimo 512 MB de RAM (1 GB recomendado)');
  bullet(doc, 'Sistema operacional: Linux (recomendado), macOS ou Windows');

  sectionTitle(doc, 'Variáveis de Ambiente Necessárias');
  var envs = [
    ['DATABASE_URL', 'URL de conexão com o banco PostgreSQL (Neon)'],
    ['SESSION_SECRET', 'Chave secreta para criptografia das sessões'],
    ['SENDGRID_API_KEY', 'Chave da API SendGrid para envio de e-mails'],
    ['VITE_FIREBASE_API_KEY', 'Chave Firebase para login com Google'],
    ['NODE_ENV', 'Ambiente: development ou production'],
  ];
  envs.forEach(function(e) {
    checkPageBreak(doc, 28);
    doc.fillColor('#1d4ed8').fontSize(9).font('Courier')
      .text(e[0], 52, doc.y, { continued: true, width: 180 });
    doc.fillColor('#374151').font('Helvetica').text('  \u2014 ' + e[1]);
    doc.moveDown(0.22);
  });

  doc.moveDown(0.8);
  doc.rect(40, doc.y, doc.page.width - 80, 0.5).fill('#e5e7eb');
  doc.moveDown(0.5);
  doc.fillColor(GRAY).fontSize(8.5).font('Helvetica-Oblique')
    .text('Documentação gerada em Maio de 2026  \u00B7  Ateliê de Beleza  \u00B7  Proprietário: Leandro Oliveira Menezes', { align: 'center' });

  doc.end();
  console.log('\u2705 Documentação gerada:', out);
}

generateDocumentation();
