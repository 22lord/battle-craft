/* v115: prepara l'auto di Lorenzo (macchina_citycar_v4.obj) per il gioco.
   L'OBJ e' di 32 MB, ~570.000 triangoli in 94 pezzi, 12 materiali per nome, normali ma niente UV, e il suo
   .mtl non c'e': i colori li mettiamo qui (MATERIALI). La carrozzeria si ritinge nel gioco, auto per auto.
   Il commento in testa all'OBJ non viene copiato (nomina il gioco di riferimento: vincolo 1 del CONTESTO).
   Qui: un primitivo per materiale, vertici saldati per (posizione, normale), semplificazione con meshoptimizer
   (i confini fra materiali restano fermi: LockBorder), uscita GLB senza texture.
   Uso:  node tools/macchina115/prepara.cjs [ingresso.obj] [uscita.glb]
   Serve meshoptimizer nella radice (vedi tools/forziere114/prepara.cjs per l'installazione). */
const path = require('path'), fs = require('fs');
const { scrivi } = require('../forziere114/glb.cjs');
const RAD = path.join(__dirname, '..', '..');
const IN = process.argv[2] || path.join(RAD, 'macchina_citycar_v4.obj');
const OUT = process.argv[3] || path.join(RAD, 'assets', 'macchina115', 'macchina115.glb');
const ERRORE = 0.0025;   // relativo alla grandezza del pezzo; l'auto e' lunga 4 m -> ~1 cm

// colori in sRGB (il lettore del gioco li prende come lineari: qui li converto). carrozzeria: segnaposto, ritinta nel gioco
const MATERIALI = {
  carrozzeria: { c: 0xd24a3a, r: 0.42, m: 0.1 },
  tetto: { c: 0xf2f0ea, r: 0.5, m: 0.05 },
  scocca_scura: { c: 0x2b2e34, r: 0.75, m: 0.1 },
  vetro: { c: 0x5f8fb8, r: 0.12, m: 0.4 },
  cromo: { c: 0xc9ced6, r: 0.25, m: 0.85 },
  griglia: { c: 0x1b1c20, r: 0.8, m: 0.2 },
  targa: { c: 0xf4f4f0, r: 0.6, m: 0 },
  faro_vetro: { c: 0xe6f0fa, r: 0.1, m: 0.2, e: [0.25, 0.27, 0.3] },
  led: { c: 0xffffff, r: 0.3, m: 0, e: [0.9, 0.95, 1] },
  stop: { c: 0xc8231e, r: 0.3, m: 0, e: [0.35, 0.03, 0.02] },
  faro: { c: 0xfff1c2, r: 0.3, m: 0, e: [0.6, 0.55, 0.35] },
  gomma: { c: 0x1c1c1e, r: 0.92, m: 0 },
};
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

(async () => {
  const { MeshoptSimplifier } = require(path.join(RAD, 'node_modules', 'meshoptimizer'));
  await MeshoptSimplifier.ready;
  const righe = fs.readFileSync(IN, 'utf8').split('\n');
  const V = [], N = [], per = new Map();   // materiale -> { mappa "v/n" -> indice, pos, nor, idx }
  let mat = 'carrozzeria', triPrima = 0;
  for (const l of righe) {
    if (l.startsWith('v ')) { const p = l.trim().split(/\s+/); V.push(+p[1], +p[2], +p[3]); }
    else if (l.startsWith('vn ')) { const p = l.trim().split(/\s+/); N.push(+p[1], +p[2], +p[3]); }
    else if (l.startsWith('usemtl')) mat = l.slice(7).trim();
    else if (l.startsWith('f ')) {
      let P = per.get(mat); if (!P) { P = { mappa: new Map(), pos: [], nor: [], idx: [] }; per.set(mat, P); }
      const ids = l.trim().split(/\s+/).slice(1).map((t) => {
        const [vi, , ni] = t.split('/'); const k = vi + '/' + ni; let i = P.mappa.get(k);
        if (i === undefined) { i = P.pos.length / 3; P.mappa.set(k, i); const a = (+vi - 1) * 3, b = (+ni - 1) * 3; P.pos.push(V[a], V[a + 1], V[a + 2]); P.nor.push(N[b], N[b + 1], N[b + 2]); }
        return i;
      });
      for (let k = 1; k + 1 < ids.length; k++) { P.idx.push(ids[0], ids[k], ids[k + 1]); triPrima++; }
    }
  }
  /* Tre pezzi soli per auto (3 draw call invece di 12): carrozzeria e tetto, che il gioco ritinge, e tutto il
     resto in un pezzo col colore nei vertici (cromo e fari perdono metallo ed emissione: nello stile cartoon
     non si nota, e 13 auto x 12 materiali erano oltre 150 draw call) */
  const PEZZI = { carrozzeria: 'carrozzeria', tetto: 'tetto' };
  const gruppi = new Map();   // pezzo -> [{ nome, pos, nor, idx }]
  const materiali = [], prim = [], conta = {};
  for (const [nome, P] of per) {
    const D = MATERIALI[nome] || { c: 0xff00ff, r: 0.5, m: 0 };
    const pos = new Float32Array(P.pos), nor = new Float32Array(P.nor);
    const [s] = MeshoptSimplifier.simplify(new Uint32Array(P.idx), pos, 3, 0, ERRORE, ['LockBorder']);
    // compatta
    const map = new Int32Array(pos.length / 3).fill(-1); let n = 0; for (const v of s) if (map[v] < 0) map[v] = n++;
    const p2 = new Float32Array(n * 3), n2 = new Float32Array(n * 3), i2 = new Uint32Array(s.length);
    for (let v = 0; v < map.length; v++) { const k = map[v]; if (k < 0) continue; for (let j = 0; j < 3; j++) { p2[k * 3 + j] = pos[v * 3 + j]; n2[k * 3 + j] = nor[v * 3 + j]; } }
    for (let i = 0; i < s.length; i++) i2[i] = map[s[i]];
    const pezzo = PEZZI[nome] || 'resto';
    if (!gruppi.has(pezzo)) gruppi.set(pezzo, []);
    gruppi.get(pezzo).push({ D, pos: p2, nor: n2, idx: i2 });
    conta[nome] = [P.idx.length / 3, s.length / 3];
  }
  // unione dei pezzi: il colore di ogni materiale va nei vertici (lineare)
  for (const [pezzo, lista] of gruppi) {
    let nv = 0, ni = 0; for (const q of lista) { nv += q.pos.length / 3; ni += q.idx.length; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
    let ov = 0, oi = 0;
    for (const q of lista) {
      const n = q.pos.length / 3, c = [lin(q.D.c >> 16 & 255), lin(q.D.c >> 8 & 255), lin(q.D.c & 255)];
      // fari, led e stop: piu' chiari, al posto dell'emissione persa
      if (q.D.e) for (let j = 0; j < 3; j++) c[j] = Math.min(1, c[j] + q.D.e[j] * 0.5);
      pos.set(q.pos, ov * 3); nor.set(q.nor, ov * 3); for (let v = 0; v < n; v++) col.set(c, (ov + v) * 3);
      for (let i = 0; i < q.idx.length; i++) idx[oi + i] = q.idx[i] + ov;
      ov += n; oi += q.idx.length;
    }
    const D = pezzo === 'resto' ? { r: 0.55, m: 0.15 } : lista[0].D;
    const base = pezzo === 'resto' ? [1, 1, 1, 1] : [lin(D.c >> 16 & 255), lin(D.c >> 8 & 255), lin(D.c & 255), 1];
    materiali.push({ name: pezzo, pbrMetallicRoughness: { baseColorFactor: base, metallicFactor: D.m, roughnessFactor: D.r } });
    prim.push({ pos, nor, idx, col: pezzo === 'resto' ? col : null, material: materiali.length - 1 });
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  scrivi(OUT, [{ name: 'Macchina', mesh: prim }], materiali, []);
  const zlib = require('zlib'), dim = fs.statSync(OUT).size, gz = zlib.gzipSync(fs.readFileSync(OUT), { level: 9 }).length;
  const triDopo = prim.reduce((a, p) => a + p.idx.length / 3, 0);
  console.log(JSON.stringify({ triPrima, triDopo, conta, kbGlb: Math.round(dim / 1024), kbBase64: Math.round(gz * 4 / 3 / 1024) }));
})().catch((e) => { console.error(e); process.exit(1); });
