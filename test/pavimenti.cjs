// v103: pavimenti delle case distruttibili. Uso: node test/pavimenti.cjs index.html [seme]
// Controlla: ogni casa ha piastrelle; il piano terra non ha buchi; ogni piastrella regge
// finche' c'e', sparisce (fisica + mesh) quando la rompi, torna col riavvio; il soffitto
// sotto il tetto se ne va col tetto.
const { load, THREE: T } = require('./harness.cjs'); const assert = require('assert');
(async () => {
  const file = process.argv[2], c = load(file, +(process.argv[3] || 90210)); await c.init(); const A = c.API;
  const G = { scene: new T.Scene(), physics: new A.Physics() }; const W = new A.World(G); W.build();
  const P = G.physics, tiles = W.floorTiles103n || [], r = {};
  r.case = W.houses92.length; r.piastrelle = tiles.length;
  // 1. ogni casa ha almeno una piastrella al piano terra
  const tileOf = (h) => tiles.filter((t) => Math.abs(t.x - h.x) < h.w / 2 && Math.abs(t.z - h.z) < h.d / 2);
  r.caseSenzaPavimento = W.houses92.filter((h) => !tileOf(h).length).length;
  // 2. piano terra senza buchi: griglia di punti dentro i muri, appoggio alla quota del pavimento
  let buchi = 0, punti = 0;
  for (const h of W.houses92) { const y0 = A.terrainHeight(h.x, h.z), fl = y0 + 0.3;
    for (let i = 1; i < 12; i++) for (let j = 1; j < 12; j++) { const x = h.x - h.w / 2 + 0.2 + (h.w - 0.4) * i / 12, z = h.z - h.d / 2 + 0.2 + (h.d - 0.4) * j / 12; punti++;
      if (P.supportHeight(x, z, fl) < fl - 0.01) buchi++; } }
  r.puntiProvati = punti; r.buchiPianoTerra = buchi;
  // 3. rompi e ripristina ogni piastrella
  let nonReggono = 0, restanoDopo = 0, meshNonSvuotata = 0, nonTornano = 0;
  const reg = (t) => t.cols.every((col) => { const cx = (col.min.x + col.max.x) / 2, cz = (col.min.z + col.max.z) / 2; return P.supportHeight(cx, cz, col.max.y) >= col.max.y - 0.01; });
  const sotto = (t) => t.cols.every((col) => { const cx = (col.min.x + col.max.x) / 2, cz = (col.min.z + col.max.z) / 2; return P.supportHeight(cx, cz, col.max.y) < col.max.y - 0.1; });
  for (const t of tiles) {
    if (!reg(t)) nonReggono++;
    W.removeHarvestable(t);
    if (!sotto(t)) restanoDopo++;
    for (const hd of t.handles) { const a = hd.mesh.geometry.attributes.position.array; for (let k = hd.start * 3; k < (hd.start + hd.count) * 3; k++) if (a[k] !== 0) { meshNonSvuotata++; break; } }
  }
  r.settle103 = !!W.settle103;
  W.restoreHarvestables(); for (const t of tiles) if (!reg(t) || t.gone) nonTornano++;
  Object.assign(r, { nonReggono, restanoDopo, meshNonSvuotata, nonTornano });
  // 4. soffitto e comignolo appartengono al pannello del tetto: 3 maniglie (falda + soffitto + comignolo)
  const tetti = W.harvestables.filter((h) => h.panel && h.maxHp === 180);
  r.tetti = tetti.length; r.tettiSenzaSoffitto = tetti.filter((t) => t.handles.length < 3).length;
  console.log(JSON.stringify(r, null, 1));
  assert(tiles.length >= W.houses92.length, 'poche piastrelle'); assert.equal(r.caseSenzaPavimento, 0);
  assert.equal(buchi, 0, 'buchi nel pavimento'); assert.equal(nonReggono, 0); assert.equal(restanoDopo, 0, 'piastrella rotta ma regge ancora');
  assert.equal(meshNonSvuotata, 0, 'piastrella rotta ma visibile'); assert.equal(nonTornano, 0); assert(r.settle103);
  assert.equal(r.tetti, W.houses92.length); assert.equal(r.tettiSenzaSoffitto, 0);
  console.log('PAVIMENTI PASS');
})().catch((e) => { console.error(e.stack); process.exit(1); });
