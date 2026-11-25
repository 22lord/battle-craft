// Uso: node tools/browser/esegui.cjs <script.js> [url]
// Carica il gioco in Edge headless (caso fissato, mondo pronto) ed esegue lo script nella pagina:
// il corpo riceve G (il gioco) e THREE se esposto; quello che ritorna viene stampato in JSON.
const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
  const code = fs.readFileSync(process.argv[2], 'utf8'), url = process.argv[3] || 'http://127.0.0.1:8123/index.html';
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => { let s = 1234567; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url, { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.world.chunks, null, { timeout: 180000 });
  const r = await page.evaluate((code) => (new Function('G', code))(window.__game), code);
  console.log(JSON.stringify(r, null, 1));
  if (errs.length) console.log('ERRORI:', errs.slice(0, 10));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
