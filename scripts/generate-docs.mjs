import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:5000';

async function takeScreenshot(page, url, waitFor = 2000) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, waitFor));
  return await page.screenshot({ encoding: 'base64', fullPage: true });
}

async function loginAsAdmin(page) {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Fill login form
  await page.type('input[type="text"], input[name="username"]', 'admin');
  await new Promise(r => setTimeout(r, 300));
  await page.type('input[type="password"]', 'admin123');
  await new Promise(r => setTimeout(r, 300));

  // Submit
  const buttons = await page.$$('button[type="submit"]');
  if (buttons.length > 0) await buttons[0].click();
  await new Promise(r => setTimeout(r, 3000));
}

function imgTag(base64, alt) {
  return `<img src="data:image/png;base64,${base64}" alt="${alt}" style="width:100%;border-radius:8px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin:16px 0;" />`;
}

function section(title, description, imgBase64, imgAlt, features = []) {
  return `
    <div class="section">
      <h2>${title}</h2>
      <p class="desc">${description}</p>
      ${features.length ? `<ul>${features.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
      ${imgBase64 ? imgTag(imgBase64, imgAlt) : ''}
    </div>
  `;
}

async function main() {
  console.log('Iniciando geração do PDF...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const screenshots = {};

  try {
    console.log('Capturando tela: Página Inicial...');
    screenshots.home = await takeScreenshot(page, `${BASE_URL}/`, 3000);

    console.log('Capturando tela: Login/Cadastro...');
    screenshots.auth = await takeScreenshot(page, `${BASE_URL}/auth`, 2000);

    // Tenta login como admin
    console.log('Realizando login como administrador...');
    await loginAsAdmin(page);

    const currentUrl = page.url();
    console.log('URL após login:', currentUrl);

    if (!currentUrl.includes('/auth')) {
      console.log('Capturando tela: Painel Administrativo...');
      screenshots.dashboard = await takeScreenshot(page, `${BASE_URL}/dashboard`, 3000);

      console.log('Capturando tela: Gerenciamento de Serviços...');
      screenshots.services = await takeScreenshot(page, `${BASE_URL}/admin/services`, 2500);

      console.log('Capturando tela: Gerenciamento de Categorias...');
      screenshots.categories = await takeScreenshot(page, `${BASE_URL}/admin/categories`, 2500);

      console.log('Capturando tela: Gerenciamento de Preços...');
      screenshots.prices = await takeScreenshot(page, `${BASE_URL}/admin/prices`, 2500);

      console.log('Capturando tela: Gerenciamento de Banner...');
      screenshots.banner = await takeScreenshot(page, `${BASE_URL}/admin/banner`, 2500);

      console.log('Capturando tela: Configurações do Site...');
      screenshots.siteConfig = await takeScreenshot(page, `${BASE_URL}/admin/site-config`, 2500);

      console.log('Capturando tela: Rodapé...');
      screenshots.footer = await takeScreenshot(page, `${BASE_URL}/admin/footer`, 2500);

      console.log('Capturando tela: Clientes e Vendas...');
      screenshots.clientsSales = await takeScreenshot(page, `${BASE_URL}/clients-sales`, 2500);

      console.log('Capturando tela: Perfil...');
      screenshots.profile = await takeScreenshot(page, `${BASE_URL}/profile`, 2500);
    }
  } catch (err) {
    console.error('Erro ao capturar screenshots:', err.message);
  }

  console.log('Gerando HTML da documentação...');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Documentação do Sistema</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #fff; font-size: 14px; }
    
    .cover {
      width: 100%; min-height: 100vh; display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      color: white; text-align: center; padding: 60px 40px;
      page-break-after: always;
    }
    .cover h1 { font-size: 42px; font-weight: 800; margin-bottom: 16px; letter-spacing: -1px; }
    .cover .subtitle { font-size: 20px; opacity: 0.85; margin-bottom: 40px; }
    .cover .meta { font-size: 14px; opacity: 0.7; line-height: 2; }
    .cover .badge {
      display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);
      border-radius: 100px; padding: 8px 24px; font-size: 13px; margin-bottom: 32px;
    }

    .toc {
      padding: 48px 64px; page-break-after: always;
    }
    .toc h2 { font-size: 28px; font-weight: 700; margin-bottom: 32px; color: #1e3a5f; border-bottom: 3px solid #2563eb; padding-bottom: 12px; }
    .toc-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
    .toc-num { width: 32px; height: 32px; background: #2563eb; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; margin-right: 16px; }
    .toc-label { flex: 1; font-size: 15px; color: #374151; }
    .toc-type { font-size: 11px; color: #9ca3af; background: #f3f4f6; padding: 3px 10px; border-radius: 100px; }

    .overview {
      padding: 48px 64px; page-break-after: always; background: #f8fafc;
    }
    .overview h2 { font-size: 28px; font-weight: 700; margin-bottom: 24px; color: #1e3a5f; }
    .overview p { color: #4b5563; line-height: 1.8; margin-bottom: 16px; }
    .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
    .feature-card { background: white; border-radius: 12px; padding: 20px; border-left: 4px solid #2563eb; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .feature-card h4 { font-size: 14px; font-weight: 700; color: #1e3a5f; margin-bottom: 6px; }
    .feature-card p { font-size: 13px; color: #6b7280; line-height: 1.6; }

    .section {
      padding: 48px 64px; page-break-before: always;
    }
    .section h2 { font-size: 26px; font-weight: 700; color: #1e3a5f; margin-bottom: 8px; }
    .section .badge-type { display: inline-block; font-size: 11px; padding: 3px 12px; border-radius: 100px; margin-bottom: 16px; font-weight: 600; }
    .public { background: #dcfce7; color: #15803d; }
    .admin { background: #fef3c7; color: #92400e; }
    .client { background: #dbeafe; color: #1e40af; }
    .section .desc { color: #4b5563; line-height: 1.8; margin-bottom: 20px; font-size: 15px; }
    .section ul { margin: 0 0 20px 20px; }
    .section ul li { color: #374151; line-height: 2; font-size: 14px; }
    .section ul li::marker { color: #2563eb; }

    .api-table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; }
    .api-table th { background: #1e3a5f; color: white; padding: 10px 14px; text-align: left; }
    .api-table td { padding: 9px 14px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .api-table tr:nth-child(even) td { background: #f9fafb; }
    .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .get { background: #dbeafe; color: #1e40af; }
    .post { background: #dcfce7; color: #15803d; }
    .patch { background: #fef3c7; color: #92400e; }
    .delete { background: #fee2e2; color: #dc2626; }

    .footer-doc { background: #1e3a5f; color: white; padding: 32px 64px; text-align: center; font-size: 13px; opacity: 0.9; }
  </style>
</head>
<body>

<!-- CAPA -->
<div class="cover">
  <div class="badge">Documentação Técnica</div>
  <h1>Sistema de Gestão<br/>de Agendamentos</h1>
  <p class="subtitle">Documentação Completa do Sistema</p>
  <div class="meta">
    Gerado em: ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}<br/>
    Versão: 1.0 &nbsp;|&nbsp; Plataforma: Web
  </div>
</div>

<!-- SUMÁRIO -->
<div class="toc">
  <h2>Sumário</h2>
  ${[
    ['1', 'Visão Geral do Sistema', 'Visão Geral'],
    ['2', 'Página Inicial', 'Pública'],
    ['3', 'Login e Cadastro', 'Pública'],
    ['4', 'Perfil do Cliente', 'Cliente'],
    ['5', 'Painel Administrativo', 'Admin'],
    ['6', 'Gerenciamento de Agendamentos', 'Admin'],
    ['7', 'Bloqueios de Agenda', 'Admin'],
    ['8', 'Gerenciamento de Serviços', 'Admin'],
    ['9', 'Gerenciamento de Categorias', 'Admin'],
    ['10', 'Gerenciamento de Preços', 'Admin'],
    ['11', 'Gerenciamento de Banner', 'Admin'],
    ['12', 'Gerenciamento de Rodapé', 'Admin'],
    ['13', 'Configurações do Site', 'Admin'],
    ['14', 'Clientes e Vendas', 'Admin'],
    ['15', 'Rotas da API', 'Técnico'],
  ].map(([num, label, type]) => `
    <div class="toc-item">
      <div class="toc-num">${num}</div>
      <div class="toc-label">${label}</div>
      <div class="toc-type">${type}</div>
    </div>
  `).join('')}
</div>

<!-- VISÃO GERAL -->
<div class="overview">
  <h2>1. Visão Geral do Sistema</h2>
  <p>
    O sistema é uma plataforma web completa de gestão para salões de beleza e estabelecimentos de estética.
    Desenvolvido com tecnologia moderna (Node.js + React + PostgreSQL), oferece uma experiência fluida
    tanto para os clientes que desejam agendar serviços quanto para os administradores que gerenciam o negócio.
  </p>
  <p>
    A plataforma possui três perfis de acesso: <strong>visitante</strong> (acesso à página pública),
    <strong>cliente</strong> (acesso à área de agendamentos e perfil) e
    <strong>administrador</strong> (acesso total ao painel de gestão).
  </p>
  <div class="feature-grid">
    <div class="feature-card">
      <h4>🗓️ Agendamento Online</h4>
      <p>Clientes agendam horários diretamente pelo site, com visualização em tempo real dos horários disponíveis.</p>
    </div>
    <div class="feature-card">
      <h4>🔒 Controle de Acesso</h4>
      <p>Sistema de login com perfis distintos (cliente e administrador), proteção de rotas e autenticação segura.</p>
    </div>
    <div class="feature-card">
      <h4>📱 Integração WhatsApp</h4>
      <p>Notificações automáticas via WhatsApp ao confirmar ou cancelar agendamentos.</p>
    </div>
    <div class="feature-card">
      <h4>📅 Bloqueio de Agenda</h4>
      <p>Administrador pode bloquear períodos (férias, feriados, atestados) impedindo novos agendamentos.</p>
    </div>
    <div class="feature-card">
      <h4>💰 Gestão de Vendas</h4>
      <p>Registro e histórico de vendas com acompanhamento do desempenho financeiro do negócio.</p>
    </div>
    <div class="feature-card">
      <h4>⭐ Avaliações</h4>
      <p>Clientes podem deixar avaliações com nota e comentários. Outras pessoas podem curtir e comentar.</p>
    </div>
    <div class="feature-card">
      <h4>🎨 Identidade Visual</h4>
      <p>Personalização completa: nome do site, logo, cor primária, banner, rodapé e conteúdo das páginas.</p>
    </div>
    <div class="feature-card">
      <h4>🗄️ Banco de Dados Permanente</h4>
      <p>PostgreSQL com todos os dados persistidos permanentemente, incluindo imagens em Base64.</p>
    </div>
  </div>
</div>

<!-- TELA 1: HOME -->
<div class="section">
  <h2>2. Página Inicial</h2>
  <span class="badge-type public">Acesso Público</span>
  <p class="desc">
    A página inicial é a vitrine do estabelecimento. Apresenta todas as informações públicas de forma atrativa,
    incentivando o cliente a agendar um serviço. O conteúdo é 100% configurável pelo administrador.
  </p>
  <ul>
    <li><strong>Banner principal:</strong> Imagem de fundo, título, subtítulo e botão de ação personalizáveis</li>
    <li><strong>Seção de serviços:</strong> Exibe os serviços em destaque com imagem, nome, descrição e preço</li>
    <li><strong>Tabela de preços:</strong> Lista completa de serviços organizada por categoria</li>
    <li><strong>Agendamento online:</strong> Formulário completo para clientes logados agendarem horários</li>
    <li><strong>Avaliações:</strong> Depoimentos de clientes com nota, curtidas e comentários</li>
    <li><strong>Rodapé:</strong> Endereço, telefone, WhatsApp, redes sociais e horário de funcionamento</li>
  </ul>
  ${screenshots.home ? imgTag(screenshots.home, 'Página Inicial') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 2: AUTH -->
<div class="section">
  <h2>3. Login e Cadastro</h2>
  <span class="badge-type public">Acesso Público</span>
  <p class="desc">
    Página unificada de autenticação com alternância entre os modos de login e cadastro.
    Necessária para que o cliente acesse o formulário de agendamento e sua área pessoal.
  </p>
  <ul>
    <li><strong>Login:</strong> Usuário e senha com validação e mensagens de erro claras</li>
    <li><strong>Cadastro:</strong> Nome, e-mail/usuário e senha com confirmação</li>
    <li><strong>Recuperação de senha:</strong> Envio de e-mail para redefinição via token seguro</li>
    <li><strong>Redirecionamento automático:</strong> Após login, o usuário retorna à página de origem</li>
  </ul>
  ${screenshots.auth ? imgTag(screenshots.auth, 'Tela de Login e Cadastro') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 3: PERFIL -->
<div class="section">
  <h2>4. Perfil do Cliente</h2>
  <span class="badge-type client">Área do Cliente</span>
  <p class="desc">
    Área pessoal do cliente onde pode visualizar seus dados e acompanhar todos os seus agendamentos.
    Acesso restrito — requer login.
  </p>
  <ul>
    <li><strong>Foto de perfil:</strong> Upload de imagem pessoal armazenada no banco de dados</li>
    <li><strong>Dados pessoais:</strong> Nome, e-mail e telefone cadastrados</li>
    <li><strong>Histórico de agendamentos:</strong> Lista de todos os agendamentos com status (Pendente, Confirmado, Concluído, Cancelado)</li>
    <li><strong>Detalhes do agendamento:</strong> Serviço, data, horário e observações de cada agendamento</li>
  </ul>
  ${screenshots.profile ? imgTag(screenshots.profile, 'Perfil do Cliente') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 4: DASHBOARD -->
<div class="section">
  <h2>5. Painel Administrativo</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Central de controle do administrador. Reúne as ferramentas mais utilizadas no dia a dia:
    gestão de usuários, agendamentos, bloqueios de agenda e vendas.
  </p>
  <ul>
    <li><strong>Gestão de usuários:</strong> Lista e gerencia os usuários cadastrados no sistema, podendo promover a administrador</li>
    <li><strong>Agendamentos:</strong> Visualiza todos os agendamentos com filtros de status; confirma, cancela, conclui ou reativa</li>
    <li><strong>Notificação WhatsApp:</strong> Ao confirmar ou cancelar, a mensagem é copiada automaticamente para colar no WhatsApp do cliente</li>
    <li><strong>Bloqueios de agenda:</strong> Cria períodos bloqueados (férias, atestados, feriados) que impedem novos agendamentos</li>
    <li><strong>Registro de vendas:</strong> Lança vendas com cliente, serviço e valor</li>
    <li><strong>Histórico de vendas:</strong> Visualiza e filtra todas as vendas realizadas</li>
  </ul>
  ${screenshots.dashboard ? imgTag(screenshots.dashboard, 'Painel Administrativo') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 5: SERVIÇOS -->
<div class="section">
  <h2>6. Gerenciamento de Agendamentos</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Tabela completa de todos os agendamentos realizados pelos clientes, com filtros por status e
    ações rápidas de gerenciamento. Localizada dentro do Painel Administrativo.
  </p>
  <ul>
    <li><strong>Filtro por status:</strong> Todos, Pendentes, Confirmados, Concluídos ou Cancelados</li>
    <li><strong>Informações do cliente:</strong> Nome, telefone e e-mail em cada linha</li>
    <li><strong>Ações disponíveis:</strong> Confirmar, Cancelar, Concluir, Reativar (dependendo do status atual)</li>
    <li><strong>Notificação automática:</strong> Ao confirmar ou cancelar, a mensagem para o cliente é copiada para a área de transferência</li>
    <li><strong>Validação em tempo real:</strong> Agendamentos em datas bloqueadas são automaticamente rejeitados</li>
  </ul>
</div>

<!-- TELA 6: BLOQUEIOS -->
<div class="section">
  <h2>7. Bloqueios de Agenda</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Funcionalidade para o administrador bloquear períodos específicos da agenda, impedindo que
    clientes façam agendamentos nesses dias. Ideal para férias, feriados, viagens e afastamentos.
  </p>
  <ul>
    <li><strong>Criação de bloqueio:</strong> Data de início, data de fim, motivo e descrição opcional</li>
    <li><strong>Motivos rápidos:</strong> Férias, Atestado médico, Viagem, Feriado ou motivo personalizado</li>
    <li><strong>Status visual:</strong> Cada bloqueio mostra se está Ativo, Futuro ou Expirado</li>
    <li><strong>Efeito para o cliente:</strong> Ao selecionar uma data bloqueada, vê "🚫 Data indisponível" com o motivo</li>
    <li><strong>Proteção dupla:</strong> Bloqueio verificado tanto no frontend quanto no servidor</li>
    <li><strong>Remoção:</strong> Qualquer bloqueio pode ser removido pelo administrador a qualquer momento</li>
  </ul>
</div>

<!-- TELA 7: SERVIÇOS ADM -->
<div class="section">
  <h2>8. Gerenciamento de Serviços</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Cadastro completo dos serviços oferecidos pelo estabelecimento, com controle de destaque
    na página inicial e upload de imagens.
  </p>
  <ul>
    <li><strong>Cadastro:</strong> Nome, descrição, categoria, preço e imagem do serviço</li>
    <li><strong>Destaque:</strong> Marcar serviços como "em destaque" para exibição na página inicial</li>
    <li><strong>Imagem:</strong> Upload de foto ilustrativa armazenada permanentemente no banco de dados</li>
    <li><strong>Edição e exclusão:</strong> Atualização de qualquer campo ou remoção do serviço</li>
    <li><strong>Organização por categoria:</strong> Cada serviço pertence a uma categoria</li>
  </ul>
  ${screenshots.services ? imgTag(screenshots.services, 'Gerenciamento de Serviços') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 8: CATEGORIAS -->
<div class="section">
  <h2>9. Gerenciamento de Categorias</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Organização dos serviços em grupos temáticos. As categorias são usadas tanto no formulário
    de agendamento quanto na tabela de preços da página inicial.
  </p>
  <ul>
    <li><strong>Criação:</strong> Nome e ícone da categoria (biblioteca de ícones disponível)</li>
    <li><strong>Hierarquia:</strong> Serviços são vinculados às categorias criadas aqui</li>
    <li><strong>Uso no agendamento:</strong> Cliente seleciona categoria antes de escolher o serviço</li>
    <li><strong>Edição e exclusão:</strong> Gerenciamento completo das categorias cadastradas</li>
  </ul>
  ${screenshots.categories ? imgTag(screenshots.categories, 'Gerenciamento de Categorias') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 9: PREÇOS -->
<div class="section">
  <h2>10. Gerenciamento de Preços</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Controle granular dos itens exibidos na tabela de preços da página inicial.
    Permite cadastrar itens específicos com descrições e faixas de preço.
  </p>
  <ul>
    <li><strong>Itens de preço:</strong> Cada item tem nome, descrição, preço mínimo e máximo</li>
    <li><strong>Vinculação por categoria:</strong> Itens são organizados dentro de suas categorias</li>
    <li><strong>Exibição na página:</strong> Aparece na seção "Tabela de Preços" da página inicial</li>
    <li><strong>Edição e exclusão:</strong> Gerenciamento completo dos itens cadastrados</li>
  </ul>
  ${screenshots.prices ? imgTag(screenshots.prices, 'Gerenciamento de Preços') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 10: BANNER -->
<div class="section">
  <h2>11. Gerenciamento de Banner</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Personalização da seção hero (banner principal) exibida no topo da página inicial.
    Permite adaptar o visual do site sem necessidade de programação.
  </p>
  <ul>
    <li><strong>Título principal:</strong> Texto de destaque no banner</li>
    <li><strong>Subtítulo:</strong> Texto complementar abaixo do título</li>
    <li><strong>Botão de ação:</strong> Texto e link do botão principal (Call to Action)</li>
    <li><strong>Imagem de fundo:</strong> Upload da imagem que aparece como fundo do banner</li>
    <li><strong>Visualização:</strong> Alterações refletem imediatamente na página inicial</li>
  </ul>
  ${screenshots.banner ? imgTag(screenshots.banner, 'Gerenciamento de Banner') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 11: RODAPÉ -->
<div class="section">
  <h2>12. Gerenciamento de Rodapé</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Edição das informações de contato e redes sociais exibidas no rodapé de todas as páginas do site.
  </p>
  <ul>
    <li><strong>Endereço:</strong> Endereço completo do estabelecimento</li>
    <li><strong>Telefone e WhatsApp:</strong> Número de contato (usado também nas notificações)</li>
    <li><strong>Horário de funcionamento:</strong> Descrição do horário de atendimento</li>
    <li><strong>Redes sociais:</strong> Links para Facebook, Instagram, TikTok e YouTube</li>
    <li><strong>E-mail:</strong> E-mail de contato do estabelecimento</li>
  </ul>
  ${screenshots.footer ? imgTag(screenshots.footer, 'Gerenciamento de Rodapé') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 12: SITE CONFIG -->
<div class="section">
  <h2>13. Configurações do Site</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Configurações globais da identidade visual e branding do site. Permite personalizar
    o nome, logo e cor primária aplicada em todo o sistema.
  </p>
  <ul>
    <li><strong>Nome do site:</strong> Nome exibido na aba do navegador e no cabeçalho</li>
    <li><strong>Slogan:</strong> Frase curta que aparece abaixo do nome no topo</li>
    <li><strong>Logo:</strong> Upload da logomarca (armazenada em banco de dados — permanente)</li>
    <li><strong>Cor primária:</strong> Cor usada em botões, destaques e elementos da interface</li>
    <li><strong>Aplicação imediata:</strong> Alterações de cor são aplicadas instantaneamente em todo o site</li>
  </ul>
  ${screenshots.siteConfig ? imgTag(screenshots.siteConfig, 'Configurações do Site') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- TELA 13: CLIENTES E VENDAS -->
<div class="section">
  <h2>14. Clientes e Vendas</h2>
  <span class="badge-type admin">Acesso Admin</span>
  <p class="desc">
    Página dedicada ao gerenciamento financeiro e da base de clientes do estabelecimento.
    Interface com abas para alternar entre a lista de clientes e o módulo de vendas.
  </p>
  <ul>
    <li><strong>Lista de clientes:</strong> Busca e visualização de todos os clientes cadastrados</li>
    <li><strong>Dados do cliente:</strong> Nome, telefone, e-mail e data de cadastro</li>
    <li><strong>Registro de vendas:</strong> Lançamento de vendas avulsas com serviço, cliente e valor</li>
    <li><strong>Histórico de vendas:</strong> Filtros por período e exportação de dados</li>
    <li><strong>Acompanhamento financeiro:</strong> Total de vendas por período</li>
  </ul>
  ${screenshots.clientsSales ? imgTag(screenshots.clientsSales, 'Clientes e Vendas') : '<p style="color:#9ca3af;font-style:italic;">Screenshot não disponível</p>'}
</div>

<!-- ROTAS DA API -->
<div class="section">
  <h2>15. Rotas da API</h2>
  <span class="badge-type">Referência Técnica</span>
  <p class="desc">Principais endpoints REST disponíveis no backend do sistema.</p>
  
  <table class="api-table">
    <thead>
      <tr><th>Método</th><th>Rota</th><th>Descrição</th><th>Acesso</th></tr>
    </thead>
    <tbody>
      <tr><td><span class="method get">GET</span></td><td>/api/user</td><td>Retorna usuário autenticado</td><td>Autenticado</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/register</td><td>Cadastro de novo usuário</td><td>Público</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/login</td><td>Login de usuário</td><td>Público</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/logout</td><td>Logout da sessão</td><td>Autenticado</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/appointments</td><td>Lista todos os agendamentos</td><td>Admin</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/appointments</td><td>Cria novo agendamento</td><td>Autenticado</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/appointments/available-times/:date</td><td>Horários disponíveis em uma data</td><td>Público</td></tr>
      <tr><td><span class="method patch">PATCH</span></td><td>/api/appointments/:id/status</td><td>Atualiza status do agendamento</td><td>Admin</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/my-appointments</td><td>Agendamentos do cliente logado</td><td>Autenticado</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/schedule-blocks</td><td>Lista bloqueios de agenda</td><td>Público</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/schedule-blocks</td><td>Cria bloqueio de agenda</td><td>Admin</td></tr>
      <tr><td><span class="method delete">DELETE</span></td><td>/api/schedule-blocks/:id</td><td>Remove bloqueio de agenda</td><td>Admin</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/categories</td><td>Lista categorias</td><td>Público</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/categories</td><td>Cria categoria</td><td>Admin</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/services/:categoryId</td><td>Lista serviços por categoria</td><td>Público</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/services</td><td>Cria serviço</td><td>Admin</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/reviews</td><td>Lista avaliações</td><td>Público</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/reviews</td><td>Cria avaliação</td><td>Autenticado</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/sales</td><td>Lista vendas</td><td>Admin</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/sales</td><td>Registra venda</td><td>Admin</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/site-config</td><td>Configurações do site</td><td>Público</td></tr>
      <tr><td><span class="method post">POST</span></td><td>/api/site-config/upload-logo</td><td>Faz upload da logo</td><td>Admin</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/banner</td><td>Dados do banner</td><td>Público</td></tr>
      <tr><td><span class="method get">GET</span></td><td>/api/footer</td><td>Dados do rodapé</td><td>Público</td></tr>
    </tbody>
  </table>
</div>

<div class="footer-doc">
  Documentação gerada automaticamente em ${new Date().toLocaleDateString('pt-BR')} &nbsp;|&nbsp; Sistema de Gestão de Agendamentos v1.0
</div>

</body>
</html>`;

  // Gera PDF usando puppeteer
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const outputPath = path.join(__dirname, '..', 'documentacao-sistema.pdf');
  await pdfPage.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });

  await browser.close();

  console.log(`\n✅ PDF gerado com sucesso: ${outputPath}`);
  const stats = fs.statSync(outputPath);
  console.log(`📄 Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
