// Patch v115: le auto di Lorenzo (macchina_citycar_v4.obj) al posto del vecchio modello, un colore per auto,
// e altre auto parcheggiate lungo i sentieri.
// Uso: node tools/patch115/applica.cjs   (parte dalla v114: index.html con <div id="ver">v114</div>)
// Il modello viene da assets/macchina115/macchina115.glb (fatto da tools/macchina115/prepara.cjs).
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const RAD = path.join(__dirname, '..', '..'), F = path.join(RAD, 'index.html');
let s = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const sost = (da, a, nome) => { const n = s.split(da).length - 1; if (n !== 1) throw new Error(nome + ': trovato ' + n + ' volte'); s = s.replace(da, () => a); console.log('ok', nome); };
const leggi = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').split('\r\n').join('\n');

// ---------- modello e modulo ----------
const b64 = zlib.gzipSync(fs.readFileSync(path.join(RAD, 'assets', 'macchina115', 'macchina115.glb')), { level: 9 }).toString('base64');
sost('\n// v114: forziere di Lorenzo (forziere_v3.glb alleggerito', "\n// v115: auto di Lorenzo (macchina_citycar_v4.obj alleggerita, 3 pezzi): tools/macchina115/prepara.cjs\nconst AUTO115_B64='" + b64 + "';\n// v114: forziere di Lorenzo (forziere_v3.glb alleggerito", 'dati dell\'auto');
sost('  await caricaForziere114();   // v114\n', '  await caricaForziere114();   // v114\n  await caricaAuto115();   // v115: prima del mondo, che piazza le auto\n', 'caricamento auto');
sost('/* ============================================================\n   v114: FORZIERI CON BOTTINO', leggi('auto.js') + '\n/* ============================================================\n   v114: FORZIERI CON BOTTINO', 'modulo auto');

// ---------- World.car: modello nuovo, collisione giusta anche storta ----------
sost('    const body = M.carBody(mat.color.getHex());\n',
  "    const body = M.carBody(mat.color.getHex());\n" +
  "    const mod115 = typeof auto115 === 'function' ? auto115(mat.color.getHex()) : null;   // v115: l'auto di Lorenzo\n" +
  "    if (mod115) {\n" +
  "      mod115.position.y = -0.34; g.add(mod115); this.scene.add(g);\n" +
  "      const A = AUTO115, ca = Math.abs(Math.cos(rotY)), sa = Math.abs(Math.sin(rotY)), hx1 = ca * A.lung + sa * A.larg, hz1 = sa * A.lung + ca * A.larg;\n" +
  "      const c1 = this.physics.add({ type: 'box', min: new THREE.Vector3(x - hx1, y - 0.4, z - hz1), max: new THREE.Vector3(x + hx1, y - 0.34 + A.alto, z + hz1), tag: 'car' });\n" +
  "      const r1 = { kind: 'metal', hp: 140, maxHp: 140, col: c1, group: g, gone: false, x, z, y: y + 0.6, colore115: mat.color.getHex() };\n" +
  "      c1.harvest = r1; this.harvestables.push(r1); this.blockers.push({ x, z, r: 3 });\n" +
  "      return;\n" +
  "    }\n", 'auto nuova in World.car');
sost('  rockAt(x, z, sx, sy, sz, harvest, cliff, alza = 0) {\n', leggi('strade.js') + '  rockAt(x, z, sx, sy, sz, harvest, cliff, alza = 0) {\n', 'metodo auto lungo i sentieri');
sost('    this.makeVegetation();\n    this.flush();\n', '    this.makeVegetation();\n    this.autoStrade115();   // v115: DOPO la vegetazione (prima, gli alberi scartati facevano slittare il caso: 80 alberi/rocce cambiavano posto)\n    this.flush();\n', 'chiamata auto lungo i sentieri');
// le tre auto della citta': rossa, blu e (prima era un'altra blu) gialla
sost('    this.car(CX + 38, CZ + 6.4, -0.03, M.carBlue);\n', "    this.car(CX + 38, CZ + 6.4, -0.03, { color: new THREE.Color(typeof AUTO115_COLORI !== 'undefined' ? AUTO115_COLORI[2] : 0x3d7ac9) });   // v115: gialla (erano due blu)\n", 'terza auto della citta');

// ---------- versione ----------
sost('<div id="ver">v114</div>', '<div id="ver">v115</div>', 'versione in lobby');
fs.writeFileSync(path.join(RAD, 'VERSIONE'), '115\n');
fs.writeFileSync(F, s);
console.log('scritto', F, (s.length / 1e6).toFixed(2), 'MB');
