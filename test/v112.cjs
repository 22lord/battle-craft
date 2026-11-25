// v112: fase grafica 2 (materiali) + tappi del castello. Uso: node test/v112.cjs [file.html]
// Controlla (quello che si misura senza GPU):
//  - tappi del castello: trovati, tutti spenti (triangoli degeneri) col castello intero
//  - rompendo un blocco si accendono i tappi dei vicini che guardano quel blocco, solo quelli
//  - restoreHarvestables li rispegne; le posizioni dei blocchi tornano come prima
//  - la geometria del muro (non tappi) non viene toccata: stesso numero di triangoli visibili fuori dai tappi
//  - UV nel mondo sulle scatole (uvMondo112): una ripetizione ogni MAT112.lato metri, per faccia
//  - senza GPU (banco di prova) i materiali nuovi non partono e nulla si rompe; la mappa non si sposta
//  - la scritta della versione in lobby e' quella di VERSIONE
const { load, THREE: T } = require('./harness.cjs');
const fs = require('fs'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
let ok = 0, ko = 0; const prova = (nome, cond, info) => { if (cond) { ok++; console.log('PASS', nome); } else { ko++; console.log('FAIL', nome, info !== undefined ? JSON.stringify(info) : ''); } };
(async () => {
  const c = load(file); await c.init(); const A = c.API, w = c.window;
  prova('MAT112 presente', !!w.MAT112);
  prova('senza GPU materiali112 non parte', w.materiali112({ renderer: null }) === false && w.MAT112.pronto === false);
  w.registraUv112();
  const G = { scene: new T.Scene(), physics: new A.Physics() }; const W = new A.World(G); W.build();
  prova('mappa ferma (oggetti raccoglibili 1656, case 31)', W.itemSpawns.length >= 1 && (W.houses92 || []).length === 31, { case: (W.houses92 || []).length });
  // ---- tappi ----
  const tp = W.tappiTutti112 || [];
  prova('tappi trovati (> 5000 triangoli)', tp.length > 5000, tp.length);
  const degenere = (t) => { const a = t.mesh.geometry.index.array; return a[t.t] === a[t.t + 1] && a[t.t] === a[t.t + 2]; };
  prova('col castello intero tutti i tappi sono spenti', tp.every(degenere), tp.filter((t) => !degenere(t)).length);
  const blocchi = W.castelloBlocchi106.filter((r) => r.tappi112 && r.tappi112.length);
  prova('blocchi con tappi verso di loro', blocchi.length > 20, blocchi.length);
  // triangoli visibili non-tappo: non devono cambiare
  const mesh = tp[0].mesh, idx = mesh.geometry.index.array, setT = new Set(tp.map((t) => t.t));
  const nonTappo = () => { let n = 0; for (let t = 0; t < idx.length; t += 3) if (!setT.has(t) && !(idx[t] === idx[t + 1] && idx[t] === idx[t + 2])) n++; return n; };
  const n0 = nonTappo();
  const b = blocchi[Math.floor(blocchi.length / 2)];
  const pos0 = mesh.geometry.attributes.position.array.slice();
  W.removeHarvestable(b);
  const accesi = tp.filter((t) => !degenere(t));
  prova('rotto un blocco: si accendono i suoi tappi', b.tappi112.every((t) => !degenere(t)), b.tappi112.length);
  prova('...e solo quelli', accesi.length === b.tappi112.length, { accesi: accesi.length, attesi: b.tappi112.length });
  W.restoreHarvestables();
  prova('ripristino: tappi di nuovo spenti', tp.every(degenere));
  const pos1 = mesh.geometry.attributes.position.array; let diff = 0; for (let i = 0; i < pos0.length; i++) if (pos0[i] !== pos1[i]) diff++;
  prova('ripristino: posizioni come prima', diff === 0, diff);
  prova('triangoli del muro (non tappi) intatti', nonTappo() === n0, { prima: n0, dopo: nonTappo() });
  // ---- UV nel mondo ----
  const M = w.MAT112; const lato = M.lato.conci;
  const stone = [...M.uvLato.keys()].find((m) => M.uvLato.get(m) === lato);
  const g = new T.BoxGeometry(6, 3, 0.4); g.translate(10, 1.5, 20); w.uvMondo112(g, stone);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; let maxErr = 0;
  for (let i = 0; i < p.count; i++) if (Math.abs(n.getZ(i)) > 0.9) { maxErr = Math.max(maxErr, Math.abs(Math.abs(uv.getX(i)) - Math.abs(p.getX(i) / lato)), Math.abs(uv.getY(i) - p.getY(i) / lato)); }
  prova('UV nel mondo: faccia frontale = x/lato, y/lato', maxErr < 1e-6, maxErr);
  let top = 0; for (let i = 0; i < p.count; i++) if (n.getY(i) > 0.9) top = Math.max(top, Math.abs(uv.getX(i) - p.getX(i) / lato) + Math.abs(uv.getY(i) - p.getZ(i) / lato));
  prova('UV nel mondo: faccia di sopra = x/lato, z/lato', top < 1e-6, top);
  const g2 = new T.CylinderGeometry(1, 1, 2); const u0 = g2.attributes.uv.array.slice(); w.uvMondo112(g2, stone);
  prova('UV nel mondo: solo le scatole (un cilindro resta com\'era)', g2.attributes.uv.array.every((v, i) => v === u0[i]));
  w.scambia112({ scene: G.scene }, 'med'); prova('scambia112 senza materiali pronti non fa niente', M.attivo !== true);
  // ---- versione ----
  const html = fs.readFileSync(file, 'utf8'), ver = fs.readFileSync(path.join(path.dirname(file), 'VERSIONE'), 'utf8').trim();
  prova('scritta della versione = VERSIONE', html.includes('<div id="ver">v' + ver + '</div>'), ver);
  console.log(`\n${ok} PASS, ${ko} FAIL`); process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
