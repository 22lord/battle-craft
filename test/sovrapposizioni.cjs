// v106: oggetti del mondo che si compenetrano. Uso: node test/sovrapposizioni.cjs index.html [seme] [check]
// Dopo World.build() confronta le scatole di collisione degli oggetti "singoli" (lampioni, auto,
// massi, alberi, panchine, siepi, recinti) fra loro e con le strutture (case, castello, moli...).
// I massi si allargano alla misura della mesh (la collisione e' il 70-75% della roccia vista).
// Con "check" fallisce se trova lampioni dentro auto/case, massi dentro case o castello, auto dentro
// case, alberi dentro case.
const { load, THREE: T } = require('./harness.cjs'); const assert = require('assert');
(async () => {
  const file = process.argv[2] || 'index.html', seed = +(process.argv[3] || 90210), check = process.argv.includes('check');
  const c = load(file, seed); await c.init(); const A = c.API;
  const G = { scene: new T.Scene(), physics: new A.Physics() }; const W = new A.World(G); W.build();
  const P = G.physics, all = [...P.all].filter((k) => k.type === 'box');
  const cat = (k) => k.castello ? 'castello' : k.harvest && k.harvest.cols ? 'casa' : k.tag === 'static' ? 'struttura' : k.tag;
  const ext = (k) => { const s = k.tag === 'rock' ? 1 / 0.72 - 1 : 0; const hx = (k.max.x - k.min.x) / 2 * s, hz = (k.max.z - k.min.z) / 2 * s; return [k.min.x - hx, k.min.y, k.min.z - hz, k.max.x + hx, k.max.y, k.max.z + hz]; };
  const SINGOLI = new Set(['lamp', 'car', 'rock', 'tree', 'bench', 'hedge']);
  const coppie = {}, esempi = {}, visti = new Set(), tmp = [], mn = new T.Vector3(), mx = new T.Vector3();
  for (const a of all) {
    const ca = cat(a); if (!SINGOLI.has(ca)) continue;
    const ea = ext(a); mn.set(ea[0], ea[1], ea[2]); mx.set(ea[3], ea[4], ea[5]); P.query(mn, mx, tmp);
    for (const b of [...tmp]) {
      if (b === a || b.type !== 'box') continue; const cb = cat(b); if (cb === 'piece') continue;
      if (ca === cb && (ca === 'rock' || ca === 'tree' || ca === 'hedge')) continue;   // gruppi di massi o alberi vicini: voluti
      const eb = ext(b); const ox = Math.min(ea[3], eb[3]) - Math.max(ea[0], eb[0]), oz = Math.min(ea[5], eb[5]) - Math.max(ea[2], eb[2]), oy = Math.min(ea[4], eb[4]) - Math.max(ea[1], eb[1]);
      if (ox < 0.05 || oz < 0.05 || oy < 0.05) continue;
      // il masso sotto terra o il piede del lampione che sfiora il pavimento a filo non contano
      if (cb === 'casa' || cb === 'struttura' || cb === 'castello') { if (eb[4] < ea[1] + 0.12 && ca !== 'rock') continue; }
      const key = [ca, cb].sort().join('×'), id = [a, b].map((k) => P.all.size).join(); const pid = a._id || (a._id = Math.random()); const qid = b._id || (b._id = Math.random());
      const u = pid < qid ? pid + ':' + qid : qid + ':' + pid; if (visti.has(u)) continue; visti.add(u);
      if (process.argv.includes("dett") && key === "rock×struttura") console.log("  ", JSON.stringify(ea.map(v=>+v.toFixed(1))), JSON.stringify(eb.map(v=>+v.toFixed(1))), b.tag);
      coppie[key] = (coppie[key] || 0) + 1; (esempi[key] || (esempi[key] = [])).length < 4 && esempi[key].push([+((a.min.x + a.max.x) / 2).toFixed(1), +((a.min.z + a.max.z) / 2).toFixed(1)]);
    }
  }
  console.log('seme', seed, JSON.stringify(coppie)); for (const k in esempi) console.log(' ', k, JSON.stringify(esempi[k]));
  if (check) {
    const vietate = ['car×lamp', 'casa×lamp', 'lamp×struttura', 'casa×rock', 'castello×rock', 'car×casa', 'casa×tree', 'castello×tree', 'castello×lamp', 'car×castello', 'car×rock', 'car×tree', 'lamp×rock', 'lamp×tree', 'bench×lamp', 'bench×car', 'bench×rock', 'bench×tree', 'rock×struttura', 'struttura×tree'];
    const male = vietate.filter((k) => coppie[k]); assert.equal(male.length, 0, 'sovrapposizioni: ' + male.map((k) => k + '=' + coppie[k]).join(' '));
    console.log('SOVRAPPOSIZIONI PASS');
  }
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
