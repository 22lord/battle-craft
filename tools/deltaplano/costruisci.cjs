// v108: converte il deltaplano di Lorenzo (Deltaplano-Laguna.glb, da Blender, 56.800 triangoli,
// 65 oggetti, 7 materiali a tinta unita, niente texture) nel GLB compresso che sta dentro index.html
// (costante DELTAPLANO108_B64). Uso, dalla radice della repo:
//   node tools/deltaplano/costruisci.cjs Deltaplano-Laguna.glb deltaplano.b64 [--report]
// Cosa fa: applica le trasformazioni dei nodi, semplifica ogni oggetto con meshoptimizer (la vela
// poco, perche' la deforma lo shader dello sventolamento e servono vertici; sfere, cuciture e bordi
// molto: in partita ci sono fino a 30 deltaplani in aria), unisce per materiale, normali a 8 bit.
// Usa meshoptimizer di tools/castello (npm i la' dentro).
const fs = require('fs'), zlib = require('zlib');
const { MeshoptSimplifier: MS } = require('../castello/node_modules/meshoptimizer');
const src = process.argv[2], out = process.argv[3], report = process.argv.includes('--report');
const b = fs.readFileSync(src), jl = b.readUInt32LE(12), J = JSON.parse(b.slice(20, 20 + jl)), bin0 = 20 + jl + 8;
const COMP = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3 };
const acc = (i) => { const a = J.accessors[i], bv = J.bufferViews[a.bufferView], T = COMP[a.componentType]; const o = bin0 + (bv.byteOffset || 0) + (a.byteOffset || 0); return new T(b.buffer.slice(b.byteOffset + o, b.byteOffset + o + a.count * SIZE[a.type] * T.BYTES_PER_ELEMENT)); };
// quanto tenere per oggetto (frazione dei triangoli)
const quota = (nome) => /^Vela/.test(nome) ? 0.55 : /^(Cucitura|Bordo)/.test(nome) ? 0.14 : /^(Carenatura|Guscio|Puntale|Snodo|Fulcro|Borchia)/.test(nome) ? 0.22 : /^Anello/.test(nome) ? 0.35 : 0.6;
(async () => {
  await MS.ready;
  const perMat = new Map(); let prima = 0, dopo = 0;
  for (const n of J.nodes) {
    if (n.mesh === undefined) continue;
    const t = n.translation || [0, 0, 0], s = n.scale || [1, 1, 1];
    for (const p of J.meshes[n.mesh].primitives) {
      const pos = acc(p.attributes.POSITION), nrm = acc(p.attributes.NORMAL), idx = Uint32Array.from(acc(p.indices));
      for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) pos[i + k] = pos[i + k] * s[k] + t[k];
      for (let i = 0; i < nrm.length; i += 3) { let x = nrm[i] / s[0], y = nrm[i + 1] / s[1], z = nrm[i + 2] / s[2]; const l = Math.hypot(x, y, z) || 1; nrm[i] = x / l; nrm[i + 1] = y / l; nrm[i + 2] = z / l; }
      const q = quota(n.name), target = Math.max(3, Math.floor(idx.length * q / 3) * 3);
      const [si] = q < 1 ? MS.simplify(idx, pos, 3, target, 0.02, ['LockBorder']) : [idx];
      prima += idx.length / 3; dopo += si.length / 3;
      if (report) console.log(n.name.padEnd(26), idx.length / 3, '->', si.length / 3);
      let m = perMat.get(p.material); if (!m) perMat.set(p.material, m = { pos: [], nrm: [], idx: [] });
      const remap = new Map();
      for (const v of si) { let r = remap.get(v); if (r === undefined) { r = m.pos.length / 3; remap.set(v, r); m.pos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); m.nrm.push(Math.round(nrm[v * 3] * 127), Math.round(nrm[v * 3 + 1] * 127), Math.round(nrm[v * 3 + 2] * 127)); } m.idx.push(r); }
    }
  }
  console.log('triangoli', prima, '->', dopo);
  const bins = [], bufferViews = [], accessors = [], nodes = [], meshes = [], materials = []; let off = 0;
  const push = (ta, target) => { const buf = Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength), pad = (4 - buf.length % 4) % 4; bins.push(buf, Buffer.alloc(pad)); bufferViews.push({ buffer: 0, byteOffset: off, byteLength: buf.length, target }); off += buf.length + pad; return bufferViews.length - 1; };
  for (const [mi, m] of perMat) {
    const P = new Float32Array(m.pos), mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
    const nv = P.length / 3, I = nv < 65536 ? new Uint16Array(m.idx) : new Uint32Array(m.idx);
    // normali Int8 a 4 componenti (allineamento a 4 byte richiesto da glTF)
    const N = new Int8Array(nv * 4); for (let i = 0; i < nv; i++) { N[i * 4] = m.nrm[i * 3]; N[i * 4 + 1] = m.nrm[i * 3 + 1]; N[i * 4 + 2] = m.nrm[i * 3 + 2]; }
    accessors.push({ bufferView: push(P, 34962), componentType: 5126, count: nv, type: 'VEC3', min: mn, max: mx });
    const bvN = push(N, 34962); bufferViews[bvN].byteStride = 4;
    accessors.push({ bufferView: bvN, componentType: 5120, normalized: true, count: nv, type: 'VEC3' });
    accessors.push({ bufferView: push(I, 34963), componentType: I instanceof Uint16Array ? 5123 : 5125, count: I.length, type: 'SCALAR' });
    const a0 = accessors.length - 3;
    materials.push(J.materials[mi]);
    meshes.push({ name: J.materials[mi].name, primitives: [{ attributes: { POSITION: a0, NORMAL: a0 + 1 }, indices: a0 + 2, material: materials.length - 1 }] });
    nodes.push({ name: J.materials[mi].name, mesh: meshes.length - 1 });
  }
  const binBuf = Buffer.concat(bins);
  const json = { asset: { version: '2.0', generator: 'battlecraft deltaplano v108' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, materials, accessors, bufferViews, buffers: [{ byteLength: binBuf.length }] };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binBuf.length, 8);
  const ch = (len, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(len, 0); h.writeUInt32LE(type, 4); return h; };
  const glb = Buffer.concat([head, ch(js.length, 0x4E4F534A), js, ch(binBuf.length, 0x004E4942), binBuf]);
  const gz = zlib.gzipSync(glb, { level: 9 }), b64 = gz.toString('base64');
  fs.writeFileSync(out, b64);
  console.log('GLB', (glb.length / 1024).toFixed(0), 'KB, gzip', (gz.length / 1024).toFixed(0), 'KB, base64', (b64.length / 1024).toFixed(0), 'KB');
})();
