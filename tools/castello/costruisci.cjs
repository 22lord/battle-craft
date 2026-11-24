// v105: converte il castello di Lorenzo (OBJ + texture) nel GLB compresso che sta dentro
// index.html (costante CASTELLO105_B64). Uso:
//   node tools/castello/costruisci.cjs <cartella-con-obj> <uscita.b64> [--report]
// Cosa fa, in ordine:
//  1. legge l'OBJ (vertici con colore = AO cotta, UV, normali, materiali)
//  2. tiene solo il castello: via prato, rocce e terra dell'isoletta volante, via i pini e
//     tutto quello che sta fuori dal quadrato delle mura (staccionate, alberi). Il terreno,
//     gli alberi e i sentieri li fa gia' il gioco.
//  3. ruota di 180 gradi (la porta guarda -z, verso il sentiero che sale dalla citta')
//     e scala (SCALA): le coordinate escono gia' nel sistema del gioco, origine al centro
//     del cortile, y = 0 al piano del selciato
//  4. semplifica ogni materiale con meshoptimizer (contrazione di spigoli con quadriche,
//     rispetta cuciture UV e bordi)
//  5. texture ridotte (niente normal map: nel gioco nessun modello le usa)
//  6. collisioni: voxel della superficie, riempimento delle cavita' chiuse, fusione
//     in scatole. Finiscono negli "extras" del GLB.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { MeshoptSimplifier: MS } = require('meshoptimizer');
const sharp = require('sharp');

const SCALA = 0.8;          // il modello e' in metri; 0,8 fa stare le mura (46 m) sulla cresta
const DENTRO = 29.5;        // mezzo lato del quadrato tenuto, in unita' del modello
const VIA = new Set(['grass', 'rock', 'dirt', 'pine']);
// v106: 'flagstone' non e' solo il selciato: e' anche la faccia ESTERNA dei muri (cavi). Era fra i
// non solidi: da fuori si entrava ~2 m nel muro prima di urtare la parete interna. Ora e' solida.
const NON_SOLIDI = new Set(['flag', 'banner', 'cloth', 'foliage']);
const p_fisso = (m) => false;   // v106: niente materiali fissi interi: e' fisso solo cio' che sta sotto ZOCCOLO (selciato, piede dei muri)
// risoluzione delle texture per materiale (lato in pixel)
const TEX = { stone: 512, stone_dark: 512, wood: 512, wood_dark: 512, roof_blue: 512, roof_red: 512, plaster: 512, brick: 256, flagstone: 512, crate: 256, banner: 256, flag: 128, cloth: 128, foliage: 256 };
// semplificazione: frazione di triangoli da tenere e errore massimo (relativo all'estensione)
const SEMPL = { ratio: 0.42, err: 0.0012 };
const VOX = 0.2, VOXY = 0.15;   // collisioni: passo orizzontale e verticale, in metri del gioco.
// v106: era 0,35. Coi voxel da 35 cm le porte delle torri (diagonali, a gradini nella griglia)
// lasciavano ~60 cm liberi e il personaggio e' largo 76: non si entrava.
// v106: blocchi distruttibili. Il castello e' diviso in cubi da BLOCCO m (origine BLOCCO0 in pianta,
// fasce da BLOCCO in altezza sopra ZOCCOLO): ogni triangolo va al blocco del suo baricentro, ogni
// scatola di collisione resta dentro un blocco. Sotto ZOCCOLO (selciato, piede dei muri) e' fisso: -1.
const BLOCCO = 4, BLOCCO0 = -26, ZOCCOLO = 0.3;   // -26: i muri (cavi, pareti a +-22,5 e +-24,5) stanno in un blocco solo
const bloccoDi = (x, y, z) => y < ZOCCOLO ? null : [Math.floor((x - BLOCCO0) / BLOCCO), Math.floor((y - ZOCCOLO) / BLOCCO), Math.floor((z - BLOCCO0) / BLOCCO)];
const blocchi = new Map(), elencoBlocchi = [];   // chiave 'i,j,k' -> id progressivo
const idBlocco = (x, y, z) => { const b = bloccoDi(x, y, z); if (!b) return -1; const k = b.join(','); let id = blocchi.get(k); if (id === undefined) { id = elencoBlocchi.length; blocchi.set(k, id); elencoBlocchi.push(b); } return id; };

const dir = process.argv[2], out = process.argv[3], report = process.argv.includes('--report');
const objPath = fs.readdirSync(dir).find((f) => f.endsWith('.obj'));
const txt = fs.readFileSync(path.join(dir, objPath), 'utf8');

// ---------- 1. lettura ----------
const P = [], C = [], T = [], N = [];
const facce = new Map(); // materiale -> array di [vi,ti,ni]x3
let mat = null;
for (let i = 0, n = txt.length; i < n;) {
  let j = txt.indexOf('\n', i); if (j < 0) j = n;
  const l = txt.slice(i, j).trim(); i = j + 1;
  if (l.startsWith('v ')) { const a = l.split(/\s+/); P.push(+a[1], +a[2], +a[3]); C.push(a.length > 6 ? +a[4] : 1, a.length > 6 ? +a[5] : 1, a.length > 6 ? +a[6] : 1); }
  else if (l.startsWith('vt ')) { const a = l.split(/\s+/); T.push(+a[1], +a[2]); }
  else if (l.startsWith('vn ')) { const a = l.split(/\s+/); N.push(+a[1], +a[2], +a[3]); }
  else if (l.startsWith('usemtl ')) mat = l.slice(7).trim();
  else if (l.startsWith('f ')) {
    const vs = l.slice(2).trim().split(/\s+/).map((s) => s.split('/').map((x) => (x ? parseInt(x) - 1 : -1)));
    let a = facce.get(mat); if (!a) facce.set(mat, a = []);
    for (let k = 1; k + 1 < vs.length; k++) a.push(vs[0], vs[k], vs[k + 1]);
  }
}

// ---------- 2-3. filtro e trasformazione ----------
const tx = (vi) => [-P[vi * 3] * SCALA, P[vi * 3 + 1] * SCALA, -P[vi * 3 + 2] * SCALA];
const mats = {};
for (const [m, f] of facce) {
  if (VIA.has(m)) continue;
  const keep = [];
  for (let k = 0; k < f.length; k += 3) {
    let cx = 0, cz = 0; for (let q = 0; q < 3; q++) { cx += P[f[k + q][0] * 3]; cz += P[f[k + q][0] * 3 + 2]; }
    if (Math.abs(cx / 3) > DENTRO || Math.abs(cz / 3) > DENTRO) continue;
    keep.push(f[k], f[k + 1], f[k + 2]);
  }
  if (keep.length) mats[m] = keep;
}

// vertici unici per (posizione, uv, normale): le cuciture restano vertici separati
function costruisci(f) {
  const map = new Map(), pos = [], uv = [], col = [], idx = [];
  for (const [vi, ti, ni] of f) {
    const key = vi + '/' + ti + '/' + ni; let id = map.get(key);
    if (id === undefined) {
      id = pos.length / 3; map.set(key, id); pos.push(...tx(vi));
      uv.push(ti >= 0 ? T[ti * 2] : 0, ti >= 0 ? 1 - T[ti * 2 + 1] : 0);
      col.push(C[vi * 3], C[vi * 3 + 1], C[vi * 3 + 2]);
    }
    idx.push(id);
  }
  // la rotazione di 180 gradi (x e z negati) e' una rotazione vera, non uno specchio:
  // l'ordine dei vertici delle facce resta giusto
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), col: new Float32Array(col), idx: new Uint32Array(idx) };
}

(async () => {
  await MS.ready; MS.useExperimentalFeatures = true;
  const prims = []; let triPrima = 0, triDopo = 0;
  for (const m in mats) {
    const g = costruisci(mats[m]); triPrima += g.idx.length / 3;
    // attributi pesati nella semplificazione: uv e colore (AO), cosi' non si mangia le cuciture
    const attr = new Float32Array((g.pos.length / 3) * 5);
    for (let i = 0; i < g.pos.length / 3; i++) { attr[i * 5] = g.uv[i * 2]; attr[i * 5 + 1] = g.uv[i * 2 + 1]; attr[i * 5 + 2] = g.col[i * 3]; attr[i * 5 + 3] = g.col[i * 3 + 1]; attr[i * 5 + 4] = g.col[i * 3 + 2]; }
    const target = Math.max(3, Math.floor(g.idx.length * SEMPL.ratio / 3) * 3);
    const [si] = MS.simplifyWithAttributes(g.idx, g.pos, 3, attr, 5, [0.5, 0.5, 0.3, 0.3, 0.3], null, target, SEMPL.err, []);
    // compatto i vertici rimasti
    const remap = new Int32Array(g.pos.length / 3).fill(-1); let nv = 0; const idx = new Uint32Array(si.length);
    for (let k = 0; k < si.length; k++) { let r = remap[si[k]]; if (r < 0) r = remap[si[k]] = nv++; idx[k] = r; }
    const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Uint8Array(nv * 3);
    for (let i = 0; i < remap.length; i++) { const r = remap[i]; if (r < 0) continue; pos.set(g.pos.subarray(i * 3, i * 3 + 3), r * 3); uv.set(g.uv.subarray(i * 2, i * 2 + 2), r * 2); for (let q = 0; q < 3; q++) col[r * 3 + q] = Math.round(Math.min(1, g.col[i * 3 + q]) * 255); }
    triDopo += idx.length / 3;
    // v106: vertici contigui per blocco (i vertici condivisi fra due blocchi si duplicano), cosi'
    // nel gioco un blocco si toglie azzerando un intervallo dell'attributo posizione
    // normali morbide calcolate PRIMA di dividere: i vertici duplicati ai confini dei blocchi
    // devono avere la stessa normale, se no si vede la cucitura (salvate in 8 bit)
    const nrm = new Float32Array(pos.length);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const v of [a, b, c]) { nrm[v] += nx; nrm[v + 1] += ny; nrm[v + 2] += nz; }
    }
    // v106: i triangoli che attraversano un confine di blocco si TAGLIANO sui piani dei blocchi
    // (Sutherland-Hodgman, attributi interpolati). Senza taglio una faccia di muro alta 8 m finiva
    // tutta nel blocco del suo baricentro: rompendo gli altri blocchi restava in piedi (visto nel render).
    // Vertice di lavoro: [x,y,z, u,v, r,g,b, nx,ny,nz]
    const V = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], uv[i * 2], uv[i * 2 + 1], col[i * 3], col[i * 3 + 1], col[i * 3 + 2], nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]];
    const mix = (p, q, t) => p.map((v, k) => v + (q[k] - v) * t);
    const piani = (ax, lo, hi) => { const out = []; if (ax === 1) { if (lo < ZOCCOLO && hi > ZOCCOLO) out.push(ZOCCOLO); for (let v = ZOCCOLO + BLOCCO; v < hi; v += BLOCCO) if (v > lo) out.push(v); } else { for (let v = BLOCCO0 + Math.ceil((lo - BLOCCO0) / BLOCCO) * BLOCCO; v < hi; v += BLOCCO) if (v > lo + 1e-6) out.push(v); } return out; };
    const taglia = (poly, ax, v) => { const A = [], B = []; for (let k = 0; k < poly.length; k++) { const p = poly[k], q = poly[(k + 1) % poly.length], dp = p[ax] - v, dq = q[ax] - v; (dp < 0 ? A : B).push(p); if ((dp < 0) !== (dq < 0)) { const t = dp / (dp - dq), r = mix(p, q, t); r[ax] = v; A.push(r); B.push(r.slice()); } } return [A, B].filter((x) => x.length >= 3); };
    const perB = new Map(); let tagliati = 0;
    const metti = (b, tri) => { let a = perB.get(b); if (!a) perB.set(b, a = []); a.push(tri); };
    for (let t = 0; t < idx.length; t += 3) {
      const ids = [idx[t], idx[t + 1], idx[t + 2]];
      if (p_fisso(m)) { metti(-1, ids); continue; }
      let polys = [ids.map(V)];
      for (const ax of [0, 1, 2]) { const nx = []; for (const pl of polys) { const lo = Math.min(...pl.map((p) => p[ax])), hi = Math.max(...pl.map((p) => p[ax])); let parts = [pl]; for (const v of piani(ax, lo, hi)) parts = parts.flatMap((pp) => taglia(pp, ax, v)); nx.push(...parts); } polys = nx; }
      if (polys.length === 1 && polys[0].length === 3) { const pl = polys[0]; metti(idBlocco((pl[0][0] + pl[1][0] + pl[2][0]) / 3, (pl[0][1] + pl[1][1] + pl[2][1]) / 3, (pl[0][2] + pl[1][2] + pl[2][2]) / 3), ids); continue; }
      tagliati++;
      for (const pl of polys) { let cx = 0, cy = 0, cz = 0; for (const p of pl) { cx += p[0]; cy += p[1]; cz += p[2]; } const bb = idBlocco(cx / pl.length, cy / pl.length, cz / pl.length); for (let k = 1; k + 1 < pl.length; k++) metti(bb, [pl[0], pl[k], pl[k + 1]]); }
    }
    const P2 = [], U2 = [], C2 = [], N2 = [], I2 = [], tab = [];
    const emetti = (w) => { P2.push(w[0], w[1], w[2]); U2.push(w[3], w[4]); C2.push(Math.round(w[5]), Math.round(w[6]), Math.round(w[7])); const l = Math.hypot(w[8], w[9], w[10]) || 1; N2.push(Math.round(w[8] / l * 127), Math.round(w[9] / l * 127), Math.round(w[10] / l * 127)); return P2.length / 3 - 1; };
    for (const [bk, tl] of [...perB].sort((x, y) => x[0] - y[0])) {
      const mp = new Map(), v0 = P2.length / 3;
      // i vertici nati dal taglio si condividono fra i triangoli vicini (stessa chiave arrotondata)
      const ch = (w) => w.map((x, k) => Math.round(x * (k < 3 ? 1e4 : k < 5 ? 1e4 : k < 8 ? 1 : 100))).join(',');
      for (const tri of tl) for (const v of tri) { const k = typeof v === 'number' ? v : ch(v); let r = mp.get(k); if (r === undefined) { r = emetti(typeof v === 'number' ? V(v) : v); mp.set(k, r); } I2.push(r); }
      tab.push(bk, v0, P2.length / 3 - v0);
    }
    if (report) console.log('   ', m, 'triangoli tagliati ai confini dei blocchi', tagliati, '-> triangoli', I2.length / 3);
    prims.push({ m, pos: new Float32Array(P2), uv: new Float32Array(U2), col: new Uint8Array(C2), nrm: new Int8Array(N2), idx: new Uint32Array(I2), tri0: g.idx.length / 3, tab });
  }
  console.log('triangoli: originale filtrato', triPrima, '-> semplificato', triDopo);
  if (report) for (const p of prims) console.log(' ', p.m.padEnd(11), p.tri0, '->', p.idx.length / 3, 'vertici', p.pos.length / 3);

  // ---------- 6. collisioni ----------
  const cols = collisioni(mats);
  console.log('scatole di collisione', cols.length / 7, 'blocchi', elencoBlocchi.length);

  // ---------- 5. texture + GLB ----------
  const bin = []; let off = 0; const bufferViews = [], accessors = [], images = [], textures = [], materials = [], primitives = [];
  const push = (buf, target) => { const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength); const pad = (4 - (b.length % 4)) % 4; bin.push(b, Buffer.alloc(pad)); bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) }); off += b.length + pad; return bufferViews.length - 1; };
  let texBytes = 0;
  // v106: posizioni a 16 bit normalizzate (scala QS nel nodo): ~1 mm di passo, meta' dei byte
  let QS = 0; for (const p of prims) for (let i = 0; i < p.pos.length; i++) QS = Math.max(QS, Math.abs(p.pos[i])); QS = Math.ceil(QS + 0.01);
  // anche le uv (piastrellate fino a +-38) a 16 bit: nel gioco la texture ha repeat = US
  let US = 0; for (const p of prims) for (let i = 0; i < p.uv.length; i++) US = Math.max(US, Math.abs(p.uv[i])); US = Math.ceil(US + 0.01);
  for (const p of prims) {
    const src = path.join(dir, 'textures', p.m + '.jpg'); const lato = TEX[p.m] || 256;
    const jpg = await sharp(src).resize(lato, lato, { fit: 'fill' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer(); texBytes += jpg.length;
    images.push({ bufferView: push(new Uint8Array(jpg)), mimeType: 'image/jpeg' });
    textures.push({ source: images.length - 1 });
    materials.push({ name: p.m, pbrMetallicRoughness: { baseColorTexture: { index: textures.length - 1 }, metallicFactor: 0, roughnessFactor: 1 }, doubleSided: NON_SOLIDI.has(p.m) && p.m !== 'flagstone' });
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.pos.length; i += 3) for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], p.pos[i + q]); mx[q] = Math.max(mx[q], p.pos[i + q]); }
    const nv = p.pos.length / 3;
    const q16 = new Int16Array(p.pos.length); for (let i = 0; i < p.pos.length; i++) q16[i] = Math.round(p.pos[i] / QS * 32767);
    accessors.push({ bufferView: push(q16, 34962), componentType: 5122, normalized: true, count: nv, type: 'VEC3', min: mn.map((v) => v / QS), max: mx.map((v) => v / QS) });
    const u16 = new Int16Array(p.uv.length); for (let i = 0; i < p.uv.length; i++) u16[i] = Math.round(p.uv[i] / US * 32767);
    accessors.push({ bufferView: push(u16, 34962), componentType: 5122, normalized: true, count: nv, type: 'VEC2' });
    accessors.push({ bufferView: push(p.col, 34962), componentType: 5121, normalized: true, count: nv, type: 'VEC3' });
    accessors.push({ bufferView: push(p.nrm, 34962), componentType: 5120, normalized: true, count: nv, type: 'VEC3' });
    const ind = nv < 65536 ? Uint16Array.from(p.idx) : p.idx;
    accessors.push({ bufferView: push(ind, 34963), componentType: nv < 65536 ? 5123 : 5125, count: ind.length, type: 'SCALAR' });
    const a = accessors.length;
    primitives.push({ attributes: { POSITION: a - 5, TEXCOORD_0: a - 4, COLOR_0: a - 3, NORMAL: a - 2 }, indices: a - 1, material: materials.length - 1 });
  }
  const binBuf = Buffer.concat(bin);
  const json = { asset: { version: '2.0', generator: 'battlecraft castello v106' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'castello', mesh: 0, scale: [QS, QS, QS] }], meshes: [{ name: 'castello', primitives }], materials, textures, images, accessors, bufferViews, buffers: [{ byteLength: binBuf.length }], extras: { uvScala: US, colliders: Array.from(cols), scala: SCALA, blocchi: { lato: BLOCCO, origine: BLOCCO0, zoccolo: ZOCCOLO, elenco: elencoBlocchi.flat(), prim: prims.map((p) => p.tab) } } };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binBuf.length, 8);
  const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
  const glb = Buffer.concat([head, ch(js.length, 0x4E4F534A), js, ch(binBuf.length, 0x004E4942), binBuf]);
  const gz = zlib.gzipSync(glb, { level: 9 });
  fs.writeFileSync(out, gz.toString('base64'));
  if (process.argv.includes('--glb')) fs.writeFileSync(out.replace(/\.b64$/, '') + '.glb', glb);
  console.log('GLB', (glb.length / 1e6).toFixed(2), 'MB (texture', (texBytes / 1e6).toFixed(2), 'MB), gzip', (gz.length / 1e6).toFixed(2), 'MB, base64', (gz.length * 4 / 3 / 1e6).toFixed(2), 'MB');
})().catch((e) => { console.error(e); process.exit(1); });

// Voxel della superficie (prova di sovrapposizione triangolo-scatola, assi separatori),
// poi riempimento: tutto quello che non si raggiunge dall'esterno camminando fra voxel
// vuoti e' pieno (l'interno dei muri, il mastio chiuso). Poi fusione golosa in scatole:
// prima in altezza, poi lungo x, poi lungo z, cosi' i muri diventano lastre alte e i
// pavimenti piastre larghe.
function collisioni(mats) {
  const tris = [];
  for (const m in mats) { if (NON_SOLIDI.has(m)) continue; const f = mats[m]; for (let k = 0; k < f.length; k += 3) tris.push(tx(f[k][0]), tx(f[k + 1][0]), tx(f[k + 2][0])); }
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const v of tris) for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], v[q]); mx[q] = Math.max(mx[q], v[q]); }
  const s = [VOX, VOXY, VOX];
  const o = [mn[0] - VOX * 2, Math.max(mn[1], -0.4) - VOXY * 2, mn[2] - VOX * 2];   // sotto -0,4 m e' gia' terreno
  const D = [0, 1, 2].map((q) => Math.ceil((mx[q] - o[q]) / s[q]) + 3);
  const NX = D[0], NY = D[1], NZ = D[2], id = (x, y, z) => (z * NY + y) * NX + x;
  const g = new Uint8Array(NX * NY * NZ);
  const h = [VOX / 2, VOXY / 2, VOX / 2];
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const lo = [0, 1, 2].map((q) => Math.max(0, Math.floor((Math.min(a[q], b[q], c[q]) - o[q]) / s[q])));
    const hi = [0, 1, 2].map((q) => Math.min(D[q] - 1, Math.floor((Math.max(a[q], b[q], c[q]) - o[q]) / s[q])));
    for (let z = lo[2]; z <= hi[2]; z++) for (let y = lo[1]; y <= hi[1]; y++) for (let x = lo[0]; x <= hi[0]; x++) {
      const k = id(x, y, z); if (g[k]) continue;
      const cen = [o[0] + (x + 0.5) * s[0], o[1] + (y + 0.5) * s[1], o[2] + (z + 0.5) * s[2]];
      if (triBox(cen, h, a, b, c)) g[k] = 1;
    }
  }
  // riempimento dall'esterno (6-connesso) sui voxel vuoti
  const vis = new Uint8Array(g.length); const st = [];
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) if (x === 0 || z === 0 || x === NX - 1 || z === NZ - 1 || y === NY - 1) { const k = id(x, y, z); if (!g[k]) { vis[k] = 1; st.push(k); } }
  while (st.length) {
    const k = st.pop(); const x = k % NX, y = Math.floor(k / NX) % NY, z = Math.floor(k / (NX * NY));
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const X = x + dx, Y = y + dy, Z = z + dz; if (X < 0 || Y < 0 || Z < 0 || X >= NX || Y >= NY || Z >= NZ) continue;
      const q = id(X, Y, Z); if (!g[q] && !vis[q]) { vis[q] = 1; st.push(q); }
    }
  }
  for (let k = 0; k < g.length; k++) if (!g[k] && !vis[k]) g[k] = 1;
  // v106: porte delle torri al piano del cortile. Nel modello il passaggio fra le due colonne di
  // legno e' vuoto (verificato), ma i voxel delle superfici accanto, gonfiati di mezzo passo, lo
  // stringevano sotto la larghezza del personaggio. Le colonne si trovano dal modello: vertici di
  // wood_dark fra 0,6 e 1,4 m nella fascia delle torri, raggruppati; due colonne per torre.
  { const pts = [], f = mats.wood_dark || [];
    for (const [vi] of f) { const p = tx(vi); if (p[1] > 0.6 && p[1] < 1.4 && Math.abs(p[0]) > 10 && Math.abs(p[0]) < 20 && Math.abs(p[2]) > 10 && Math.abs(p[2]) < 20) pts.push(p); }
    const cl = []; for (const p of pts) { let c = cl.find((c) => Math.hypot(c.x - p[0], c.z - p[2]) < 0.6); if (!c) cl.push(c = { x: p[0], z: p[2], n: 0, sx: 0, sz: 0 }); c.n++; c.sx += p[0]; c.sz += p[2]; c.x = c.sx / c.n; c.z = c.sz / c.n; }
    const col = cl.filter((c) => c.n >= 20); let porte = 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const q = col.filter((c) => Math.sign(c.x) === sx && Math.sign(c.z) === sz); if (q.length !== 2) continue;
      const mx = (q[0].x + q[1].x) / 2, mz = (q[0].z + q[1].z) / 2; let px = q[1].x - q[0].x, pz = q[1].z - q[0].z; const L = Math.hypot(px, pz); px /= L; pz /= L;
      let ax = -pz, az = px; if (ax * mx + az * mz < 0) { ax = -ax; az = -az; }   // asse verso l'interno della torre
      for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
        const cx = o[0] + (x + 0.5) * s[0], cy = o[1] + (y + 0.5) * s[1], cz = o[2] + (z + 0.5) * s[2]; if (cy < 0.3 || cy > 2.05) continue;
        const al = (cx - mx) * ax + (cz - mz) * az, pe = (cx - mx) * px + (cz - mz) * pz;
        if (al > -0.8 && al < 2.4 && Math.abs(pe) < 0.6) g[id(x, y, z)] = 0;
      }
      porte++;
    }
    console.log('porte delle torri liberate', porte); }
  // fusione
  const used = new Uint8Array(g.length), boxes = [];
  // v106: blocco di ogni voxel (dal centro); la fusione non attraversa i confini dei blocchi
  const bl = new Int32Array(g.length);
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) { const k = id(x, y, z); if (g[k]) bl[k] = idBlocco(o[0] + (x + 0.5) * s[0], o[1] + (y + 0.5) * s[1], o[2] + (z + 0.5) * s[2]); }
  let bCur = 0;
  const full = (x0, x1, y0, y1, z0, z1) => { for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = id(x, y, z); if (!g[k] || used[k] || bl[k] !== bCur) return false; } return true; };
  for (let z = 0; z < NZ; z++) for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) {
    const k = id(x, y, z); if (!g[k] || used[k]) continue;
    bCur = bl[k];
    let y1 = y; while (y1 + 1 < NY && full(x, x, y1 + 1, y1 + 1, z, z)) y1++;
    let x1 = x; while (x1 + 1 < NX && full(x1 + 1, x1 + 1, y, y1, z, z)) x1++;
    let z1 = z; while (z1 + 1 < NZ && full(x, x1, y, y1, z1 + 1, z1 + 1)) z1++;
    for (let zz = z; zz <= z1; zz++) for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) used[id(xx, yy, zz)] = 1;
    // la scatola piu' bassa scende fino al terreno (sotto la quota del cortile)
    const by0 = y === 0 || o[1] + y * s[1] < 0.05 ? -1.5 : o[1] + y * s[1];
    boxes.push(+(o[0] + x * s[0]).toFixed(3), +by0.toFixed(3), +(o[2] + z * s[2]).toFixed(3), +(o[0] + (x1 + 1) * s[0]).toFixed(3), +(o[1] + (y1 + 1) * s[1]).toFixed(3), +(o[2] + (z1 + 1) * s[2]).toFixed(3), bCur);
  }
  return boxes;
}
// Akenine-Moller: sovrapposizione triangolo / scatola allineata
function triBox(c, h, A, B, Cc) {
  const v0 = [A[0] - c[0], A[1] - c[1], A[2] - c[2]], v1 = [B[0] - c[0], B[1] - c[1], B[2] - c[2]], v2 = [Cc[0] - c[0], Cc[1] - c[1], Cc[2] - c[2]];
  const e = [[v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]], [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]], [v0[0] - v2[0], v0[1] - v2[1], v0[2] - v2[2]]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const ax = [0, 0, 0]; const u = [0, 0, 0]; u[j] = 1; // asse = u_j x e_i
    ax[0] = u[1] * e[i][2] - u[2] * e[i][1]; ax[1] = u[2] * e[i][0] - u[0] * e[i][2]; ax[2] = u[0] * e[i][1] - u[1] * e[i][0];
    const p0 = ax[0] * v0[0] + ax[1] * v0[1] + ax[2] * v0[2], p1 = ax[0] * v1[0] + ax[1] * v1[1] + ax[2] * v1[2], p2 = ax[0] * v2[0] + ax[1] * v2[1] + ax[2] * v2[2];
    const r = h[0] * Math.abs(ax[0]) + h[1] * Math.abs(ax[1]) + h[2] * Math.abs(ax[2]);
    if (Math.min(p0, p1, p2) > r || Math.max(p0, p1, p2) < -r) return false;
  }
  for (let q = 0; q < 3; q++) if (Math.min(v0[q], v1[q], v2[q]) > h[q] || Math.max(v0[q], v1[q], v2[q]) < -h[q]) return false;
  const n = [e[0][1] * e[1][2] - e[0][2] * e[1][1], e[0][2] * e[1][0] - e[0][0] * e[1][2], e[0][0] * e[1][1] - e[0][1] * e[1][0]];
  const d = n[0] * v0[0] + n[1] * v0[1] + n[2] * v0[2], r = h[0] * Math.abs(n[0]) + h[1] * Math.abs(n[1]) + h[2] * Math.abs(n[2]);
  return Math.abs(d) <= r;
}
