// Patch v118: multiplayer fase 3 — partita vera (l'host avvia, bus insieme all'ora del server, stanza chiusa
// fino alla fine), deltaplano degli altri, bot (li fa ragionare l'host), costruzioni condivise, spettatore.
// Uso: node tools/patch118/applica.cjs   (parte dalla v117: index.html con <div id="ver">v117</div>)
// Sostituisce il modulo di rete con tools/patch118/rete.js.
const fs = require('fs'), path = require('path');
const RAD = path.join(__dirname, '..', '..'), F = path.join(RAD, 'index.html');
let s = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const sost = (da, a, nome) => { const n = s.split(da).length - 1; if (n !== 1) throw new Error(nome + ': trovato ' + n + ' volte'); s = s.replace(da, () => a); console.log('ok', nome); };
const leggi = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').split('\r\n').join('\n');

// ---------- modulo di rete: sostituito per intero ----------
const inizio = '/* ============================================================\n   v116: MULTIPLAYER ONLINE';
const fine = '\nclass Game {\n';
const a = s.indexOf(inizio), b = s.indexOf(fine);
if (a < 0 || b < 0 || b < a || s.indexOf(inizio, a + 1) >= 0) throw new Error('modulo di rete non trovato (una volta sola)');
s = s.slice(0, a) + leggi('rete.js') + '\n' + s.slice(b + 1);
console.log('ok modulo di rete sostituito');

// ---------- il bus non muove chi e' guidato dalla rete (giocatori remoti, bot dell'host sugli altri client) ----------
sost('for(const c of G.chars){const a=c.air88;if(!a)continue;a.time+=dt;', 'for(const c of G.chars){const a=c.air88;if(!a||c.remoto116)continue;a.time+=dt;/* v118 */', 'bus: salta i personaggi della rete');

// ---------- tempesta online (nella v116-v117 era spenta): la fa avanzare l'ora del server ----------
sost('if(this.drop88.elapsed>this.drop88.duration&&!this.online116)this.zone.update(dt);',
  'if(this.drop88.elapsed>this.drop88.duration&&(!this.online116||(this.rete116&&this.rete116.zonaOn())))this.zone.update(dt);', 'tempesta online');
sost('if (!c.alive||c.air88||this.online116) continue;',
  'if (!c.alive||c.air88||(this.online116&&(!this.rete116||!this.rete116.zonaOn()||c.remoto116))) continue;', 'danno della tempesta online (solo a me e ai miei bot)');

// ---------- in pausa la partita online va avanti (l'host fa ragionare i bot di tutti) ----------
sost("else if (this.state === 'ended' || this.state === 'paused') {", "else if (this.state === 'paused' && this.online116) this.update(dt);   /* v118 */\n    else if (this.state === 'ended' || this.state === 'paused') {", 'pausa online');

// ---------- lobby: quanti bot (lo sceglie l'host) ----------
sost('<div id="o116info">', '<div class="o116r" id="o116botRiga" style="display:none;align-items:center;gap:8px;font-size:13px;color:#cfe3ff">Bot <select id="o116bot"><option value="0">nessuno</option><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="29">29 (pieno)</option></select></div><div id="o116info">', 'scelta dei bot');
sost('#online116 .o116r{display:flex;gap:6px}', '#online116 .o116r{display:flex;gap:6px}#o116bot{padding:4px 8px;font-size:13px}#readyBox .ready:disabled{cursor:default;transform:none}', 'stile scelta dei bot');

// ---------- versione ----------
sost('<div id="ver">v117</div>', '<div id="ver">v118</div>', 'versione in lobby');
fs.writeFileSync(path.join(RAD, 'VERSIONE'), '118\n');
fs.writeFileSync(F, s);
console.log('scritto', F, (s.length / 1e6).toFixed(2), 'MB');
