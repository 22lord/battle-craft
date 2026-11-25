// v105: prova dei comandi del telefono in Edge con il tocco emulato (844x390, orizzontale).
// Uso: node tools/browser/touch.cjs <out-dir>
// Controlla: joystick mobile (nasce dove tocchi, anche in alto a sinistra), raccolta toccando
// l'oggetto, niente pulsante "Raccogli", sensibilita' del trascinamento.
const { chromium } = require('playwright-core'); const path = require('path');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('battlecraft_benvenuto111', '1'); } catch (e) { } });   // v111: niente finestra del nome, copre i pulsanti const cdp = await ctx.newCDPSession(page);
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto('http://localhost:8123/index.html', { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world, null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.tap('#btnPlay');
  await page.waitForFunction(() => window.__game.state === 'playing' && window.__game.player, null, { timeout: 120000 });
  // salto il lancio: a terra davanti alla porta del castello, guardando verso nord (+z)
  await page.evaluate(() => { const G = window.__game, p = G.player; p.air88 = null; p.pos.set(113.4, 24.1, 12); p.vel.set(0, 0, 0); G.cam.yaw = Math.PI; G.cam.pitch = -0.15; for (const c of G.chars) if (c !== p) c.alive = false; });
  await page.waitForTimeout(1500);
  const r = {};
  r.pulsanteRaccogli = await page.evaluate(() => !!document.querySelector('#touch84 [data-action=pickup]'));
  r.touchAttivo = await page.evaluate(() => window.__game.touch84.active);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  // joystick: tocco in alto a sinistra (lontano dal cerchio disegnato), poi in su
  await touch('touchStart', [[170, 120]]); await page.waitForTimeout(80);
  r.stickDove = await page.evaluate(() => { const b = document.querySelector('#touch84 .touchStick').getBoundingClientRect(); return [Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2)]; });
  for (let i = 1; i <= 6; i++) { await touch('touchMove', [[170, 120 - i * 8]]); await page.waitForTimeout(30); }
  r.stickAvanti = await page.evaluate(() => +window.__game.input.moveY84.toFixed(2));
  const z0 = await page.evaluate(() => window.__game.player.pos.z);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(out, 't_joystick.png') });
  r.camminato_m = +(await page.evaluate(() => window.__game.player.pos.z) - z0).toFixed(2);
  await touch('touchEnd', []); await page.waitForTimeout(80);
  r.stickDopo = await page.evaluate(() => [window.__game.input.moveX84, window.__game.input.moveY84]);
  // sensibilita': trascino 200 px nella meta' destra
  const yaw0 = await page.evaluate(() => window.__game.cam.yaw);
  await touch('touchStart', [[600, 200]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[600 + i * 20, 200]]); await page.waitForTimeout(20); } await touch('touchEnd', []);
  await page.waitForTimeout(200);
  r.gradiPer200px = +((yaw0 - await page.evaluate(() => window.__game.cam.yaw)) * 180 / Math.PI).toFixed(1);
  await page.evaluate((y) => { window.__game.cam.yaw = y; }, yaw0); await page.waitForTimeout(200);
  // raccolta: oggetto a 2 m davanti, poi un tocco sopra
  const pos = await page.evaluate(() => { const G = window.__game, p = G.player; for (const it of [...G.items.list]) if (Math.hypot(it.x - p.pos.x, it.z - p.pos.z) < 20) G.items.remove(it);
    const yw = G.cam.yaw, it = G.items.spawn('ar', p.pos.x + Math.sin(yw) * 2.2, p.pos.z + Math.cos(yw) * 2.2, 0); window.__it = it; return null; });
  await page.waitForTimeout(500);
  const sp = await page.evaluate(() => { const G = window.__game, it = window.__it; const v = new it.g.position.constructor(it.x, it.y + 0.35, it.z).project(G.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  r.oggettoSulloSchermo = sp.map(Math.round);
  r.suggerimento = await page.evaluate(() => document.getElementById('prompt')?.textContent || '');
  await page.screenshot({ path: path.join(out, 't_oggetto.png') });
  const armiPrima = await page.evaluate(() => window.__game.items.list.includes(window.__it));
  await touch('touchStart', [[sp[0] + 10, sp[1] + 8]]); await page.waitForTimeout(60); await touch('touchEnd', []);
  await page.waitForTimeout(300);
  r.raccolto = armiPrima && !(await page.evaluate(() => window.__game.items.list.includes(window.__it)));
  console.log(JSON.stringify(r, null, 1));
  console.log(errs.slice(0, 20).join('\n') || 'nessun errore');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
