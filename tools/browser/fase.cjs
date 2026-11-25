// Uso: node tools/browser/fase.cjs <cartella-uscita> [url] [qualita']
// Le 6 inquadrature fisse per il confronto PRIMA/DOPO delle fasi grafiche:
//   a_piazza    piazza del castello, personaggio di spalle (come screen/Screenshot 2026-11-25 164755.png)
//   b_muro      muro del castello da 1 m
//   c_lobby     primo piano del personaggio in lobby
//   d_bosco     bosco con alberi, cespugli ed erba
//   e_villaggio villaggio sul lago
//   f_bus       vista dal bus
// Uso v110: node tools/browser/fase.cjs <uscita> [url] [qualita'] [ora 0..1]
// Math.random e' fissato (seme) cosi' rotta del bus e bot sono sempre gli stessi.
// L'interfaccia e' nascosta: si confronta solo la grafica.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const VISTE = {
  // camera libera: [cam], [at]
  b_muro: null, // esterno del muro sud, a ovest della porta: calcolata sotto (quota del terreno)
  d_bosco: null, // calcolata nel gioco: punto con alberi e cespugli vicini (vedi sotto)
  e_villaggio: { cam: [-50, 6, -128], at: [-80, 2, -108], fov: 62 },
};
(async () => {
  const out = process.argv[2]; const url = process.argv[3] || 'http://localhost:8123/index.html'; const q = process.argv[4] || 'med'; const ora = process.argv[5] !== undefined ? +process.argv[5] : 0.33;   // frazione del giro del giorno (v110): 0,33 = mezzogiorno, 0,68 = tramonto
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => { let s = 1234567; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url, { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.world.chunks && window.__game.lobbyCam, null, { timeout: 180000 });
  await page.evaluate((q) => { const G = window.__game; G.setQuality(q[0]); if (G.giorno110) { G.giorno110.fisso = q[1]; G.giorno110.u = q[1]; } }, [q, ora]);
  await page.waitForTimeout(2500);
  const nascondiUI = () => page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== 'CANVAS' && el.tagName !== 'SCRIPT') el.style.visibility = 'hidden'; const c = document.getElementById('game'); let p = c; while (p) { p.style.visibility = 'visible'; p = p.parentElement; } });
  // draw call e triangoli dell'ultimo fotogramma (le ombre contano a parte: info.render si azzera a ogni render)
  const scatta = async (n) => { await page.screenshot({ path: path.join(out, n + '.png') }); const i = await page.evaluate(() => { const r = window.__game.renderer; const s = r.getDrawingBufferSize(new (window.__game.camera.position.constructor)()); return { calls: r.info.render.calls, tri: r.info.render.triangles, prog: r.info.programs.length, buf: s.x + 'x' + s.y }; }); console.log('ok', n, JSON.stringify(i)); };

  // c) lobby: primo piano (testa e busto)
  await nascondiUI();
  await page.evaluate(() => { const G = window.__game; G._lobbyFix = true; const f = G.frameLobbyCam.bind(G); G.frameLobbyCam = function () { const c = this.lobbyCam; c.fov = 30; c.position.set(0.3, 1.52, 2.3); c.lookAt(0.05, 1.40, 0); c.aspect = 1280 / 720; c.updateProjectionMatrix(); }; G.frameLobbyCam(); });
  await page.waitForTimeout(1500);
  await scatta('c_lobby');

  // f) bus
  await page.evaluate(() => { window.__game.frameLobbyCam = Object.getPrototypeOf(window.__game).frameLobbyCam; window.__game._skipLock102 = true; window.__game.startMatch(); window.__game._skipLock102 = false; });
  await page.waitForFunction(() => window.__game.drop88.elapsed > 4.5, null, { timeout: 60000 });
  await nascondiUI();
  await page.evaluate(() => { const G = window.__game; G.drop88.elapsed = 5; });
  await page.waitForTimeout(400);
  await scatta('f_bus');

  // a) piazza del castello, di spalle
  await page.evaluate(() => {
    const G = window.__game; G.drop88.clear(); G.drop88.elapsed = 999;
    for (const b of G.bots) { b.alive = false; b.model.group.visible = false; } G.chars = [G.player]; G.bots = [];
    const C = { x: 108, z: 40, y: 14 }; const p = G.player; const x = 95.8, z = 30;
    p.setPosition(x, G.physics.supportHeight(x, z, C.y + 3) + 0.05, z); p.vel.set(0, 0, 0); p.selectSlot109 && p.selectSlot109(-1);
    G.cam.yaw = -0.05; G.cam.pitch = -0.06;
  });
  await page.waitForTimeout(2500);
  await nascondiUI();
  await scatta('a_piazza');

  // camera libera per le altre
  await page.evaluate(() => { window.__game.state = 'ended'; window.__game.player.model.group.visible = false; });
  for (const [n, v0] of Object.entries(VISTE)) {
    await page.evaluate(([n, v]) => {
      const G = window.__game, V = G.camera.position.constructor;
      if (!v) { // bosco: il gruppo di alberi piu' fitto lontano dalle case (cercato: 18 alberi entro 14 m)
        const h = (x, z) => G.physics.supportHeight(x, z, 200);
        v = n === 'b_muro' ? { cam: [98.4, h(98.4, 16.6) + 1.6, 16.6], at: [96.4, h(98.4, 16.6) + 2.0, 18.6], fov: 62 } : { cam: [97, h(97, -62) + 1.7, -62], at: [106, h(106, -48) + 1.5, -48], fov: 62 };
      }
      const t = new V(...v.at); G.camera.position.set(...v.cam); G.camera.fov = v.fov || 62; G.camera.aspect = 1280 / 720; G.camera.updateProjectionMatrix(); G.camera.lookAt(t);
      if (G.giorno110) { G.player.pos.copy(t); G.giorno110.applica(t); } else { G.sun.position.copy(t).add(new V(92, 56, 52)); G.sun.target.position.copy(t); G.sun.target.updateMatrixWorld(); }
      for (let i = 0; i < 30; i++) G.world.chunks.update(t, 0.1);
      if (G.world.aggiornaVegetazione) G.world.aggiornaVegetazione(t, 1e6);
    }, [n, v0]);
    await page.waitForTimeout(1500);
    await scatta(n);
  }
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 20).join('\n') : 'nessun errore');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
