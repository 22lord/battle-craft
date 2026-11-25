// v109: i cespugli toccano terra. Per ogni cespuglio si prendono i vertici del modello (versione vicina)
// nella posizione vera e si misura, sotto ognuno, la distanza dal terreno: lo spazio vuoto sotto il
// cespuglio e' il minimo di (vertice - terreno). Prima della v109 era 0,25 x scala (20-35 cm): il modello
// ha la base a y = 0 e la quota aggiungeva l'offset del vecchio cespuglio procedurale.
// Sepolto: il centro scende sotto il terreno di oltre 0,45 x scala (in pendenza il lato a monte affonda, va bene).
// Uso: node test/cespugli109.cjs index.html [SEME] [check]
const { load, THREE } = require('./harness.cjs'); const assert = require('assert');
(async () => {
  const seme = process.argv[3] && /^\d+$/.test(process.argv[3]) ? +process.argv[3] : 90210;
  const c = load(process.argv[2], seme); await c.init(); const A = c.API; const T = THREE;
  const G = { scene: new T.Scene(), physics: new A.Physics(), time: 0, chars: [] };
  const W = new A.World(G); G.world = W; W.build();
  const im = W.veg.mesh.cespuglio[0], pos = im.geometry.attributes.position;
  // vertici bassi del modello (sotto 15 cm): sono quelli che devono appoggiare
  const bassi = []; for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0.15) bassi.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
  const vuoti = [], affondo = [];
  for (const s of W.veg.slot) {
    if (s.tipo !== 'cespuglio') continue; const cs = Math.cos(s.yaw), sn = Math.sin(s.yaw); let min = Infinity;
    for (const [x, y, z] of bassi) { const wx = s.x + (x * cs + z * sn) * s.sc, wz = s.z + (-x * sn + z * cs) * s.sc, wy = s.y + y * s.sc; min = Math.min(min, wy - W.h(wx, wz)); }
    vuoti.push(min); affondo.push((W.h(s.x, s.z) - s.y) / s.sc);
  }
  vuoti.sort((a, b) => a - b); const q = (f) => +vuoti[Math.floor(f * (vuoti.length - 1))].toFixed(3);
  const r = { cespugli: vuoti.length, verticiBassi: bassi.length, vuotoSotto_m: { min: q(0), mediana: q(0.5), p95: q(0.95), max: q(1) }, sopra5cm: vuoti.filter((v) => v > 0.05).length, affondoCentro_suScala: +Math.max(...affondo).toFixed(3) };
  console.log(JSON.stringify(r));
  if (process.argv.includes('check')) { assert(r.sopra5cm === 0, 'cespugli sospesi: ' + r.sopra5cm); assert(r.affondoCentro_suScala < 0.45, 'cespuglio sepolto'); console.log('PASS cespugli109'); }
})().catch((e) => { console.error(e); process.exit(1); });
