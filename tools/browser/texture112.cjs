// v112: foglio delle texture generate (colore | normal | rugosita') per ogni materiale, in una sola immagine.
// Uso: node tools/browser/texture112.cjs <out.png> [url]
const { chromium } = require('playwright-core');
(async () => {
  const out = process.argv[2], url = process.argv[3] || 'http://127.0.0.1:8123/index.html';
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await page.goto(url, { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.world.chunks, null, { timeout: 180000 });
  const r = await page.evaluate(() => {
    const M = window.MAT112; if (!M.pronto) return { pronto: false };
    const o = { ms: M.ms, msMondo: M.msMondo, coppie: M.coppie.length, img: {} };
    const url = (t) => { if (!t) return null; const w = t.image.width, c2 = document.createElement('canvas'); c2.width = c2.height = w; c2.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(t.image.data), w, w), 0, 0);
      const c = document.createElement('canvas'); c.width = c.height = 300; const x = c.getContext('2d'); x.translate(0, 300); x.scale(1, -1); x.drawImage(c2, 0, 0, 300, 300); return c.toDataURL('image/png'); };
    for (const k in M.tex) o.img[k] = [url(M.tex[k].a), url(M.tex[k].n), url(M.tex[k].o)];
    return o;
  });
  console.log('pronto', r.pronto !== false, 'ms texture', r.ms, 'ms mondo', r.msMondo, 'coppie', r.coppie);
  if (r.img) {
    const p2 = await browser.newPage({ viewport: { width: 1920, height: 100 } });
    const righe = Object.entries(r.img).map(([k, v]) => `<div style="display:flex;gap:6px;align-items:center;margin:4px"><div style="width:90px;font:14px sans-serif;color:#fff">${k}</div>${v.map((u) => u ? `<img src="${u}" width="300" height="300">` : '<div style="width:300px"></div>').join('')}</div>`).join('');
    await p2.setContent(`<body style="margin:0;background:#222;display:grid;grid-template-columns:1fr 1fr">${righe}</body>`);
    await p2.screenshot({ path: out, fullPage: true });
  }
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 20).join('\n') : 'nessun errore');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
