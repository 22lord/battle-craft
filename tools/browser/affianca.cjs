// Uso: node tools/browser/affianca.cjs <uscita.png> <colonne> <img1> [img2 ...] [--etichette "A|B|..."]
// Mette le immagini in una griglia (con etichetta sopra ognuna) e salva un PNG. Serve per i
// confronti PRIMA | DOPO delle fasi grafiche. Usa Edge solo come impaginatore (niente WebGL).
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
(async () => {
  const args = process.argv.slice(2); let et = null; const i = args.indexOf('--etichette'); if (i >= 0) { et = args[i + 1].split('|'); args.splice(i, 2); }
  const [out, colS, ...imgs] = args; const col = +colS || 2;
  const w = 1280, h = 720, sc = imgs.length > 2 ? 0.5 : 0.75; const cw = Math.round(w * sc), ch = Math.round(h * sc);
  const cells = imgs.map((p, k) => `<div class="c"><div class="t">${et ? et[k] || '' : path.basename(p, '.png')}</div><img src="data:image/png;base64,${fs.readFileSync(p).toString('base64')}"></div>`).join('');
  const html = `<html><body style="margin:0;background:#111;font:600 18px system-ui;color:#fff"><div style="display:grid;grid-template-columns:repeat(${col},${cw}px);gap:6px;padding:6px">${cells}</div>
  <style>.c img{width:${cw}px;height:${ch}px;display:block}.t{padding:4px 2px}</style></body></html>`;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: col * (cw + 6) + 6, height: 200 } });
  await page.setContent(html); await page.screenshot({ path: out, fullPage: true }); await browser.close(); console.log('salvato', out);
})().catch((e) => { console.error(e); process.exit(1); });
