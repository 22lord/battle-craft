// v114: lettura/scrittura minima di GLB per la preparazione del forziere (solo Node, niente dipendenze)
const fs = require('fs');
const COMP = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function leggi(file) {
  const b = fs.readFileSync(file);
  const L = b.readUInt32LE(12), json = JSON.parse(b.slice(20, 20 + L).toString());
  const binOff = 20 + L + 8, bin = b.slice(binOff, binOff + b.readUInt32LE(20 + L));
  const acc = (i) => {
    const a = json.accessors[i], bv = json.bufferViews[a.bufferView], n = SIZE[a.type], TA = COMP[a.componentType];
    const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const out = new TA(a.count * n); const src = new TA(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * TA.BYTES_PER_ELEMENT));
    out.set(src); return out;
  };
  const img = (i) => { const bv = json.bufferViews[json.images[i].bufferView]; return Buffer.from(bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)); };
  return { json, acc, img };
}

/* scrive un GLB con: nodi [{name, translation, mesh:[{pos,nor,uv,idx,material}]}], materiali (JSON glTF), immagini (Buffer jpeg) */
function scrivi(file, nodi, materiali, immagini) {
  const parti = []; let off = 0; const bufferViews = [], accessors = [];
  const add = (buf, target) => { const pad = (4 - (off % 4)) % 4; if (pad) { parti.push(Buffer.alloc(pad)); off += pad; } bufferViews.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}) }); parti.push(buf); off += buf.length; return bufferViews.length - 1; };
  const accessor = (ta, type, compType, target, minmax) => {
    const bv = add(Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength), target);
    const a = { bufferView: bv, componentType: compType, count: ta.length / SIZE[type], type };
    if (minmax) { const n = SIZE[type], mn = new Array(n).fill(Infinity), mx = new Array(n).fill(-Infinity); for (let i = 0; i < ta.length; i++) { const k = i % n; if (ta[i] < mn[k]) mn[k] = ta[i]; if (ta[i] > mx[k]) mx[k] = ta[i]; } a.min = mn; a.max = mx; }
    accessors.push(a); return accessors.length - 1;
  };
  const meshes = [], nodes = [];
  for (const n of nodi) {
    const prims = n.mesh.map((p) => {
      const idx = p.pos.length / 3 > 65535 ? new Uint32Array(p.idx) : new Uint16Array(p.idx);
      return {
        attributes: { POSITION: accessor(p.pos, 'VEC3', 5126, 34962, true), NORMAL: accessor(p.nor, 'VEC3', 5126, 34962), ...(p.uv ? { TEXCOORD_0: accessor(p.uv, 'VEC2', 5126, 34962) } : {}), ...(p.col ? { COLOR_0: accessor(p.col, 'VEC3', 5126, 34962) } : {}) },   // v115: UV facoltative
        indices: accessor(idx, 'SCALAR', idx instanceof Uint32Array ? 5125 : 5123, 34963), material: p.material,
      };
    });
    meshes.push({ name: n.name, primitives: prims });
    nodes.push({ name: n.name, mesh: meshes.length - 1, ...(n.translation ? { translation: n.translation } : {}) });
  }
  immagini = immagini || [];
  const images = immagini.map((buf) => ({ bufferView: add(buf), mimeType: 'image/jpeg' }));
  const pad = (4 - (off % 4)) % 4; if (pad) { parti.push(Buffer.alloc(pad)); off += pad; }
  const json = {
    asset: { version: '2.0', generator: 'battlecraft tools/forziere114' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, accessors, bufferViews,
    buffers: [{ byteLength: off }], materials: materiali, images, samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    textures: images.map((_, i) => ({ source: i, sampler: 0 })),
  };
  let js = Buffer.from(JSON.stringify(json)); const jp = (4 - (js.length % 4)) % 4; js = Buffer.concat([js, Buffer.alloc(jp, 0x20)]);
  const bin = Buffer.concat(parti), head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (len, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(len, 0); h.writeUInt32LE(type, 4); return h; };
  fs.writeFileSync(file, Buffer.concat([head, ch(js.length, 0x4E4F534A), js, ch(bin.length, 0x004E4942), bin]));
}
module.exports = { leggi, scrivi };
