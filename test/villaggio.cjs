// v103: villaggio dei pescatori. Uso: node test/villaggio.cjs index.html [seme]
// Controlla: le case ci sono e stanno sull'asciutto; i pontili si calpestano dall'inizio
// alla punta e finiscono in acqua profonda; il faro c'e' e ha la collisione; il bottino
// sui pontili si appoggia sulle tavole; nessun bot atterra dentro una casa del villaggio.
const { load, THREE: T } = require('./harness.cjs'); const assert = require('assert');
(async () => {
  const file = process.argv[2], c = load(file, +(process.argv[3] || 90210)); await c.init(); const A = c.API;
  const G = { scene: new T.Scene(), physics: new A.Physics() }; const W = new A.World(G); W.build();
  const P = G.physics, V = W.villaggio103, r = {};
  r.case = V.case.length; r.pontili = V.pontili.length; r.faro = !!V.faro;
  // case sull'asciutto: terreno sotto i 4 spigoli sopra il mare
  r.caseInAcqua = V.case.filter((h) => { const o = W.houses92.find((q) => q.x === h.x && q.z === h.z); return [[-1, -1], [1, -1], [-1, 1], [1, 1]].some(([a, b]) => A.terrainHeight(h.x + a * o.w / 2, h.z + b * o.d / 2) < 0.2); }).length;
  // pontili: appoggio continuo sulle tavole, punta in acqua profonda
  // si campiona ogni asse dentro la sua impronta: fra un'asse e l'altra c'e' una fuga di 8 cm
  // voluta (il legno si riconosce dalle righe), che una capsula da ~60 cm scavalca
  r.pontiliDettaglio = V.pontili.map((p) => { let buchi = 0; const s = Math.sign(p.x1 - p.x0); for (let i = 0; i < p.rows; i++) for (const du of [-0.5, 0, 0.5]) { const x = p.x0 + s * (0.65 + i * 1.3 + du); for (const dz of [-0.8, 0, 0.8]) if (P.supportHeight(x, p.z + dz, p.y + 0.3) < p.y - 0.05) buchi++; }
    return { buchi, acquaInPunta_m: +(-A.terrainHeight(p.x1, p.z)).toFixed(2), lunghezza_m: +Math.abs(p.x1 - p.x0).toFixed(1) }; });
  // faro: la collisione c'e' (un raggio orizzontale a 5 m di quota lo colpisce)
  if (V.faro) { const o = new T.Vector3(V.faro.x + 10, V.faro.y + 5, V.faro.z), d = new T.Vector3(-1, 0, 0); const h = P.raycast(o, d, 20, { chars: false }); r.faroColpito = !!(h && h.hit); }
  // bottino sui pontili
  const sp = W.itemSpawns.filter(([t, x, z]) => V.pontili.some((p) => Math.abs(x - p.x1) < 0.01 && Math.abs(z - p.z) < 0.01));
  r.bottinoSuiPontili = sp.map(([t, x, z, yo]) => +(P.supportHeight(x, z, A.terrainHeight(x, z) + yo + 1.5)).toFixed(2));
  r.botInCasa = W.botSpawns.filter(([x, z]) => W.nearHouse92(x, z)).length;
  console.log(JSON.stringify(r, null, 1));
  assert(r.case >= 5, 'poche case nel villaggio'); assert.equal(r.caseInAcqua, 0); assert.equal(r.pontili, 3); assert(r.faro && r.faroColpito);
  for (const p of r.pontiliDettaglio) { assert.equal(p.buchi, 0, 'pontile con buchi'); assert(p.acquaInPunta_m >= 0.8, 'pontile in secca'); }
  assert(r.bottinoSuiPontili.length === 3 && r.bottinoSuiPontili.every((y) => Math.abs(y - V.pontili[0].y) < 0.05), 'bottino non sulle tavole');
  assert.equal(r.botInCasa, 0);
  console.log('VILLAGGIO PASS');
})().catch((e) => { console.error(e.stack); process.exit(1); });
