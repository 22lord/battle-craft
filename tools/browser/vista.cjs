// Uso: node vista.cjs <out-dir> <viste.json>
// viste.json: [{name, cam:[x,y,z], at:[x,y,z], fov?}]  — telecamera libera nel mondo vero
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
(async () => {
  const out = process.argv[2], viste = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const url = process.argv[4] || 'http://localhost:8123/index.html';
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url, { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.world.chunks, null, { timeout: 180000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const G = window.__game; G.state = 'ended'; document.querySelectorAll('#menu,#lobbyUI,.screen,#hud').forEach((e) => e.style.display = 'none'); for (const el of document.body.children) if (el.tagName !== 'CANVAS' && el.tagName !== 'SCRIPT') el.style.visibility = 'hidden'; });
  for (const v of viste) {
    await page.evaluate((v) => {
      const G = window.__game, V = G.camera.position.constructor; const t = new V(...v.at); if (v.js) { (new Function("G","v", v.js))(G, v); t.set(...v.at); }
      if (v.nofog && G.scene.fog) { G._fog = G._fog || G.scene.fog; G.scene.fog = null; } else if (!v.nofog && G._fog) G.scene.fog = G._fog;
      G.camera.position.set(...v.cam); G.camera.fov = v.fov || 60; G.camera.aspect = 1280 / 720; G.camera.updateProjectionMatrix(); G.camera.lookAt(t);
      G.sun.position.copy(t).add(new V(92, 56, 52)); G.sun.target.position.copy(t); G.sun.target.updateMatrixWorld();
      for (let i = 0; i < 30; i++) G.world.chunks.update(t, 0.1);
      if (G.world.aggiornaVegetazione) G.world.aggiornaVegetazione(t, 1e6 + Math.random());
    }, v);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, v.name + '.png') });
  }
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 20).join('\n') : 'nessun errore');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
