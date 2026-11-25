// v112: diagnosi delle "divisioni" sul castello. Stessa vista del muro di fase.cjs (b_muro) in 4 varianti:
//   1 normale | 2 senza ombre | 3 solo castello su fondo magenta, senza luci (le fessure vere diventano magenta)
//   4 colore per blocco distruttibile (si vede dove cadono i confini dei blocchi)
// Uso: node tools/browser/cuciture112.cjs <cartella> [url] [vista: muro|piazza|torre]
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
(async () => {
  const out = process.argv[2], url = process.argv[3] || 'http://127.0.0.1:8123/index.html', quale = process.argv[4] || 'muro';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => { let s = 1234567; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url, { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.world.chunks && window.__game.lobbyCam, null, { timeout: 180000 });
  await page.evaluate(() => { const G = window.__game; G.setQuality('med'); if (G.giorno110) { G.giorno110.fisso = 0.33; G.giorno110.u = 0.33; } });
  await page.evaluate(() => { const G = window.__game; G._skipLock102 = true; G.startMatch(); G._skipLock102 = false; });
  await page.waitForFunction(() => window.__game.drop88 && window.__game.drop88.elapsed > 1, null, { timeout: 60000 });
  await page.evaluate((quale) => {
    const G = window.__game; G.drop88.clear(); G.drop88.elapsed = 999; G.state = 'ended'; G.player.model.group.visible = false;
    for (const el of document.body.children) if (el.tagName !== 'CANVAS' && el.tagName !== 'SCRIPT') el.style.visibility = 'hidden';
    const c = document.getElementById('game'); let p = c; while (p) { p.style.visibility = 'visible'; p = p.parentElement; }
    const V = G.camera.position.constructor, h = (x, z) => G.physics.supportHeight(x, z, 200);
    const VV = { muro: { cam: [98.4, h(98.4, 16.6) + 1.6, 16.6], at: [96.4, h(98.4, 16.6) + 2.0, 18.6], fov: 62 },
      piazza: { cam: [95.8, 15.6, 30], at: [96.5, 15.0, 45], fov: 62 },
      torre: { cam: [92, h(92, 10) + 2, 10], at: [100, h(92, 10) + 5, 22], fov: 62 } };
    const v = VV[quale]; const t = new V(...v.at); G.camera.position.set(...v.cam); G.camera.fov = v.fov; G.camera.aspect = 1280 / 720; G.camera.updateProjectionMatrix(); G.camera.lookAt(t);
    if (G.giorno110) { G.player.pos.copy(t); G.giorno110.applica(t); }
    for (let i = 0; i < 30; i++) G.world.chunks.update(t, 0.1);
    if (G.world.aggiornaVegetazione) G.world.aggiornaVegetazione(t, 1e6);
  }, quale);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(out, quale + '1_normale.png') });
  await page.evaluate(() => { const G = window.__game; G.renderer.shadowMap.enabled = false; G.scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, quale + '2_senza_ombre.png') });
  await page.evaluate(() => {
    const G = window.__game, T = G.camera.constructor.prototype; const root = G.world.castelloMesh105;
    G._vis = []; G.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite || o.isLine) { G._vis.push([o, o.visible]); o.visible = false; } });
    let p = root; while (p) { p.visible = true; p = p.parent; }
    root.traverse((o) => { o.visible = true; if (o.isMesh) o.userData.m0 = o.material; });
    G.scene.background = new (G.scene.fog ? G.scene.fog.color.constructor : Object)(1, 0, 1); G._fogX = G.scene.fog; G.scene.fog = null;
    // materiale piatto: colore della texture senza luci
    root.traverse((o) => { if (!o.isMesh) return; const m = o.userData.m0; const b = m.clone(); b.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor = vec4(diffuseColor.rgb, 1.0);'); }; b.customProgramCacheKey = () => 'piatto112'; o.material = b; });
    // il cielo e' una mesh che segue la camera: nascosto sopra; sfondo magenta
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, quale + '3_fessure_magenta.png') });
  await page.evaluate(() => {
    const G = window.__game, root = G.world.castelloMesh105;
    // colore per blocco: per ogni pannello del castello coloro i suoi vertici
    const colA = new Map();
    root.traverse((o) => { if (!o.isMesh) return; const g = o.geometry; const n = g.attributes.position.count; const a = new Float32Array(n * 3).fill(0.5); g._c0 = g.attributes.color; g.setAttribute('color', new g.attributes.position.constructor(a, 3)); colA.set(o, a); });
    let k = 0; for (const r of G.world.castelloBlocchi106) { k++; const hcol = [(k * 0.618) % 1, 0.5 + (k * 0.37 % 0.5), 0.5 + (k * 0.23 % 0.4)]; for (const hd of r.handles) { const a = colA.get(hd.mesh); if (!a) continue; for (let i = hd.start; i < hd.start + hd.count; i++) { a[i * 3] = hcol[0]; a[i * 3 + 1] = hcol[1]; a[i * 3 + 2] = hcol[2]; } } }
    root.traverse((o) => { if (!o.isMesh) return; const b = o.userData.m0.clone(); b.map = null; b.vertexColors = true; b.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor = vec4(vColor.rgb, 1.0);'); }; b.customProgramCacheKey = () => 'blocchi112'; b.needsUpdate = true; o.material = b; });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, quale + '4_blocchi.png') });
  console.log(errs.length ? 'ERRORI:\n' + errs.slice(0, 20).join('\n') : 'nessun errore');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
