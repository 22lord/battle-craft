// v107: pozzo, oggetti sui pendii, muri del castello pieni, pavimento sulla rampa, novanta.
// Uso: node test/v107.cjs index.html
// Controlla:
//  - il pozzo ha la collisione tonda (non ci si cammina dentro) e sta su terreno piano
//  - ogni oggetto con piazzola (pozzo, catasta, orto, fuoco spento, bancarelle, cassonetti) sta in piano
//  - i muri del castello sono pieni: fra la parete esterna e l'interna niente aria; rotta la parete
//    esterna non si entra nell'intercapedine; rotte tutte e due si passa nel cortile
//  - in piedi a meta' rampa guardando in basso il pavimento va in CIMA alla rampa (anche se alla base
//    c'e' gia' un pavimento) e viene accettato
//  - novanta: in cima a una rampa, girati di 90 gradi e saltando, muro + pavimento + rampa vanno tutti
//  - un pavimento che passa fra le gambe di chi costruisce viene messo e lo solleva sopra
const { load, THREE: T } = require('./harness.cjs'); const assert = require('assert');
(async () => {
  const c = load(process.argv[2]); await c.init(); c.window.keysDefaults(); c.document.documentElement = { style: { setProperty() {} } }; const A = c.API;
  const G = Object.create(A.Game.prototype);
  Object.assign(G, { scene: new T.Scene(), physics: new A.Physics(), state: 'title', time: 0, chars: [], bots: [], outfit: 0, playerName: 'Test', canvas: c.document.createElement('canvas'), renderer: { toneMappingExposure: 1, setPixelRatio() {}, setSize() {} }, lobbyCam: new T.PerspectiveCamera(), sens: 1, jumpBuf: 0, zoneTickT: 0, camera: new T.PerspectiveCamera(), stats: { xp: 0 } });
  G.scene.fog = new T.Fog(0, 50, 80); G.world = new A.World(G); G.world.build();
  for (const [key, cls] of Object.entries({ audio: 'AudioSys', fx: 'FX', input: 'Input', cam: 'CameraRig', hud: 'HUD', combat: 'Combat', build: 'BuildSystem', edit: 'EditSystem', harvest: 'Harvest', items: 'Items', zone: 'SafeZone', drop88: 'Drop88' })) G[key] = new A[cls](key === 'input' ? G.canvas : G);
  G.ui = Object.fromEntries(['title', 'end', 'pause', 'pauseNote', 'q1', 'q2'].map((k) => [k, c.document.createElement('div')])); G.bindUI(); G.startMatch();
  const W = G.world, P = G.physics, p = G.player, r = {}; p.air88 = null; for (const b of G.bots) b.alive = false;
  const mn = new T.Vector3(), mx = new T.Vector3();
  const pieno = (x, y, z, h = 0.05) => { mn.set(x - h, y, z - h); mx.set(x + h, y + 0.1, z + h); return P.overlapsAny(mn, mx); };
  const cammina = (x, z, y, vx, vz, s) => { const ch = { pos: new T.Vector3(x, y, z), vel: new T.Vector3(), radius: 0.38, height: 1.75, onGround: true, alive: true }; for (let i = 0; i < s * 60; i++) { ch.vel.set(vx, ch.vel.y, vz); P.moveCharacter(ch, 1 / 60); } return ch.pos; };

  // 1. pozzi
  const pozzi = W.oggetti107.filter((o) => o.rx === 1.5); r.pozzi = pozzi.length;
  r.pozziChiusi = pozzi.filter((o) => pieno(o.x, o.y + 0.5, o.z) && pieno(o.x + 1.0, o.y + 0.5, o.z) && pieno(o.x + 0.7, o.y + 0.5, o.z + 0.7) && !pieno(o.x + 1.6, o.y + 0.5, o.z)).length;
  // da fuori verso il centro del pozzo: ci si ferma al bordo (raggio ~1,2 + 0,38 del personaggio)
  { const o = pozzi[0], q = cammina(o.x - 4, o.z, o.y + 0.05, 3, 0, 3); r.pozzoFermaA_m = +(o.x - q.x).toFixed(2); }
  // 2. oggetti in piano
  { let peggio = 0; for (const o of W.oggetti107) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) peggio = Math.max(peggio, Math.abs(A.terrainHeight(o.x + i * o.rx, o.z + j * o.rz) - A.terrainHeight(o.x, o.z)));
    r.oggetti = W.oggetti107.length; r.oggettiDislivello_cm = +(peggio * 100).toFixed(1); }
  // 3. castello: muro +x a z+5 (pareti a ~+16,4 e ~+18,75 dal centro)
  { const C = W.castello105; let aria = 0, tot = 0;
    for (const hy of [1, 2.5, 4]) for (let dx = 16.6; dx <= 18.55; dx += 0.15) { tot++; if (!pieno(C.x + dx, C.y + hy, C.z + 5)) aria++; }
    r.intercapedineAria = aria + '/' + tot;
    const blocchi = (bx) => W.castelloBlocchi106.filter((b) => Math.abs(b.z - (C.z + 4)) < 1 && b.y < C.y + 3 && Math.abs(b.x - (C.x + bx)) < 1);
    for (const b of blocchi(20)) W.removeHarvestable(b);
    let q = cammina(C.x + 24, C.z + 4, C.y + 0.05, -3, 0, 4); r.rottoFuori_arrivaA = +(q.x - C.x).toFixed(2);
    for (const b of blocchi(16)) W.removeHarvestable(b);
    q = cammina(C.x + 24, C.z + 4, C.y + 0.05, -3, 0, 5); r.rottiTutti_arrivaA = +(q.x - C.x).toFixed(2);
    W.restoreHarvestables(); }
  // 4. pavimento in cima alla rampa, con un pavimento gia' alla base
  const B = G.build; p.setMode('weapon'); p.res.wood = 900; p.res.stone = 900;
  const at = (x, z) => { p.pos.set(x, 0, z); p.pos.y = P.supportHeight(x, z, 60); p.vel.set(0, 0, 0); p.onGround = true; };
  const K = (t, i, y, k, rot) => t === 'wall' ? `wall:${i},${y},${k},${rot & 1}` : `${t}:${i},${y},${k}`;
  const metti = (t, rot, jx, jy, jz) => { const d = { type: t, ix: jx, iy: jy, iz: jz, rot, key: K(t, jx, jy, jz, rot), center: new T.Vector3(), pattern: 0 }; if (t === 'wall') d.center.set((rot & 1) ? jx * 4 : jx * 4 + 2, jy * 4, (rot & 1) ? jz * 4 + 2 : jz * 4); else d.center.set(jx * 4 + 2, jy * 4, jz * 4 + 2); return B.place(d, p, 'wood', null, true); };
  const prova = (type, dir) => { const t = B.computeTarget(p, dir.clone().normalize(), type, 0); const v = B.validate(t, p, 'wood'); const out = { ix: t.ix, iy: t.iy, iz: t.iz, ok: v.ok || v.reason }; if (v.ok) B.tryPlace(p, t, 'wood', true); out.messo = B.grid.has(t.key); return out; };
  { const ix = Math.floor(-40 / 4), iz = Math.floor(30 / 4), base = Math.floor(P.supportHeight(ix * 4 + 2, iz * 4 + 2, 60) / 4) + 1;
    metti('floor', 0, ix, base, iz); metti('ramp', 1, ix, base, iz);
    const s0 = P.supportHeight(ix * 4 + 2, iz * 4 + 2, base * 4 + 3); p.pos.set(ix * 4 + 2, s0, iz * 4 + 2); p.vel.set(0, 0, 0); p.onGround = true;
    const t = prova('floor', new T.Vector3(0, -0.8, 0.6)); r.pavimentoSullaRampa = { dx: t.ix - ix, dz: t.iz - iz, livello: t.iy - base, ok: t.ok, messo: t.messo };
    B.reset(); }
  // 5. novanta: rampa verso +z, in cima girati verso +x, salto, muro + pavimento + rampa
  { const ix = Math.floor(-48 / 4), iz = Math.floor(22 / 4), base = Math.floor(P.supportHeight(ix * 4 + 2, iz * 4 + 2, 60) / 4) + 1;
    metti('floor', 0, ix, base, iz); metti('ramp', 1, ix, base, iz);
    const top = (base + 1) * 4; p.pos.set(ix * 4 + 2, top - 0.25, iz * 4 + 3.7); p.vel.set(0, 0, 0); p.onGround = true;
    p.pos.y += 0.9; p.onGround = false;   // in salto
    const out = []; for (const [type, d] of [['wall', [1, 0, 0]], ['floor', [1, -0.8, 0]], ['ramp', [1, -0.1, 0]]]) out.push(type + ':' + (prova(type, new T.Vector3(...d)).messo ? 'ok' : 'NO'));
    r.novanta = out.join(' '); B.reset(); }
  // 6. pavimento fra le gambe: si mette e solleva
  { at(-44, 14); const iy = Math.floor((p.pos.y + 0.75) / 4); const ix = Math.floor(p.pos.x / 4), iz = Math.floor(p.pos.z / 4);
    metti('wall', 0, ix, iy, iz);   // un muro sotto il bordo regge il pavimento
    const yTarget = (iy + 1) * 4, y0 = p.pos.y; p.pos.y = yTarget - 0.9;   // il pavimento passa a 0,9 m sopra i piedi
    const d = { type: 'floor', ix, iy: iy + 1, iz, rot: 0, key: K('floor', ix, iy + 1, iz, 0), center: new T.Vector3(ix * 4 + 2, yTarget, iz * 4 + 2), pattern: 0 };
    const v = B.validate(d, p, 'wood'); r.fraLeGambe = v.ok || v.reason; if (v.ok) B.tryPlace(p, d, 'wood', true); r.sollevato = +(p.pos.y - yTarget).toFixed(2); B.reset(); p.pos.y = y0; }
  console.log(JSON.stringify(r, null, 1));
  assert(r.pozzi >= 2 && r.pozziChiusi === r.pozzi, 'pozzi senza collisione tonda');
  assert(r.pozzoFermaA_m > 1.4 && r.pozzoFermaA_m < 1.8, 'ci si avvicina male al pozzo');
  assert(r.oggettiDislivello_cm < 6, 'oggetti in pendenza');   // pochi cm dove la piazzola tocca quella di una casa
  assert.equal(r.intercapedineAria.split('/')[0], '0', 'aria dentro il muro del castello');
  assert(r.rottoFuori_arrivaA > 17.9, 'si entra nell\'intercapedine');
  assert(r.rottiTutti_arrivaA < 14, 'col varco aperto non si passa');
  assert.deepEqual([r.pavimentoSullaRampa.dx, r.pavimentoSullaRampa.dz, r.pavimentoSullaRampa.livello, r.pavimentoSullaRampa.messo], [0, 0, 1, true], 'pavimento sulla rampa');
  assert.equal(r.novanta, 'wall:ok floor:ok ramp:ok', 'novanta');
  assert.equal(r.fraLeGambe, true); assert(Math.abs(r.sollevato) < 0.05, 'non sollevato');
  console.log('V107 PASS');
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
