// v106: piccone e costruzione sopra la testa. Uso: node test/piccone-costruzioni.cjs index.html
// Controlla: il piccone fa danno a un bot davanti (prima zero: il raggio ignorava i personaggi) e non
// oltre la portata; rompe un blocco del castello in 6 colpi; guardando in alto il pavimento va nella
// propria cella sopra la testa, anche in piedi su una rampa fra due muri (lo screenshot di Lorenzo).
const { load, THREE: T } = require('./harness.cjs'); const assert = require('assert');
(async () => {
  const c = load(process.argv[2]); await c.init(); c.window.keysDefaults(); c.document.documentElement = { style: { setProperty() {} } }; const A = c.API;
  const G = Object.create(A.Game.prototype);
  Object.assign(G, { scene: new T.Scene(), physics: new A.Physics(), state: 'title', time: 0, chars: [], bots: [], outfit: 0, playerName: 'Test', canvas: c.document.createElement('canvas'), renderer: { toneMappingExposure: 1, setPixelRatio() {}, setSize() {} }, lobbyCam: new T.PerspectiveCamera(), sens: 1, jumpBuf: 0, zoneTickT: 0, camera: new T.PerspectiveCamera(), stats: { xp: 0 } });
  G.scene.fog = new T.Fog(0, 50, 80); G.world = new A.World(G); G.world.build();
  for (const [key, cls] of Object.entries({ audio: 'AudioSys', fx: 'FX', input: 'Input', cam: 'CameraRig', hud: 'HUD', combat: 'Combat', build: 'BuildSystem', edit: 'EditSystem', harvest: 'Harvest', items: 'Items', zone: 'SafeZone', drop88: 'Drop88' })) G[key] = new A[cls](key === 'input' ? G.canvas : G);
  G.ui = Object.fromEntries(['title', 'end', 'pause', 'pauseNote', 'q1', 'q2'].map((k) => [k, c.document.createElement('div')])); G.bindUI(); G.startMatch();
  const p = G.player, b = G.bots[0], r = {}; p.air88 = null; b.air88 = null;
  // campo piatto e vuoto: sopra il lago grande non c'e' niente, uso un punto della citta' ripulito
  const at = (ch, x, z) => { ch.pos.set(x, 0, z); ch.pos.y = G.physics.supportHeight(x, z, 60); ch.vel.set(0, 0, 0); ch.onGround = true; };
  const mira = (tx, ty, tz) => { const e = p.eye(); G.cam.pos.copy(e).addScaledVector(new T.Vector3(tx - e.x, 0, tz - e.z).normalize(), -2.5); G.cam.pos.y += 0.6; G.cam.dir.set(tx, ty, tz).sub(G.cam.pos).normalize(); };
  // 1. piccone contro un bot a 1,6 m
  const X = -60, Z = -8; at(p, X, Z); at(b, X, Z + 1.6); b.shield = 0; b.hp = 100; p.setMode('harvest');
  b.animate(1 / 60); p.animate(1 / 60);
  const petto = () => { b.model.group.updateWorldMatrix(true, true); return b.model.chest.getWorldPosition(new T.Vector3()); };   // il bot appena creato puo' essere in posa bassa: miro al petto vero
  { const q = petto(); mira(q.x, q.y, q.z); }
  G.harvest.hit(p); r.dannoVicino = 100 - b.hp;
  at(b, X, Z + 4.5); b.hp = 100; b.animate(1 / 60); { const q = petto(); mira(q.x, q.y, q.z); } G.harvest.hit(p); r.dannoLontano = 100 - b.hp;
  // 2. un blocco del castello si rompe col piccone
  { const W = G.world, blk = W.castelloBlocchi106.filter((k) => k.cols.length > 10).sort((a, b) => a.y - b.y)[0], col = blk.cols[0];
    const cx = (col.min.x + col.max.x) / 2, cz = (col.min.z + col.max.z) / 2, cy = (col.min.y + col.max.y) / 2;
    // mi metto fuori dal castello davanti alla scatola, sul lato libero
    let best = null; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx * 1.6, z = cz + dz * 1.6; const s = G.physics.supportHeight(x, z, cy + 0.5); const mn = new T.Vector3(x - 0.4, s + 0.1, z - 0.4), mx = new T.Vector3(x + 0.4, s + 1.7, z + 0.4); if (!G.physics.overlapsAny(mn, mx) && Math.abs(s + 1.2 - cy) < 2.5) best = [x, z]; }
    if (best) { at(p, best[0], best[1]); let colpi = 0; while (!blk.gone && colpi < 20) { mira(cx, cy, cz); const hp = blk.hp; G.harvest.hit(p); if (blk.hp === hp) break; colpi++; } r.colpiBlocco = colpi; r.bloccoRotto = blk.gone; }
    else r.bloccoRotto = 'nessun posto libero per provare'; }
  // 3. costruzione: due muri paralleli, rampa in mezzo, giocatore sulla rampa che guarda in alto
  { const B = G.build; p.setMode('weapon'); p.res.wood = 500; B.reset && B.reset();
    const ix = Math.floor(-40 / 4), iz = Math.floor(30 / 4), base = Math.floor(G.physics.supportHeight(ix * 4 + 2, iz * 4 + 2, 60) / 4) + 1;
    // muri e rampa piazzati direttamente (a terra non serve supporto: li dichiaro appoggiati)
    const mk = (type, rot, jx, jz) => { const d = { type, ix: jx, iy: base, iz: jz, rot, key: '', center: new T.Vector3(), pattern: 0 }; d.key = A.BuildSystem ? null : null; return d; };
    const K = (t, i, y, k, rot) => t === 'wall' ? `wall:${i},${y},${k},${rot & 1}` : `${t}:${i},${y},${k}`;
    for (const [t, rot, jx, jz] of [['wall', 1, ix, iz], ['wall', 1, ix + 1, iz], ['ramp', 1, ix, iz]]) { const d = mk(t, rot, jx, jz); d.key = K(t, jx, base, jz, rot); const cen = new T.Vector3(); if (t === 'wall') cen.set(jx * 4, base * 4, jz * 4 + 2); else cen.set(jx * 4 + 2, base * 4, jz * 4 + 2); d.center.copy(cen); B.place(d, p, 'wood', null, true); }
    r.pezzi = B.pieces.size;
    // sul primo terzo della rampa (verso +z), guardando in alto
    const s0 = G.physics.supportHeight(ix * 4 + 2, iz * 4 + 1.0, base * 4 + 3); p.pos.set(ix * 4 + 2, s0, iz * 4 + 1.0); p.onGround = true;
    const t = B.computeTarget(p, new T.Vector3(0, 0.75, 0.66).normalize(), 'floor', 0);
    r.bersaglio = { ix: t.ix - ix, iz: t.iz - iz, livello: t.iy - base };
    const v = B.validate(t, p, 'wood'); r.valido = v.ok || v.reason;
    if (v.ok) B.place(t, p, 'wood', v.cols, v.grounded); r.pavimentoMesso = B.grid.has(t.key);
  }
  console.log(JSON.stringify(r, null, 1));
  assert(r.dannoVicino >= 20, 'il piccone non fa danno'); assert.equal(r.dannoLontano, 0, 'piccone oltre la portata');
  assert.equal(r.bloccoRotto, true, 'blocco del castello non rotto'); assert(r.colpiBlocco >= 5 && r.colpiBlocco <= 7);
  assert.deepEqual([r.bersaglio.ix, r.bersaglio.iz, r.bersaglio.livello], [0, 0, 1], 'pavimento non sopra la testa'); assert(r.pavimentoMesso, 'pavimento rifiutato: ' + r.valido);
  console.log('PICCONE E COSTRUZIONI PASS');
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
