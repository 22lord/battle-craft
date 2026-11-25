// v107: prova dei comandi del telefono (Edge, tocco emulato 844x390).
// Uso: node tools/browser/touch107.cjs <out-dir>   (gioco servito su localhost:8123)
// Controlla: in modalita' armi niente tasto Modifica ne' «Arma ›»; Modifica c'e' in costruzione; tasto
// salto grande; la visuale non si ferma quando il dito passa sopra i tasti; un dito che parte su un
// tasto (Salta) trascinato gira la visuale; toccare la scritta / lo spazio fra le caselle prende l'arma.
const { chromium } = require('playwright-core'); const path = require('path');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto('http://localhost:8123/index.html', { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world, null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.tap('#btnPlay');
  await page.waitForFunction(() => window.__game.state === 'playing' && window.__game.player, null, { timeout: 120000 });
  await page.evaluate(() => { const G = window.__game, p = G.player; p.air88 = null; p.pos.set(-60, 0, -8); p.pos.y = G.physics.supportHeight(-60, -8, 60); p.vel.set(0, 0, 0); G.cam.yaw = 0; G.cam.pitch = -0.1; for (const c of G.chars) if (c !== p) c.alive = false;
    for (const w of ['ar', 'sg']) { p.weapons[w] = true; p.mag[w] = 10; } G.enterMode('weapon'); p.selectWeapon('ar'); G.hud.refreshHotbar(); });
  await page.waitForTimeout(1200);
  const r = {};
  const vis = (a) => page.evaluate((a) => { const b = document.querySelector('#touch84 [data-action=' + a + ']'); const s = getComputedStyle(b); const q = b.getBoundingClientRect(); return s.display !== 'none' ? Math.round(q.width) : 0; }, a);
  r.armi_modifica = await vis('edit'); r.armi_armaSucc = await vis('next'); r.salto_px = await vis('jump');
  await page.screenshot({ path: path.join(out, 't107_armi.png') });
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  const yaw = () => page.evaluate(() => window.__game.cam.yaw);
  const centro = (a) => page.evaluate((a) => { const q = document.querySelector('#touch84 [data-action=' + a + ']').getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, a);
  // 1. trascino in orizzontale sulla fila del tasto Spara, attraversandolo: la visuale deve girare a ogni tratto
  { const [fx, fy] = await centro('fire'); const x0 = fx - 220; const tratti = []; let y0 = await yaw();
    await touch('touchStart', [[x0, fy]]);
    for (let i = 1; i <= 22; i++) { await touch('touchMove', [[x0 + i * 13, fy]]); await page.waitForTimeout(25); if (i % 4 === 0) { const y1 = await yaw(); tratti.push(+((y0 - y1) * 180 / Math.PI).toFixed(1)); y0 = y1; } }
    await touch('touchEnd', []); r.visualeSopraSpara_gradiPerTratto = tratti; }
  await page.waitForTimeout(200);
  // 2. sopra Salta e Mira, in verticale
  { const [jx, jy] = await centro('jump'); const tratti = []; let p0 = await page.evaluate(() => window.__game.cam.pitch);
    await touch('touchStart', [[jx, jy - 200]]);
    for (let i = 1; i <= 20; i++) { await touch('touchMove', [[jx, jy - 200 + i * 11]]); await page.waitForTimeout(25); if (i % 5 === 0) { const p1 = await page.evaluate(() => window.__game.cam.pitch); tratti.push(+((p1 - p0) * 180 / Math.PI).toFixed(1)); p0 = p1; } }
    await touch('touchEnd', []); r.visualeSopraSalta_gradiPerTratto = tratti; }
  await page.waitForTimeout(200);
  // 3. dito che parte su Salta e trascina
  { const [jx, jy] = await centro('jump'); const y0 = await yaw();
    await touch('touchStart', [[jx, jy]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[jx - i * 12, jy]]); await page.waitForTimeout(25); } await touch('touchEnd', []);
    r.partendoDaSalta_gradi = +((await yaw() - y0) * 180 / Math.PI).toFixed(1); }
  await page.waitForTimeout(300);
  // 4. barra: tocco sotto la casella del fucile a pompa (sulla scritta / bordo) e fra due caselle
  { const sl = await page.evaluate(() => [...document.getElementById('hotbar').children].map((c) => { const q = c.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; }));
    r.casella_px = Math.round(sl[2][2] - sl[2][0]);
    const sgX = (sl[2][0] + sl[2][2]) / 2, sotto = sl[2][3] + 3;
    await touch('touchStart', [[sgX, sotto]]); await page.waitForTimeout(60); await touch('touchEnd', []); await page.waitForTimeout(200);
    r.toccoSottoCasella_arma = await page.evaluate(() => window.__game.player.weapon);
    const fra = (sl[1][2] + sl[2][0]) / 2 - 1;   // fra fucile (1) e pompa (2), piu' vicino al fucile
    await touch('touchStart', [[fra, (sl[1][1] + sl[1][3]) / 2]]); await page.waitForTimeout(60); await touch('touchEnd', []); await page.waitForTimeout(200);
    r.toccoFraCaselle_arma = await page.evaluate(() => window.__game.player.weapon); }
  // 5. costruzione: Modifica c'e'
  await page.evaluate(() => window.__game.enterMode('build')); await page.waitForTimeout(400);
  r.costruzione_modifica = await vis('edit');
  await page.screenshot({ path: path.join(out, 't107_costruzione.png') });
  console.log(JSON.stringify(r, null, 1));
  console.log(errs.slice(0, 20).join('\n') || 'nessun errore');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
