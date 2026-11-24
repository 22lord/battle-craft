// v105: il castello sulla cresta est. Uso: node test/castello.cjs index.html [seme]
// Controlla: il modello si carica e ha le collisioni; nessuna casa addosso alle mura; nessun
// bot atterra dentro; si entra dalla porta camminando fino al mastio; c'e' bottino nel
// cortile e sui camminamenti, appoggiato su qualcosa; il terreno sotto il cortile e' piano.
const { load, THREE: T } = require('./harness.cjs'); const assert = require('assert');
(async () => {
  const file = process.argv[2], c = load(file, +(process.argv[3] || 90210)); await c.init(); const A = c.API;
  const G = { scene: new T.Scene(), physics: new A.Physics() }; const W = new A.World(G); W.build();
  const C = W.castello105, P = G.physics, r = {};
  assert(C, 'castello non costruito');
  r.scatole = W.castelloCols105.length;
  r.caseAddosso = W.houses92.filter((h) => Math.abs(h.x - C.x) < C.mezzo + h.w / 2 + 2 && h.z - C.z < C.mezzo + h.d / 2 + 2 && C.z - h.z < C.mezzo + C.davanti + h.d / 2 + 2).length;
  r.botDentro = W.botSpawns.filter(([x, z]) => Math.abs(x - C.x) < C.mezzo && Math.abs(z - C.z) < C.mezzo).length;
  let dislivello = 0; for (let x = -20; x <= 20; x += 2) for (let z = -20; z <= 20; z += 2) dislivello = Math.max(dislivello, Math.abs(A.terrainHeight(C.x + x, C.z + z) - C.y));
  r.cortileDislivello_cm = +(dislivello * 100).toFixed(1);
  // dal sentiero, attraverso la porta, verso nord
  const ch = { pos: new T.Vector3(C.x - 0.6, 0, C.z - 30), vel: new T.Vector3(), radius: 0.38, height: 1.75, onGround: true, alive: true }; ch.pos.y = A.terrainHeight(ch.pos.x, ch.pos.z);
  for (let i = 0; i < 60 * 12; i++) { ch.vel.set(0, 0, 4.6); P.moveCharacter(ch, 1 / 60); }
  r.entrato_m = +(ch.pos.z - (C.z - C.mezzo)).toFixed(1); r.quotaDentro = +(ch.pos.y - C.y).toFixed(2);
  // v106: nelle torri si entra dal cortile. Colonne delle porte ricavate dal modello (vedi
  // tools/castello/costruisci.cjs): si cammina lungo l'asse della porta per 6 m partendo da 3 m fuori
  r.torriEntrate = 0;
  for (const [p1, p2] of [[[-15.39, 13.84], [-13.79, 15.44]], [[-13.64, -15.33], [-15.16, -13.70]], [[13.87, 15.49], [15.47, 13.98]], [[15.26, -13.51], [13.59, -15.21]]]) {
    const mx = (p1[0] + p2[0]) / 2, mz = (p1[1] + p2[1]) / 2; let px = p2[0] - p1[0], pz = p2[1] - p1[1]; const L = Math.hypot(px, pz); px /= L; pz /= L;
    let ax = -pz, az = px; if (ax * mx + az * mz < 0) { ax = -ax; az = -az; }
    const t = { pos: new T.Vector3(C.x + mx - ax * 3, 0, C.z + mz - az * 3), vel: new T.Vector3(), radius: 0.38, height: 1.75, onGround: true, alive: true }; t.pos.y = P.supportHeight(t.pos.x, t.pos.z, C.y + 1);
    for (let i = 0; i < 120; i++) { t.vel.set(ax * 3, t.vel.y, az * 3); P.moveCharacter(t, 1 / 60); }
    if ((t.pos.x - C.x - mx) * ax + (t.pos.z - C.z - mz) * az > 2.5 && t.pos.y - C.y < 1) r.torriEntrate++;
  }
  // v106: blocchi distruttibili: rompendone uno spariscono le sue scatole
  r.blocchi = (W.castelloBlocchi106 || []).length;
  { const muro = W.castelloBlocchi106.find((b) => b.cols.length > 20 && b.handles.length > 0); const n0 = P.all.size; W.removeHarvestable(muro); r.blocchoRottoScatoleTolte = n0 - P.all.size; W.restoreHarvestables(); r.ripristinato = P.all.size === n0; }
  // le mura fermano chi arriva da fuori sul fianco
  const ch2 = { pos: new T.Vector3(C.x - 35, 0, C.z + 5), vel: new T.Vector3(), radius: 0.38, height: 1.75, onGround: true, alive: true }; ch2.pos.y = A.terrainHeight(ch2.pos.x, ch2.pos.z);
  for (let i = 0; i < 60 * 12; i++) { ch2.vel.set(4.6, 0, 0); P.moveCharacter(ch2, 1 / 60); }
  r.fermatoDalleMura = ch2.pos.x < C.x - 15;
  r.bottino = C.bottino;
  const sp = W.itemSpawns.filter(([t, x, z]) => Math.abs(x - C.x) < C.mezzo && Math.abs(z - C.z) < C.mezzo);
  r.bottinoAppoggiato = sp.every(([t, x, z, yo]) => { const y = A.terrainHeight(x, z) + yo; return Math.abs(P.supportHeight(x, z, y + 0.3) - y) < 0.1; });
  r.bottinoInAlto = sp.filter(([t, x, z, yo]) => A.terrainHeight(x, z) + yo - C.y > 4).length;
  // a piedi si arriva a tutto il bottino: ricerca sulla griglia dei punti dove si sta in piedi,
  // gradini fino a 0,7 m (come la fisica), testa libera sopra il gradino
  { const st = 0.35, o = -28, N = Math.ceil(56 / st), mn = new T.Vector3(), mx = new T.Vector3(), seen = new Set(), q = [];
    const stand = (x, z, yRef) => { const s = P.supportHeight(x, z, yRef); mn.set(x - 0.2, s + 0.75, z - 0.2); mx.set(x + 0.2, s + 1.7, z + 0.2); return P.overlapsAny(mn, mx) ? null : s; };
    const k = (i, j, h) => i + ',' + j + ',' + Math.round(h * 4);
    const i0 = Math.round((-0.6 - o) / st), j0 = Math.round((-10 - o) / st), s0 = stand(C.x + o + i0 * st, C.z + o + j0 * st, C.y + 1); q.push([i0, j0, s0]); seen.add(k(i0, j0, s0));
    while (q.length) { const [i, j, h] = q.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const I = i + di, J = j + dj; if (I < 0 || J < 0 || I >= N || J >= N) continue; const s = stand(C.x + o + I * st, C.z + o + J * st, h + 0.7); if (s === null || s < h - 1) continue; const kk = k(I, J, s); if (!seen.has(kk)) { seen.add(kk); q.push([I, J, s]); } } }
    r.bottinoIrraggiungibile = sp.filter(([t, x, z, yo]) => { const y = A.terrainHeight(x, z) + yo, I = Math.round((x - C.x - o) / st), J = Math.round((z - C.z - o) / st); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let d = -1; d <= 1; d++) if (seen.has((I + a) + ',' + (J + b) + ',' + (Math.round(y * 4) + d))) return false; return true; }).length; }
  console.log(JSON.stringify(r, null, 1));
  assert(r.scatole > 1000, 'collisioni mancanti'); assert.equal(r.caseAddosso, 0); assert.equal(r.botDentro, 0);
  assert(r.cortileDislivello_cm < 1, 'cortile non piano'); assert(r.entrato_m > 15, 'non si entra dalla porta'); assert(Math.abs(r.quotaDentro) < 1.0); assert.equal(r.torriEntrate, 4, 'torri chiuse'); assert(r.blocchi > 100 && r.blocchoRottoScatoleTolte > 20 && r.ripristinato, 'blocchi distruttibili');
  assert(r.fermatoDalleMura, 'le mura non fermano'); assert.equal(r.bottinoIrraggiungibile, 0, 'bottino irraggiungibile'); assert(r.bottino >= 6 && r.bottinoAppoggiato && r.bottinoInAlto >= 2);
  console.log('CASTELLO PASS');
})().catch((e) => { console.error(e.stack); process.exit(1); });
