// v109: inventario a caselle visto nel browser (Edge headless, gioco servito su localhost:8123).
// Uso: node tools/browser/inv109.cjs <out-dir>
// Scatta: barra con 5 caselle su PC (1280x720) e telefono (844x390), arma buttata a terra davanti,
// suggerimento «Scambia» a inventario pieno. Al telefono prova la pressione lunga sulla casella (butta
// l'arma) e il tocco sull'arma a terra (la riprende col suo caricatore).
const { chromium } = require('playwright-core'); const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
async function partita(browser, opz) {
  const ctx = await browser.newContext(opz); const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('battlecraft_benvenuto111', '1'); } catch (e) { } }); /* v111: niente finestra del nome */ const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto('http://localhost:8123/index.html', { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world, null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  if (opz.hasTouch) await page.tap('#btnPlay'); else await page.click('#btnPlay');
  await page.waitForFunction(() => window.__game.state === 'playing' && window.__game.player, null, { timeout: 120000 });
  // a terra in citta', guardando verso +z, con fucile scarico + fucile pieno + pompa
  await page.evaluate(() => { const G = window.__game, p = G.player; p.air88 = null; if (G.drop88) G.drop88.done = true; p.pos.set(6, 0, 10); p.pos.y = G.physics.supportHeight(6, 10, 60); p.vel.set(0, 0, 0); p.yaw = 0; G.cam.yaw = Math.PI; G.cam.pitch = -0.25;
    for (const c of G.chars) if (c !== p) c.alive = false; p.inv[0].mag = 0; p.giveWeapon('ar'); p.giveWeapon('sg', 0, 3); G.enterMode('weapon'); p.selectSlot109(1); G.hud.refreshHotbar(); });
  await page.waitForTimeout(1500);
  return { ctx, page, errs };
}
(async () => {
  const out = process.argv[2]; const r = {};
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  // --- PC ---
  { const { ctx, page, errs } = await partita(browser, { viewport: { width: 1280, height: 720 } });
    await page.screenshot({ path: path.join(out, 'inv109_pc_barra.png') });
    r.pc_caselle = await page.evaluate(() => [...document.getElementById('hotbar').children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()));
    await page.keyboard.press('KeyH'); await page.waitForTimeout(1500);
    r.pc_dopoButta = await page.evaluate(() => { const G = window.__game, p = G.player, it = G.items.list[G.items.list.length - 1]; return { casella1: p.inv[1], aTerra: it && { tipo: it.type, mag: it.mag109, inVolo: !!it.v, distanza: +Math.hypot(it.x - p.pos.x, it.z - p.pos.z).toFixed(2) } }; });
    await page.screenshot({ path: path.join(out, 'inv109_pc_aTerra.png') });
    // inventario pieno + arma vicina: suggerimento «Scambia»
    await page.evaluate(() => { const G = window.__game, p = G.player; while (p.liberi109() > 0) p.giveWeapon('sn'); p.selectSlot109(0); G.items.spawn('sg', p.pos.x + 0.4, p.pos.z + 1.2, 0); G.hud.refreshHotbar(); });
    await page.waitForTimeout(800);
    r.pc_suggerimento = await page.evaluate(() => document.getElementById('prompt') ? document.getElementById('prompt').textContent : null);
    await page.screenshot({ path: path.join(out, 'inv109_pc_scambia.png') });
    r.pc_errori = errs; await ctx.close(); }
  // --- telefono ---
  { const { ctx, page, errs } = await partita(browser, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    await page.screenshot({ path: path.join(out, 'inv109_tel_barra.png') });
    const sl = await page.evaluate(() => [...document.getElementById('hotbar').children].map((c) => { const q = c.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; }));
    r.tel_barra = { caselle: sl.length, larghezza: Math.round(sl[sl.length - 1][2] - sl[0][0]), casella: Math.round(sl[1][2] - sl[1][0]) };
    // pressione lunga (0,7 s) sulla casella 2 (il fucile pieno)
    const cx = (sl[2][0] + sl[2][2]) / 2, cy = (sl[2][1] + sl[2][3]) / 2;
    await touch('touchStart', [[cx, cy]]); await page.waitForTimeout(700); await touch('touchEnd', []); await page.waitForTimeout(1500);
    r.tel_pressioneLunga = await page.evaluate(() => { const G = window.__game, p = G.player, it = G.items.list[G.items.list.length - 1]; return { casella1: p.inv[1], aTerra: it && it.type + ':' + it.mag109 }; });
    await page.screenshot({ path: path.join(out, 'inv109_tel_aTerra.png') });
    // tocco breve sull'arma a terra: la riprende
    const pt = await page.evaluate(() => { const G = window.__game, it = G.items.list[G.items.list.length - 1]; const v = it.g.position.clone(); v.y += 0.35; v.project(G.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }).catch(() => null);
    if (pt) { await touch('touchStart', [pt]); await page.waitForTimeout(80); await touch('touchEnd', []); await page.waitForTimeout(500);
      r.tel_ripresa = await page.evaluate(() => window.__game.player.inv.map((s) => s ? s.w + ':' + s.mag : '-').join(' ')); }
    r.tel_errori = errs; await ctx.close(); }
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
