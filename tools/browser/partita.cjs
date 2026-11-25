// Uso: node partita.cjs <out-dir> — clicca Gioca e scatta durante il lancio
const { chromium } = require('playwright-core'); const path = require('path');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await page.addInitScript(() => { try { localStorage.setItem('battlecraft_benvenuto111', '1'); } catch (e) { } });   // v111: niente finestra del nome, copre i pulsanti
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  await page.goto('http://localhost:8123/index.html', { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world, null, { timeout: 180000 });
  await page.waitForTimeout(2000);
  await page.click('#btnPlay');
  const t0 = Date.now(); const shots = [2, 6, 12, 20, 32, 45];
  for (const s of shots) {
    await page.waitForTimeout(Math.max(0, s * 1000 - (Date.now() - t0)));
    // durante la caduta: tieni premuto avanti
    if (s === 20) await page.keyboard.down('KeyW');
    if (s === 32) await page.keyboard.up('KeyW');
    const st = await page.evaluate(() => { const G = window.__game, p = G.player; return { state: G.state, fps: G.hud && G.hud.fps, pos: p ? [p.pos.x, p.pos.y, p.pos.z].map((v) => +v.toFixed(1)) : null, air: p ? !!p.air88 : null, alive: G.chars ? G.chars.filter((c) => c.alive).length : 0 }; });
    console.log(s + 's', JSON.stringify(st));
    await page.screenshot({ path: path.join(out, 'p_' + String(s).padStart(2, '0') + '.png') });
    if (s === 6) { await page.keyboard.press('Space'); }   // salta dal bus
  }
  console.log(errs.slice(0, 25).join('\n') || 'nessun errore');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
