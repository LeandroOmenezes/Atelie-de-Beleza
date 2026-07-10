const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROMIUM = '/nix/store/zvpmjmxyjdkjs0rnby54xhwjkp7fj2ff-ungoogled-chromium-114.0.5735.90/bin/chromium';
const BASE = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const OUT  = path.join(__dirname, '..', 'generated', 'screens');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function shot(page, file, selector) {
  const dest = path.join(OUT, file);
  if (selector) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
    } catch (e) {}
  }
  await page.screenshot({ path: dest, fullPage: false });
  console.log('📸', file);
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });
  const page = await browser.newPage();

  // ── 1. LANDING PAGE ────────────────────────────────────────────────────────
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await delay(1000);
  await shot(page, 's01_landing.jpg');

  // Scroll para serviços
  await page.evaluate(() => window.scrollTo(0, 600));
  await delay(600);
  await shot(page, 's02_services.jpg');

  // Scroll para preços
  await page.evaluate(() => {
    const el = document.querySelector('#precos') || document.querySelector('[id*="preco"]') || document.querySelector('[id*="price"]');
    if (el) el.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo(0, 1400);
  });
  await delay(600);
  await shot(page, 's03_pricing.jpg');

  // Scroll para agendamentos
  await page.evaluate(() => {
    const el = document.querySelector('#agendamentos') || document.querySelector('[id*="agendament"]') || document.querySelector('[id*="booking"]');
    if (el) el.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo(0, 2400);
  });
  await delay(600);
  await shot(page, 's04_booking.jpg');

  // Scroll para avaliações
  await page.evaluate(() => {
    const el = document.querySelector('#avaliacoes') || document.querySelector('[id*="avaliac"]') || document.querySelector('[id*="review"]');
    if (el) el.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo(0, 3400);
  });
  await delay(600);
  await shot(page, 's05_reviews.jpg');

  // Footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await delay(600);
  await shot(page, 's06_footer.jpg');

  // ── 2. LOGIN ───────────────────────────────────────────────────────────────
  await page.goto(BASE + '/auth', { waitUntil: 'networkidle0' });
  await delay(800);
  await shot(page, 's07_login.jpg');

  // Faz login
  await page.waitForSelector('input[type="email"], input[name="username"], input[placeholder*="mail"]', { timeout: 5000 });
  const emailInput = await page.$('input[type="email"]') || await page.$('input[name="username"]') || await page.$('input[placeholder*="mail"]');
  if (emailInput) await emailInput.type('lleandro.m32@gmail.com');

  const pwInput = await page.$('input[type="password"]');
  if (pwInput) await pwInput.type('admin');

  await page.keyboard.press('Enter');
  await delay(2000);

  // ── 3. DASHBOARD ───────────────────────────────────────────────────────────
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle0' });
  await delay(1500);
  await shot(page, 's08_dashboard.jpg');

  // Clica aba Agendamentos
  await clickTab(page, ['Agendamentos']);
  await shot(page, 's09_appointments.jpg');

  // Clica aba Profissionais
  await clickTab(page, ['Profissionais']);
  await shot(page, 's10_professionals.jpg');

  // Clica aba Bloqueios de Agenda
  await clickTab(page, ['Bloqueios', 'Bloqueio']);
  await shot(page, 's11_blocks.jpg');

  // Clica aba Gestão de Vendas
  await clickTab(page, ['Gestão de Vendas', 'Vendas']);
  await shot(page, 's12_sales.jpg');

  // Clica aba Clientes
  await clickTab(page, ['Clientes']);
  await shot(page, 's13_clients.jpg');

  // Clica aba Usuários do Sistema
  await clickTab(page, ['Usuários', 'Usuarios']);
  await shot(page, 's14_users.jpg');

  // Configurações (ícone engrenagem)
  await page.goto(BASE + '/admin/settings', { waitUntil: 'networkidle0' });
  await delay(1000);
  await shot(page, 's15_settings.jpg');

  await browser.close();
  console.log('\n✅ Todos os screenshots capturados em:', OUT);
})();

async function clickTab(page, labels) {
  for (const label of labels) {
    try {
      const found = await page.evaluate((text) => {
        const els = [...document.querySelectorAll('button, a, li, [role="tab"]')];
        const el = els.find(e => e.textContent.trim().toLowerCase().includes(text.toLowerCase()));
        if (el) { el.click(); return true; }
        return false;
      }, label);
      if (found) {
        await page.waitForTimeout ? await page.waitForTimeout(1000) : await new Promise(r => setTimeout(r, 1000));
        return;
      }
    } catch(e) {}
  }
  await new Promise(r => setTimeout(r, 800));
}
