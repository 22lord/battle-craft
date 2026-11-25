// Uso: node tools/browser/benvenuto111.cjs <uscita-dir>
// v111: finestra del nome alla prima apertura (profilo nuovo), memoria dopo il ricaricamento,
// sparo automatico in partita con un bot davanti, finestra su telefono emulato.
const { chromium, devices } = require('playwright-core'); const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
(async () => {
  const out = process.argv[2]; const URL = 'http://localhost:8123/index.html';
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  const pronto = () => page.waitForFunction(() => window.__game && window.__game.lobbyCam && !document.getElementById('loading91'), null, { timeout: 180000 });
  await page.goto(URL, { timeout: 180000 }); await pronto(); await page.waitForTimeout(800);
  const c1 = await page.evaluate(() => !!document.getElementById('benvenuto111'));
  console.log('1a apertura: finestra presente =', c1);
  await page.screenshot({ path: path.join(out, 'benvenuto_pc.png') });
  await page.fill('#benvNome111', 'Lorenzo'); await page.keyboard.press('KeyW'); // un tasto del gioco dentro il campo: deve finire nel nome
  await page.check('#benvSparo111'); await page.click('#benvOk111'); await page.waitForTimeout(300);
  console.log('dopo Inizia:', JSON.stringify(await page.evaluate(() => ({ finestra: !!document.getElementById('benvenuto111'), nome: window.__game.playerName, sparo: window.__game.sparoAuto111, casella: document.getElementById('sparoSel111').checked }))));
  await page.reload({ timeout: 180000 }); await pronto(); await page.waitForTimeout(800);
  console.log('ricaricato:', JSON.stringify(await page.evaluate(() => ({ finestra: !!document.getElementById('benvenuto111'), nome: window.__game.playerName, sparo: window.__game.sparoAuto111, campo: document.getElementById('nameSel').value }))));
  // partita: bot fermo davanti, mirino sul petto, nessun clic
  const r = await page.evaluate(async () => {
    const G = window.__game; G._skipLock102 = true; G.startMatch(); G._skipLock102 = false; G.drop88.clear(); G.drop88.elapsed = 999;
    const p = G.player, b = G.bots[0]; for (const o of G.bots) if (o !== b) { o.alive = false; o.model.group.visible = false; } b.brain = null; b.hp = 1e6; b.shield = 0;
    const at = (ch, x, z) => { ch.pos.set(x, G.physics.supportHeight(x, z, 60), z); ch.vel.set(0, 0, 0); ch.onGround = true; };
    at(b, -60, -8); at(p, -60, -16); b.yaw = Math.PI; p.selectWeapon('ar'); G.cam.yaw = 0; G.cam.pitch = 0;
    await new Promise((f) => setTimeout(f, 1200));
    const m0 = p.cur109().mag; const t0 = performance.now();
    const giu = () => { const h = new (G.camera.position.constructor)(); b.model.head.getWorldPosition(h); const d = h.y - 0.35 - (G.cam.pos.y); const dist = Math.hypot(b.pos.x - G.cam.pos.x, b.pos.z - G.cam.pos.z); G.cam.pitch = Math.atan2(d, dist); G.cam.yaw = Math.atan2(b.pos.x - G.cam.pos.x, b.pos.z - G.cam.pos.z); };
    while (performance.now() - t0 < 1500) { giu(); await new Promise((f) => requestAnimationFrame(f)); }
    const conSparo = m0 - p.cur109().mag;
    G.impostaSparo111(false); const m1 = p.cur109().mag; const t1 = performance.now(); while (performance.now() - t1 < 1000) { giu(); await new Promise((f) => requestAnimationFrame(f)); }
    return { colpiInAutomatico: conSparo, colpiASpento: m1 - p.cur109().mag };
  });
  console.log('partita:', JSON.stringify(r));
  await page.evaluate(() => window.__game.impostaSparo111(true));
  await page.screenshot({ path: path.join(out, 'sparo_auto.png') });
  // telefono: profilo nuovo
  const tel = await browser.newContext({ ...devices['iPhone 13 landscape'], userAgent: undefined });
  const tp = await tel.newPage(); await tp.goto(URL, { timeout: 180000 }); await tp.waitForFunction(() => window.__game && window.__game.lobbyCam && !document.getElementById('loading91'), null, { timeout: 180000 }); await tp.waitForTimeout(800);
  await tp.screenshot({ path: path.join(out, 'benvenuto_telefono.png') });
  console.log(errs.slice(0, 10).join('\n') || 'nessun errore');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
