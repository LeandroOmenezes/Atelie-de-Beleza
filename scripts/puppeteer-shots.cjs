const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROMIUM = '/nix/store/zvpmjmxyjdkjs0rnby54xhwjkp7fj2ff-ungoogled-chromium-114.0.5735.90/bin/chromium';
const BASE = 'http://localhost:5000';
const OUT  = path.join(__dirname, '..', 'generated', 'screens');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const delay = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  page.on('requestfailed', () => {});
  page.on('pageerror', () => {});

  async function shot(filename) {
    await delay(1200);
    await page.screenshot({ path: path.join(OUT, filename) });
    console.log('📸', filename);
  }

  async function clickText(text) {
    await page.evaluate((t) => {
      const all = [...document.querySelectorAll('button, a, li, [role="tab"], span')];
      const el = all.find(e => e.textContent.trim() === t || e.textContent.trim().startsWith(t));
      if (el) el.click();
    }, text);
    await delay(1000);
  }

  // ── LANDING ────────────────────────────────────────────────────────────────
  console.log('Loading landing page...');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await delay(2000);
  await shot('p01_hero.jpg');

  // Scroll to services
  await page.evaluate(() => { const el = document.querySelector('[id*="servic"], section:nth-of-type(2)'); if(el) el.scrollIntoView(); else window.scrollBy(0,700); });
  await shot('p02_services.jpg');

  // Scroll to precos
  await page.evaluate(() => { const el = document.querySelector('[id*="preco"], [id*="price"]'); if(el) el.scrollIntoView(); else window.scrollBy(0,700); });
  await shot('p03_pricing.jpg');

  // Scroll to booking
  await page.evaluate(() => { const el = document.querySelector('[id*="agendament"], [id*="booking"]'); if(el) el.scrollIntoView(); else window.scrollBy(0,700); });
  await shot('p04_booking.jpg');

  // Scroll to reviews
  await page.evaluate(() => { const el = document.querySelector('[id*="avaliac"], [id*="review"]'); if(el) el.scrollIntoView(); else window.scrollBy(0,700); });
  await shot('p05_reviews.jpg');

  // Footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await shot('p06_footer.jpg');

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  await page.goto(BASE + '/auth', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await delay(1500);
  await shot('p07_login.jpg');

  // Fill credentials
  const emailSel = 'input[type="email"], input[name="username"]';
  await page.waitForSelector(emailSel, { timeout: 5000 });
  await page.click(emailSel);
  await page.type(emailSel, 'lleandro.m32@gmail.com');
  await page.type('input[type="password"]', 'admin');
  await shot('p07b_login_filled.jpg');
  await page.keyboard.press('Enter');
  await delay(2500);

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  await shot('p08_dashboard.jpg');
  console.log('Dashboard URL:', page.url());

  // Aba Agendamentos
  await clickText('Agendamentos');
  await shot('p09_appointments.jpg');

  // Aba Profissionais
  await clickText('Profissionais');
  await shot('p10_professionals.jpg');

  // Aba Bloqueios
  await clickText('Bloqueios de Agenda');
  await shot('p11_blocks.jpg');

  // Aba Vendas
  await clickText('Gestão de Vendas');
  await shot('p12_sales.jpg');

  // Aba Clientes
  await clickText('Clientes');
  await shot('p13_clients.jpg');

  // Aba Usuários
  await clickText('Usuários do Sistema');
  await shot('p14_users.jpg');

  await browser.close();
  console.log('\n✅ Concluído! Screenshots em:', OUT);
}

run().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
