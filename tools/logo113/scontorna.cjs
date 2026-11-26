// v113: scontorna il logo (fondo verde) e lo esporta in PNG/WebP trasparente.
// Uso: node tools/logo113/scontorna.cjs <logo.jpg> <cartella-uscita> [larghezza=960]
// Lavora in Edge headless (niente Python sul PC di Lorenzo, trappola 17).
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');

const [src, outDir, larg = '960'] = process.argv.slice(2);
if (!src || !outDir) { console.log('uso: node scontorna.cjs <logo.jpg> <uscita> [larghezza]'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
const dataUrl = 'data:image/jpeg;base64,' + fs.readFileSync(src).toString('base64');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage();
  const r = await page.evaluate(async ({ dataUrl, W }) => {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, w, h), p = d.data;
    // colore del fondo: mediana di quattro riquadri negli angoli
    const camp = [[], [], []];
    for (const [ox, oy] of [[0, 0], [w - 60, 0], [0, h - 60], [w - 60, h - 60]])
      for (let j = oy; j < oy + 60; j += 3) for (let i = ox; i < ox + 60; i += 3) { const k = (j * w + i) * 4; for (let q = 0; q < 3; q++) camp[q].push(p[k + q]); }
    const bg = camp.map(a => a.sort((m, n) => m - n)[a.length >> 1]);
    const bgS = bg[1] - Math.max(bg[0], bg[2]);           // quanto e' "verde" il fondo
    const lo = 6, hi = bgS * 0.72;                        // sotto lo: opaco, sopra hi: trasparente
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let k = 0, n = 0; k < p.length; k += 4, n++) {
      const R = p[k], G = p[k + 1], B = p[k + 2];
      const s = G - Math.max(R, B);
      let a = s <= lo ? 1 : s >= hi ? 0 : 1 - (s - lo) / (hi - lo);
      if (a > 0 && a < 1) {                               // bordo: togli il fondo mescolato
        for (let q = 0; q < 3; q++) p[k + q] = Math.max(0, Math.min(255, (p[k + q] - bg[q] * (1 - a)) / a));
      }
      if (a > 0) {                                        // niente alone verde
        const m = Math.max(p[k], p[k + 2]); if (p[k + 1] > m) p[k + 1] = m;
      }
      p[k + 3] = Math.round(a * 255);
      if (a > 0.1) { const i = n % w, j = (n / w) | 0; if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    }
    x.putImageData(d, 0, 0);
    const mg = 12; x0 = Math.max(0, x0 - mg); y0 = Math.max(0, y0 - mg); x1 = Math.min(w - 1, x1 + mg); y1 = Math.min(h - 1, y1 + mg);
    const cw = x1 - x0 + 1, chh = y1 - y0 + 1;
    const full = document.createElement('canvas'); full.width = cw; full.height = chh;
    full.getContext('2d').drawImage(c, x0, y0, cw, chh, 0, 0, cw, chh);
    // riduzione a meta' successive (piu' nitida di un salto solo)
    let cur = full; const H = Math.round(chh * W / cw);
    while (cur.width / 2 >= W) { const t = document.createElement('canvas'); t.width = cur.width >> 1; t.height = cur.height >> 1; const tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(cur, 0, 0, t.width, t.height); cur = t; }
    const small = document.createElement('canvas'); small.width = W; small.height = H;
    const sx = small.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(cur, 0, 0, W, H);
    // anteprime: sul fondo del caricamento e sulla barra della lobby
    const prev = document.createElement('canvas'); prev.width = W + 80; prev.height = H + 200;
    const px = prev.getContext('2d');
    const gr = px.createRadialGradient(prev.width / 2, prev.height * .35, 0, prev.width / 2, prev.height * .35, prev.width * .7);
    gr.addColorStop(0, '#1c5681'); gr.addColorStop(.42, '#102b50'); gr.addColorStop(1, '#071225');
    px.fillStyle = gr; px.fillRect(0, 0, prev.width, H + 120); px.drawImage(small, 40, 40);
    px.fillStyle = '#0a1e46'; px.fillRect(0, H + 120, prev.width, 80);
    const th = 52, tw = Math.round(W * th / H); px.drawImage(small, 26, H + 134, tw, th);
    return {
      w, h, bg, bgS, crop: [x0, y0, cw, chh], out: [W, H],
      full: full.toDataURL('image/png'), png: small.toDataURL('image/png'),
      webp: small.toDataURL('image/webp', 0.9), prev: prev.toDataURL('image/png')
    };
  }, { dataUrl, W: +larg });
  const salva = (nome, du) => { const b = Buffer.from(du.split(',')[1], 'base64'); fs.writeFileSync(path.join(outDir, nome), b); return b.length; };
  console.log('immagine', r.w + 'x' + r.h, 'fondo', r.bg.join(','), 'verde', r.bgS, 'ritaglio', r.crop.join(','), 'uscita', r.out.join('x'));
  console.log('logo-pieno.png', salva('logo-pieno.png', r.full), 'B');
  console.log('logo.png', salva('logo.png', r.png), 'B');
  console.log('logo.webp', salva('logo.webp', r.webp), 'B');
  salva('anteprima.png', r.prev);
  await browser.close();
})();
