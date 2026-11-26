// v113: scatti del logo nel gioco vero. Uso: node tools/logo113/guarda.cjs <cartella-uscita>
// caricamento + lobby a 1280x720 e su telefono emulato (844x390, tocco), piu' la schermata "SI PARTE".
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const out = process.argv[2] || 'screen/logo113';
fs.mkdirSync(out, { recursive: true });
const url = 'file:///' + path.join(__dirname, '..', '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  for (const [nome, opz] of [['pc', { viewport: { width: 1280, height: 720 } }],
    ['telefono', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]]) {
    const ctx = await browser.newContext(opz);
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log(nome, 'ERRORE', e.message));
    await page.goto(url, { waitUntil: 'commit' });
    await page.waitForSelector('#loading91 .logoImg');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, nome + '-caricamento.png') });
    await page.waitForFunction(() => { const l = document.getElementById('loading91'); return !l || getComputedStyle(l).display === 'none' || l.classList.contains('hidden') || +getComputedStyle(l).opacity === 0; }, null, { timeout: 90000 });
    await page.evaluate(() => { const b = document.getElementById('benvenuto111'); if (b) b.remove(); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, nome + '-lobby.png') });
    const r = await page.evaluate(() => { const e = document.querySelector('.topbar .logoImg').getBoundingClientRect(); return [e.x, e.y, e.width, e.height].map(Math.round); });
    console.log(nome, 'logo nella barra', r.join(','));
    if (nome === 'pc') {
      await page.evaluate(() => document.getElementById('matchLoad102').classList.add('on'));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(out, 'pc-sipartie.png') });
    }
    await ctx.close();
  }
  await browser.close();
})();
