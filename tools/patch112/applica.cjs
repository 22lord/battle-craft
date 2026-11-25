// Patch v112: fase grafica 2 (materiali e texture) + tappi del castello spenti finche' non servono.
// Uso: git checkout index.html VERSIONE && node tools/patch112/applica.cjs   (parte dalla v111 del repo)
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', '..', 'index.html');
let s = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');   // git (autocrlf) lo estrae in CRLF
const sost = (da, a, nome) => { const n = s.split(da).length - 1; if (n !== 1) throw new Error(nome + ': trovato ' + n + ' volte'); s = s.replace(da, () => a); console.log('ok', nome); };
const leggi = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').split('\r\n').join('\n');

// ---------- tappi del castello ----------
sost('    this.castelloCols105 = cols; this.castelloBlocchi106 = [...rec106.values()];\n',
  '    this.castelloCols105 = cols; this.castelloBlocchi106 = [...rec106.values()];\n    if (BL) this.tappiN112 = this.tappi112(meshes, rec106, BL, C, y0);   // v112\n', 'chiamata tappi');
sost('  // segno del castello sulla minimappa (rifatta con il terreno): mura grigie, torri, tetto rosso\n',
  leggi('tappi.js') + '  // segno del castello sulla minimappa (rifatta con il terreno): mura grigie, torri, tetto rosso\n', 'metodi tappi');
sost('        a.fill(0, h.start * 3, (h.start + h.count) * 3); pa.needsUpdate = true;\n      }\n      return;\n',
  '        a.fill(0, h.start * 3, (h.start + h.count) * 3); pa.needsUpdate = true;\n      }\n      if (rec.castello106) this.mostraTappi112(rec);   // v112: si aprono i tappi dei vicini che guardano qui\n      return;\n', 'rottura apre i tappi');
sost('  restoreHarvestables() {\n', '  restoreHarvestables() {\n    this.nascondiTappi112 && this.nascondiTappi112();   // v112\n', 'ripristino richiude i tappi');

// ---------- materiali e texture ----------
sost('\nclass Game {\n', '\n' + leggi('materiali.js') + '\nclass Game {\n', 'blocco materiali');
sost('    makeTextures(); makeMaterials();\n', '    makeTextures(); makeMaterials(); registraUv112();   // v112: UV nel mondo (le texture nuove nascono in scambia112)\n', 'genera texture');
sost('  batch(geo, mat, handle) {\n', '  batch(geo, mat, handle) {\n    uvMondo112(geo, mat);   // v112: UV nel mondo\n', 'uv nel mondo');
sost('    if (this.water) { M.water.map.offset.x = t * 0.01; M.water.map.offset.y = t * 0.007; }',
  '    if (this.water) { M.water.map.offset.x = t * 0.01; M.water.map.offset.y = t * 0.007; MAT112.tempo.value = t; }', 'tempo acqua');
sost('    if (this.post110) this.post110.setQuality(q);\n', '    if (this.post110) this.post110.setQuality(q);\n    scambia112(this, MAT112.spento ? \'low\' : q);   // v112: materiali nuovi in Media/Alta (F3 li spegne)\n', 'scambio in setQuality');
sost("['ombre', 'Ombre'], ['ora', 'Ora']]) {", "['ombre', 'Ombre'], ['mat', 'Materiali'], ['ora', 'Ora']]) {", 'F3 bottone materiali');
sost("    if (k === 'ora') { const g = G.giorno110;", "    if (k === 'mat') { MAT112.spento = !MAT112.spento; scambia112(G, MAT112.spento ? 'low' : G.quality); this.t = 1; return; }   // v112\n    if (k === 'ora') { const g = G.giorno110;", 'F3 cambia materiali');
sost("this.btn.ora.textContent = 'Ora +3h';\n", "this.btn.ora.textContent = 'Ora +3h';\n    if (this.btn.mat) this.btn.mat.textContent = 'Materiali ' + (MAT112.pronto ? (MAT112.attivo ? 'v112' : 'vecchi') : 'n/d');\n", 'F3 scritta materiali');
sost('<div id="ver">v111</div>', '<div id="ver">v112</div>', 'versione in lobby');

// ---------- versione ----------
fs.writeFileSync(path.join(__dirname, '..', '..', 'VERSIONE'), '112\n');
fs.writeFileSync(F, s);
console.log('scritto', F, (s.length / 1e6).toFixed(2), 'MB');
