// Uso: node tools/browser/costi110.cjs [larghezza altezza]
// Costo GPU di ogni effetto della fase 1 su una vista fissa (piazza del castello, mezzogiorno), con la
// query del timer della GPU (EXT_disjoint_timer_query_webgl2): media di 120 fotogrammi per configurazione.
// Misura la GPU vera del PC (Intel UHD), non gli FPS del browser headless.
const { chromium } = require('playwright-core');
(async () => {
  const W = +process.argv[2] || 1280, H = +process.argv[3] || 720, URL = process.argv[4] || 'http://localhost:8123/index.html';   // [url]: per misurare una versione vecchia
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(URL, { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.lobbyCam, null, { timeout: 180000 });
  await page.evaluate(() => { const G = window.__game; G.setQuality('high'); G._skipLock102 = true; G.startMatch(); G._skipLock102 = false; G.drop88.clear(); G.drop88.elapsed = 999; for (const b of G.bots) { b.alive = false; b.model.group.visible = false; } G.chars = [G.player]; G.bots = [];
    if (G.giorno110) G.giorno110.fisso = 0.33; const p = G.player; p.setPosition(95.8, G.physics.supportHeight(95.8, 30, 17) + 0.05, 30); G.cam.yaw = -0.05; G.cam.pitch = -0.06; });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { window.__game.state = 'ended'; });
  const misura = (cfg) => page.evaluate(async (cfg) => {
    const G = window.__game, P = G.post110, r = G.renderer, gl = r.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (P) P.forza = Object.assign({}, cfg.post); r.shadowMap.enabled = cfg.ombre; G.sun.castShadow = cfg.ombre; G.scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); }); if (P) P.aggiorna();
    const disegna = () => { r.info.reset(); if (P && P.attivo()) P.render(G.scene, G.camera); else r.render(G.scene, G.camera); };
    for (let i = 0; i < 20; i++) { disegna(); await new Promise((f) => requestAnimationFrame(f)); }   // compila e scalda
    const t = []; for (let i = 0; i < 120; i++) { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); disegna(); gl.endQuery(ext.TIME_ELAPSED_EXT); await new Promise((f) => requestAnimationFrame(f)); t.push(q); }
    await new Promise((f) => setTimeout(f, 300)); const ms = [];
    for (const q of t) { let k = 0; while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) && k++ < 50) await new Promise((f) => setTimeout(f, 5)); if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) ms.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q); }
    ms.sort((a, b) => a - b); return { med: ms[Math.floor(ms.length / 2)], n: ms.length, calls: r.info.render.calls, buf: r.getDrawingBufferSize(new (G.camera.position.constructor)()).toArray().join('x') };
  }, cfg);
  const prove = [
    ['senza ombre, senza post (Bassa)', { ombre: false, post: { post: false } }],
    ['ombre, senza post', { ombre: true, post: { post: false } }],
    ['ombre + post solo curva/grading', { ombre: true, post: { post: true, ao: false, bloom: false, aa: false } }],
    ['  + FXAA', { ombre: true, post: { post: true, ao: false, bloom: false, aa: 'fxaa' } }],
    ['  + bloom (= Media)', { ombre: true, post: { post: true, ao: false, bloom: true, aa: 'fxaa' } }],
    ['  + AO (= Alta)', { ombre: true, post: { post: true, ao: true, bloom: true, aa: 'fxaa' } }],
    ['  + AO (= Alta), SMAA al posto di FXAA (F3)', { ombre: true, post: { post: true, ao: true, bloom: true, aa: 'smaa' } }],
  ];
  for (const [n, c] of prove) { if (c.post.post && !(await page.evaluate(() => !!window.__game.post110))) continue; const r = await misura(c); console.log(n.padEnd(40), r.med.toFixed(2) + ' ms GPU', '(' + r.n + ' fotogrammi, ' + r.calls + ' draw call, buffer ' + r.buf + ')'); }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
