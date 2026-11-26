// Patch v117: multiplayer fase 2 — fino a 10 giocatori, spari e danni fra giocatori (vita sul server).
// Uso: node tools/patch117/applica.cjs   (parte dalla v116: index.html con <div id="ver">v116</div>)
// Sostituisce il modulo di rete (Rete116, da tools/patch116/rete.js) con tools/patch117/rete.js.
const fs = require('fs'), path = require('path');
const RAD = path.join(__dirname, '..', '..'), F = path.join(RAD, 'index.html');
let s = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const sost = (da, a, nome) => { const n = s.split(da).length - 1; if (n !== 1) throw new Error(nome + ': trovato ' + n + ' volte'); s = s.replace(da, () => a); console.log('ok', nome); };
const leggi = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').split('\r\n').join('\n');

// ---------- modulo di rete: sostituito per intero ----------
const inizio = '/* ============================================================\n   v116: MULTIPLAYER ONLINE';
const fine = '\nclass Game {\n';
const a = s.indexOf(inizio), b = s.indexOf(fine);
if (a < 0 || b < 0 || b < a || s.indexOf(inizio, a + 1) >= 0) throw new Error('modulo di rete v116 non trovato (una volta sola)');
s = s.slice(0, a) + leggi('rete.js') + '\n' + s.slice(b + 1);
console.log('ok modulo di rete sostituito');

// ---------- lobby ----------
sost('<div id="o116info">Gioca con un amico: crea una stanza e mandagli il link.</div>', '<div id="o116info">Gioca con gli amici (fino a 10): crea una stanza e manda il link.</div>', 'testo del pannello');

// ---------- versione ----------
sost('<div id="ver">v116</div>', '<div id="ver">v117</div>', 'versione in lobby');
fs.writeFileSync(path.join(RAD, 'VERSIONE'), '117\n');
fs.writeFileSync(F, s);
console.log('scritto', F, (s.length / 1e6).toFixed(2), 'MB');
