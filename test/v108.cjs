// v108: deltaplano di Lorenzo, deltaplano cadendo da in alto, bus che galleggia, castello ripulito.
// Uso: node test/v108.cjs index.html
// Controlla:
//  - il deltaplano e' il modello di Lorenzo (7 materiali, sotto i 20.000 triangoli) con lo shader della vela
//  - in partita il tasto del salto apre il deltaplano solo cadendo con almeno VELA108.quota m di vuoto:
//    non a terra, non a 3 m, non salendo; aperto si scende a ~4,7 m/s e si atterra; niente nebbia del lancio
//  - il bus segue la sua rotta (scarto laterale < 0,6 m) ma la quota e l'assetto cambiano in modo irregolare
//  - attorno al castello, a terra e fuori dalle mura, non restano pezzi del modello (i pali tagliati della staccionata)
const { load, THREE: T } = require('./harness.cjs'); const assert = require('assert');
(async () => {
  const c = load(process.argv[2]); await c.init(); c.window.keysDefaults(); c.document.documentElement = { style: { setProperty() {} } }; const A = c.API;
  const G = Object.create(A.Game.prototype);
  Object.assign(G, { scene: new T.Scene(), physics: new A.Physics(), state: 'title', time: 0, chars: [], bots: [], outfit: 0, playerName: 'Test', canvas: c.document.createElement('canvas'), renderer: { toneMappingExposure: 1, setPixelRatio() {}, setSize() {} }, lobbyCam: new T.PerspectiveCamera(), sens: 1, jumpBuf: 0, zoneTickT: 0, camera: new T.PerspectiveCamera(), stats: { xp: 0 } });
  G.scene.fog = new T.Fog(0, 50, 80); G.world = new A.World(G); G.world.build();
  for (const [key, cls] of Object.entries({ audio: 'AudioSys', fx: 'FX', input: 'Input', cam: 'CameraRig', hud: 'HUD', combat: 'Combat', build: 'BuildSystem', edit: 'EditSystem', harvest: 'Harvest', items: 'Items', zone: 'SafeZone', drop88: 'Drop88' })) G[key] = new A[cls](key === 'input' ? G.canvas : G);
  G.ui = Object.fromEntries(['title', 'end', 'pause', 'pauseNote', 'q1', 'q2'].map((k) => [k, c.document.createElement('div')])); G.bindUI(); G.startMatch();
  const W = G.world, P = G.physics, p = G.player, D = G.drop88, r = {};
  for (const b of G.bots) b.alive = false;
  const ok = {};

  // 1. il modello
  { const gl = A.makeGlider88(); let tri = 0, mesh = 0; gl.traverse((o) => { if (o.isMesh) { mesh++; tri += o.geometry.index.count / 3; } });
    r.deltaplano = { mesh, tri, vela: !!gl.userData.vela108 };
    ok.modello = !!A.getDeltaplano108() && mesh === 7 && tri < 20000 && !!gl.userData.vela108 && gl.userData.wing.children.every((o) => o.isMesh ? true : o.children.every((m) => typeof m.material.onBeforeCompile === 'function' && m.material.customProgramCacheKey() === 'vela108')); }

  // 2. il bus: rotta e sospensione (prima di tutto: il bus parte con la partita)
  { p.air88 = null; const ab = D.to.clone().sub(D.from); ab.y = 0; const L = ab.length(); ab.normalize();
    const ys = [], lats = [], rx = [], rz = [];
    for (let i = 0; i < 20 * 30; i++) { D.update(1 / 30); if (D.elapsed > D.duration) break; const b = D.bus.position, d = b.clone().sub(D.from); d.y = 0; lats.push(Math.abs(d.x * ab.z - d.z * ab.x)); ys.push(b.y); rx.push(D.bus.rotation.x); rz.push(D.bus.rotation.z); }
    const range = (a) => Math.max(...a) - Math.min(...a), mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const ym = mean(ys), ysd = Math.sqrt(mean(ys.map((y) => (y - ym) ** 2)));
    // irregolare: gli intervalli fra un massimo di quota e il successivo non sono tutti uguali
    const pk = []; for (let i = 1; i < ys.length - 1; i++) if (ys[i] > ys[i - 1] && ys[i] >= ys[i + 1]) pk.push(i); const gaps = pk.slice(1).map((v, i) => v - pk[i]);
    r.bus = { scartoMax_m: +Math.max(...lats).toFixed(2), quota: [+Math.min(...ys).toFixed(2), +Math.max(...ys).toFixed(2)], sdQuota: +ysd.toFixed(2), rollio: +range(rx).toFixed(3), beccheggio: +range(rz).toFixed(3), intervalliPicchi: gaps };
    ok.bus = Math.max(...lats) < 0.6 && Math.min(...ys) > 106.5 && Math.max(...ys) < 109.5 && ysd > 0.15 && range(rx) > 0.04 && range(rz) > 0.03 && gaps.length >= 2 && Math.max(...gaps) - Math.min(...gaps) > 3; }

  // 3. deltaplano in partita
  { G.state = 'playing'; for (const ch of G.chars) if (ch.air88) { G.scene.remove(ch.air88.glider); ch.air88 = null; }
    // un punto libero lontano dalle case: cerco a spirale dove sopra ci sono 30 m di aria
    let x = 0, z = 0, gr = 0; for (let k = 0; k < 400; k++) { const a = k * 0.7, rr = 20 + k * 0.25; x = Math.cos(a) * rr; z = Math.sin(a) * rr; gr = P.supportHeight(x, z, 200); if (gr > A.MARE + 1 && Math.abs(gr - A.terrainHeight(x, z)) < 0.05 && !W.nearHouse92(x, z, 15)) break; }
    const metti = (h, vy, terra = false) => { p.air88 = null; p.pos.set(x, gr + h, z); p.vel.set(0, vy, 0); p.onGround = terra; };
    const salta = () => { G.onKeyDown(A.KEYS.jump, { preventDefault() {} }); return !!p.air88; };
    metti(0, 0, true); const aTerra = salta(); G.jumpBuf = 0;
    metti(3, -5); const a3m = salta();
    metti(20, 4); const salendo = salta();
    metti(20, -8); const hud = D.puoAprire108(p); const a20m = salta();
    r.apre = { aTerra, a3m, salendo, a20m, suggerimento: hud };
    let vy2 = null, nebbia = 0, aria = false, t = 0;
    for (; t < 40 && p.air88; t += 1 / 30) { D.update(1 / 30); if (Math.abs(t - 2.5) < 0.02) vy2 = p.vel.y; nebbia = Math.max(nebbia, G.scene.fog.far); aria = aria || W.chunks.airborne88; }
    r.planata = { vy_dopo_2s: vy2 && +vy2.toFixed(2), atterratoIn_s: +t.toFixed(1), quotaFinale: +(p.pos.y - P.supportHeight(p.pos.x, p.pos.z, p.pos.y + 1)).toFixed(2), nebbiaFarMax: +nebbia.toFixed(0), dettaglioLancio: aria };
    ok.partita = !aTerra && !a3m && !salendo && a20m && hud && vy2 !== null && Math.abs(vy2 + 4.7) < 0.4 && !p.air88 && Math.abs(r.planata.quotaFinale) < 0.1 && nebbia < 200 && !aria; }

  // 4. castello: niente pezzi a terra fuori dalle mura (torri a +-19,5 con raggio ~4)
  { const C = W.castello105, root = W.castelloMesh105, v = new T.Vector3(), fuori = [];
    root.updateMatrixWorld(true);
    root.traverse((o) => { if (!o.isMesh) return; const pa = o.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); const lx = v.x - C.x, ly = v.y - C.y, lz = v.z - C.z; if (ly > 1.2 || (Math.abs(lx) < 22.5 && Math.abs(lz) < 22.5)) continue; if (Math.hypot(Math.abs(lx) - 19.5, Math.abs(lz) - 19.5) < 4.6) continue; fuori.push([+lx.toFixed(1), +ly.toFixed(1), +lz.toFixed(1)]); } });
    r.castelloPezziFuori = fuori.length; if (fuori.length) r.castelloEsempi = fuori.slice(0, 4);
    ok.castello = fuori.length === 0; }

  console.log(JSON.stringify(r, null, 1));
  console.log(JSON.stringify(ok));
  assert(Object.values(ok).every(Boolean), 'v108: controlli falliti');
  console.log('v108 PASS');
})().catch((e) => { console.error(e); process.exit(1); });
