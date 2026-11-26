// Patch v116: multiplayer online con Colyseus (2 giocatori, codice stanza). Server in server/.
// Uso: node tools/patch116/applica.cjs   (parte dalla v115: index.html con <div id="ver">v115</div>)
const fs = require('fs'), path = require('path');
const RAD = path.join(__dirname, '..', '..'), F = path.join(RAD, 'index.html');
let s = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const sost = (da, a, nome) => { const n = s.split(da).length - 1; if (n !== 1) throw new Error(nome + ': trovato ' + n + ' volte'); s = s.replace(da, () => a); console.log('ok', nome); };
const leggi = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').split('\r\n').join('\n');

// ---------- indirizzo del server (lo riempie la pubblicazione: tools/vercel/prepara.cjs) ----------
sost('<meta name="theme-color" content="#0b1623">', '<meta name="theme-color" content="#0b1623">\n<meta name="battlecraft-server" content="">', 'meta del server');

// ---------- stile ----------
sost('#ver{position:fixed;left:12px;bottom:8px;',
  '#online116{background:var(--panel);border:2px solid rgba(255,255,255,.14);border-bottom:0;border-radius:10px 10px 0 0;padding:10px 12px;display:flex;flex-direction:column;gap:7px;backdrop-filter:blur(4px)}\n' +
  '#online116 .o116r{display:flex;gap:6px}#online116 .o116r .sbtn{flex:1;padding:7px 8px;font-size:14px}#online116 .sbtn:disabled{opacity:.45;cursor:default}\n' +
  '#o116codice{width:96px;flex:0 0 96px;font:inherit;font-weight:800;letter-spacing:3px;text-align:center;text-transform:uppercase;padding:6px;border-radius:6px;border:1px solid #5a7a99;background:#0d1d30;color:#fff}\n' +
  '#o116info{font-size:13px;line-height:1.45;color:#cfe3ff;min-height:18px}#o116info b{color:#fff}#o116info .o116cod{color:var(--y);letter-spacing:2px;font-size:16px}#o116info .o116p{padding:4px 8px;font-size:12px;margin-top:4px}#o116info .o116esci{background:linear-gradient(180deg,#ffb0a0,#e8664a);box-shadow:0 3px 0 #8f3a1c}\n' +
  '#readyBox .mode{border-radius:0}\n' +
  '#rete116{position:fixed;top:8px;left:50%;transform:translateX(-50%);display:none;padding:4px 12px;border-radius:6px;background:rgba(8,18,40,.62);color:#cfe3ff;font-size:12px;letter-spacing:1px;pointer-events:none;z-index:11;white-space:nowrap}\n' +
  '#ver{position:fixed;left:12px;bottom:8px;', 'stile pannello online');

// ---------- lobby: pannello "online" sopra a MODALITA' ----------
sost('<div class="mode x"><small>MODALITÀ</small><div>Solo</div></div>',
  '<div id="online116"><div class="o116r"><button class="sbtn" id="o116crea">Crea stanza</button></div>' +
  '<div class="o116r"><input id="o116codice" type="text" maxlength="4" spellcheck="false" autocomplete="off" placeholder="CODICE" aria-label="Codice stanza"><button class="sbtn" id="o116entra">Entra</button></div>' +
  '<div id="o116info">Gioca con un amico: crea una stanza e mandagli il link.</div></div>\n' +
  '    <div class="mode x"><small>MODALITÀ</small><div id="modoNome116">Solo</div></div>', 'pannello online in lobby');
sost('<div id="hud" class="hidden">', '<div id="rete116"></div>\n<div id="hud" class="hidden">', 'etichetta della stanza in partita');

// ---------- modulo ----------
sost('\nclass Game {\n', '\n' + leggi('rete.js') + '\nclass Game {\n', 'classe Rete116');
sost('buildCharacterModel(opts.colors || PALETTES[0], !!opts.isPlayer)', 'buildCharacterModel(opts.colors || PALETTES[0], !!(opts.isPlayer || opts.eroe116))', 'modello pieno per l\'altro giocatore');
sost('this.bindUI(); this.input.bind(this);', 'this.rete116 = new Rete116(this); /* v116 */ this.bindUI(); this.input.bind(this);', 'Rete116 nel Game');
sost('  startMatch() {\n    this.resetDynamic();\n    const W = this.world;\n',
  '  startMatch() {\n    if (this.rete116 && this.rete116.attiva()) return this.rete116.startMatch();   // v116: partita online\n    this.resetDynamic();\n    const W = this.world;\n', 'startMatch online');
sost("if(this.state==='visual93')this.visual93.update(dt,rawMs93);", "if(this.rete116)this.rete116.update(dt);/* v116: prima di update, cosi' l'altro e' in posa prima di animate */\n    if(this.state==='visual93')this.visual93.update(dt,rawMs93);", 'rete nel ciclo');
sost("  quitToMenu() { this.state = 'title';", "  quitToMenu() { if (this.rete116) this.rete116.esciPartita(); this.state = 'title';", 'uscita dalla partita online');
sost('if(this.drop88.elapsed>this.drop88.duration)this.zone.update(dt);', 'if(this.drop88.elapsed>this.drop88.duration&&!this.online116)this.zone.update(dt);', 'niente tempesta online');
sost('for (const c of this.chars) { if (!c.alive||c.air88) continue; if (this.zone.distOutside', 'for (const c of this.chars) { if (!c.alive||c.air88||this.online116) continue; if (this.zone.distOutside', 'niente danno della tempesta online');

// ---------- versione ----------
sost('<div id="ver">v115</div>', '<div id="ver">v116</div>', 'versione in lobby');
fs.writeFileSync(path.join(RAD, 'VERSIONE'), '116\n');
fs.writeFileSync(F, s);
console.log('scritto', F, (s.length / 1e6).toFixed(2), 'MB');
