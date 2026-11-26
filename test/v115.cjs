// v115: le auto di Lorenzo. Uso: node test/v115.cjs [file.html] [seme]
// Controlla: modello caricato (3 pezzi, leggero); tutte le auto col modello nuovo; un colore diverso per auto;
// tetto scuro sulle auto chiare; auto lungo i sentieri (almeno 6), parallele al sentiero, in piano, fuori
// dall'acqua, lontane fra loro, fuori da case/porte/collisioni; la collisione contiene la carrozzeria;
// il piccone le distrugge ancora; i sentieri non cambiano gli alberi (caso con seme proprio).
const { load, THREE: T } = require('./harness.cjs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
let ok = 0, ko = 0; const prova = (nome, cond, info) => { if (cond) { ok++; console.log('PASS', nome); } else { ko++; console.log('FAIL', nome, info !== undefined ? JSON.stringify(info) : ''); } };
(async () => {
  const c = load(file); await c.init(); const A = c.API;
  const mod = A.getAuto115();
  { let tri = 0, pezzi = 0; if (mod) mod.traverse((o) => { if (o.isMesh) { tri += o.geometry.index.count / 3; pezzi++; } });
    prova('modello dell\'auto caricato, 3 pezzi', !!mod && pezzi === 3, pezzi);
    prova('modello leggero (meno di 20.000 triangoli)', tri > 5000 && tri < 20000, tri); }
  const G = { scene: new T.Scene(), physics: new A.Physics(), chars: [] };
  const W = new A.World(G); W.build();
  const auto = W.harvestables.filter((h) => h.col && h.col.tag === 'car');
  prova('tutte le auto col modello nuovo', auto.length > 0 && auto.every((h) => h.colore115 !== undefined), auto.length);
  const N = W.autoStrade115N || 0;
  const D = W.autoDove115 || [], nS = D.filter((d) => d.dove === 'sentiero').length, nC = D.filter((d) => d.dove === 'casa').length;
  prova('auto in piu\' fuori citta\' (almeno 8: sentieri + accanto alle case)', N >= 8 && N === D.length, { N, nS, nC });
  prova('ci sono sia auto lungo i sentieri sia accanto alle case', nS >= 2 && nC >= 2, { nS, nC });
  prova('auto in tutto: citta\' + fuori', auto.length === 3 + N, auto.length);
  const colori = auto.map((h) => h.colore115);
  prova('un colore diverso per ogni auto', new Set(colori).size === colori.length, colori.map((x) => x.toString(16)));
  { // materiali: carrozzeria del colore giusto; tetto scuro solo sulle chiare
    let giusto = true, tetti = true;
    for (const h of auto) {
      let corpo = null, tetto = null; h.group.traverse((o) => { if (o.isMesh && o.material.name === 'carrozzeria') corpo = o.material; if (o.isMesh && o.material.name === 'tetto') tetto = o.material; });
      if (!corpo || corpo.color.getHex() !== new T.Color(h.colore115).getHex()) giusto = false;
      const cc = new T.Color(h.colore115), chiara = cc.r * 0.3 + cc.g * 0.59 + cc.b * 0.11 > 0.7;
      const scuro = tetto && tetto.color.getHex() === new T.Color(0x2b2e34).getHex(); if (chiara !== !!scuro) tetti = false;
    }
    prova('carrozzeria del colore dell\'auto', giusto); prova('tetto scuro sulle auto chiare, bianco sulle altre', tetti);
  }
  // auto aggiunte: le ultime N, nell'ordine di autoDove115
  const extra = auto.slice(auto.length - N), strade = extra.filter((h, i) => D[i].dove === 'sentiero'), accantoCase = extra.filter((h, i) => D[i].dove === 'casa');
  { let ok2 = true; const info = [];
    for (const h of accantoCase) {
      // casa piu' vicina: l'auto e' parallela al muro che ha accanto, e a 0,5-2,5 m da esso
      let best = null, bd = 1e9; for (const c of W.houses92) { const d = Math.hypot(h.x - c.x, h.z - c.z); if (d < bd) { bd = d; best = c; } }
      const ex = Math.abs(h.x - best.x) - best.w / 2, ez = Math.abs(h.z - best.z) - best.d / 2, lungoZ = ex > ez;   // di fianco al muro est/ovest: auto lungo z
      const rot = h.group.rotation.y, asseZ = Math.abs(Math.sin(rot)) > 0.99, asseX = Math.abs(Math.cos(rot)) > 0.99, gap = Math.max(ex, ez) - 0.95;
      if (!(lungoZ ? asseZ : asseX) || gap < 0.5 || gap > 2.5) { ok2 = false; info.push({ x: h.x, z: h.z, lungoZ, gap }); }
    }
    prova('auto accanto alle case: parallele al muro, a 0,5-2,5 m', ok2, info);
  }
  { let parallele = true, piano = true, asciutte = true, info = [];
    for (const h of strade.concat(accantoCase)) {
      const rot = h.group.rotation.y, fx = Math.cos(rot), fz = -Math.sin(rot);
      // tratto di sentiero piu' vicino
      let best = null, bd = 1e9;
      for (const p of A.PATHS) for (let i = 0; i + 1 < p.length; i++) { const [x0, z0] = p[i], [x1, z1] = p[i + 1], dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz; const t = Math.max(0, Math.min(1, ((h.x - x0) * dx + (h.z - z0) * dz) / L2)); const d = Math.hypot(h.x - x0 - dx * t, h.z - z0 - dz * t); if (d < bd) { bd = d; best = [dx, dz]; } }
      const L = Math.hypot(best[0], best[1]), dot = Math.abs((fx * best[0] + fz * best[1]) / L);
      if (strade.includes(h) && dot < 0.98) { parallele = false; info.push({ x: h.x, z: h.z, dot }); }
      let hmin = 1e9, hmax = -1e9; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const lx = a * 2, lz = b * 0.9, hh = A.terrainHeight(h.x + lx * Math.cos(rot) + lz * Math.sin(rot), h.z - lx * Math.sin(rot) + lz * Math.cos(rot)); hmin = Math.min(hmin, hh); hmax = Math.max(hmax, hh); }
      if (hmax - hmin > 0.5) piano = false; if (hmin < A.MARE + 0.3) asciutte = false;
    }
    prova('auto dei sentieri parallele al sentiero', parallele, info);
    prova('auto aggiunte in piano (ruote entro 50 cm)', piano);
    prova('auto dei sentieri fuori dall\'acqua', asciutte);
  }
  { let minD = 1e9; for (let i = 0; i < auto.length; i++) for (let j = i + 1; j < auto.length; j++) minD = Math.min(minD, Math.hypot(auto[i].x - auto[j].x, auto[i].z - auto[j].z));
    prova('auto distanti fra loro (almeno 8 m)', minD >= 8, minD); }
  { // dentro collisioni altrui (case, lampioni, rocce, alberi...) o davanti alle porte
    const tmp = []; let libere = true, porte = true; const dove = [];
    for (const h of auto) {
      const q = G.physics.query(h.col.min, h.col.max, tmp).filter((o) => o !== h.col && o.type === 'box' && o.tag !== 'piece' && o.max.y > h.col.min.y + 0.5);
      if (q.length) { libere = false; dove.push([+h.x.toFixed(1), +h.z.toFixed(1), q.map((o) => o.tag)]); }
      if ((W.porte102 || []).some((p) => Math.abs(h.x - p.x) < p.hx + 1 && Math.abs(h.z - p.z) < p.hz + 1)) porte = false;
    }
    prova('nessuna auto dentro altre collisioni', libere, dove); prova('nessuna auto davanti a una porta', porte);
  }
  { // la collisione contiene la carrozzeria (specchietti esclusi: 10 cm di margine)
    let dentro = true; const fuori = [];
    for (const h of auto) {
      let b = new T.Box3(); h.group.updateMatrixWorld(true); h.group.traverse((o) => { if (o.isMesh && o.material.name === 'carrozzeria') b.union(new T.Box3().setFromObject(o)); });
      const m = 0.12; if (b.min.x < h.col.min.x - m || b.max.x > h.col.max.x + m || b.min.z < h.col.min.z - m || b.max.z > h.col.max.z + m || b.max.y > h.col.max.y + m) { dentro = false; fuori.push([h.x, h.z]); }
    }
    prova('la collisione contiene la carrozzeria anche con l\'auto storta', dentro, fuori);
  }
  { const h = auto[auto.length - 1]; W.removeHarvestable(h); prova('il piccone distrugge ancora l\'auto (sparisce e la collisione si toglie)', h.gone && !h.group.visible || !G.physics.all.has(h.col), { gone: h.gone, vis: h.group.visible }); }
  console.log(`\n${ok} PASS, ${ko} FAIL`); process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
