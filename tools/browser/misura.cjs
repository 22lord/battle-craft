// Uso: node tools/browser/misura.cjs <img.png> x y w h [img2.png ...]
// Mediana e 90° percentile di R, G, B e della luminanza (0-255) in un riquadro. Per confrontare
// lo stesso punto fra PRIMA e DOPO (pelle, muri, cielo). Decodifica il PNG con Edge (canvas 2D).
const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
  const a = process.argv.slice(2); const [x, y, w, h] = a.slice(1, 5).map(Number); const files = [a[0], ...a.slice(5)];
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage();
  for (const f of files) {
    const r = await page.evaluate(async ([src, x, y, w, h]) => {
      const img = new Image(); img.src = src; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(x, y, w, h).data; const ch = [[], [], [], []];
      for (let i = 0; i < d.length; i += 4) { ch[0].push(d[i]); ch[1].push(d[i + 1]); ch[2].push(d[i + 2]); ch[3].push(Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])); }
      const q = (v, p) => { v.sort((a, b) => a - b); return v[Math.floor((v.length - 1) * p)]; };
      return ch.map((v) => q(v.slice(), 0.5) + '/' + q(v.slice(), 0.9));
    }, ['data:image/png;base64,' + fs.readFileSync(f).toString('base64'), x, y, w, h]);
    console.log(f.split(/[\\/]/).slice(-2).join('/'), ' R', r[0], ' G', r[1], ' B', r[2], ' L', r[3], '  (mediana/90%)');
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
