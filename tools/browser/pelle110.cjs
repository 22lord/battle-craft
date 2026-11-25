// Uso: node tools/browser/pelle110.cjs <uscita.png> [ora 0..1]
// Personaggio in campo aperto, girato verso il sole, camera davanti a 1,6 m: per misurare la pelle
// e confrontarla col modello analitico (tools/luce110.cjs). Interfaccia nascosta.
const { chromium } = require('playwright-core');
(async () => {
  const out = process.argv[2], ora = process.argv[3] !== undefined ? +process.argv[3] : 0.33;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:8123/index.html', { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.lobbyCam, null, { timeout: 180000 });
  await page.evaluate((ora) => { const G = window.__game; G._skipLock102 = true; G.startMatch(); G._skipLock102 = false; G.drop88.clear(); G.drop88.elapsed = 999; for (const b of G.bots) { b.alive = false; b.model.group.visible = false; } G.chars = [G.player]; G.bots = []; G.giorno110.fisso = ora; G.giorno110.u = ora;
    const p = G.player, x = -60, z = -118; p.setPosition(x, G.physics.supportHeight(x, z, 200) + 0.05, z); p.vel.set(0, 0, 0); p.selectSlot109(-1); }, ora);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const G = window.__game, p = G.player, d = G.giorno110.dirLuce; const yaw = Math.atan2(d.x, d.z); G.cam.yaw = yaw + Math.PI; G.state = 'ended'; p.yaw = yaw; p.model.group.rotation.y = yaw;
    for (const el of document.body.children) if (el.tagName !== 'CANVAS' && el.tagName !== 'SCRIPT') el.style.visibility = 'hidden';
    const V = G.camera.position.constructor, h = p.pos.y; G.camera.position.set(p.pos.x + Math.sin(yaw) * 1.6, h + 1.45, p.pos.z + Math.cos(yaw) * 1.6); G.camera.fov = 40; G.camera.aspect = 16 / 9; G.camera.updateProjectionMatrix(); G.camera.lookAt(new V(p.pos.x, h + 1.25, p.pos.z)); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out }); console.log('salvato', out); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
