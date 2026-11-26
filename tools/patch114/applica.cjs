// Patch v114: forzieri con bottino casuale per rarita' + medikit da portare (tasto T).
// Uso: node tools/patch114/applica.cjs   (parte dalla v113: index.html con <div id="ver">v113</div>)
// Il modello del forziere viene da assets/forziere114/forziere114.glb (fatto da tools/forziere114/prepara.cjs).
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const RAD = path.join(__dirname, '..', '..'), F = path.join(RAD, 'index.html');
let s = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const sost = (da, a, nome) => { const n = s.split(da).length - 1; if (n !== 1) throw new Error(nome + ': trovato ' + n + ' volte'); s = s.replace(da, () => a); console.log('ok', nome); };
const leggi = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').split('\r\n').join('\n');

// ---------- modello e modulo ----------
const b64 = zlib.gzipSync(fs.readFileSync(path.join(RAD, 'assets', 'forziere114', 'forziere114.glb')), { level: 9 }).toString('base64');
sost('\nasync function loadingStage91(text,done){\n', "\n// v114: forziere di Lorenzo (forziere_v3.glb alleggerito, cassa + coperchio): tools/forziere114/prepara.cjs\nconst FORZIERE114_B64='" + b64 + "';\nasync function loadingStage91(text,done){\n", 'dati del forziere');
sost("  try{DELTAPLANO108=buildGLBScene(parseGLB(await gunzip(b64bytes(DELTAPLANO108_B64)))).root;}catch(e){DELTAPLANO108=null;assetError85('Deltaplano',e);}\n",
  "  try{DELTAPLANO108=buildGLBScene(parseGLB(await gunzip(b64bytes(DELTAPLANO108_B64)))).root;}catch(e){DELTAPLANO108=null;assetError85('Deltaplano',e);}\n  await caricaForziere114();   // v114\n", 'caricamento forziere');
sost('\n/* ============================================================\n   AREA SICURA\n', '\n' + leggi('forzieri.js') + '\n/* ============================================================\n   AREA SICURA\n', 'modulo forzieri e medikit');

// ---------- tasto ----------
sost("  { id: 'drop', lab: 'Butta arma', def: 'KeyH', grp: 'Azioni' },\n", "  { id: 'drop', lab: 'Butta arma', def: 'KeyH', grp: 'Azioni' },\n  { id: 'medikit', lab: 'Usa medikit', def: 'KeyT', grp: 'Azioni' },   // v114\n", 'tasto medikit');

// ---------- personaggio: vita massima, medikit, rarita' delle armi ----------
sost('    this.hp = 100; this.shield = 0; this.alive = true; this.kills = 0; this.deathT = 0;\n', '    this.hp = 100; this.maxHp = 100; this.medikit114 = 0; this.shield = 0; this.alive = true; this.kills = 0; this.deathT = 0;   // v114: vita massima, medikit nello zaino\n', 'vita massima');
sost('  heal(n) { this.hp = Math.min(100, this.hp + n); }', '  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }   // v114: mai oltre la vita massima', 'cura col tetto');
sost('  giveWeapon(w, extraAmmo = 0, mag, at) {', "  giveWeapon(w, extraAmmo = 0, mag, at, rar) {   // v114: rar = rarita' (solo armi dai forzieri)", 'giveWeapon con rarita');
sost('    this.inv[k] = { w, mag: mag !== undefined ? Math.max(0, Math.min(def.mag, mag)) : def.mag };\n', '    this.inv[k] = { w, mag: mag !== undefined ? Math.max(0, Math.min(def.mag, mag)) : def.mag }; if (rar) this.inv[k].rar = rar;\n', 'casella con rarita');

// ---------- danno ----------
sost('        h.dmg = dannoArma107(w, h.zone, h.dist, ch, victim);\n', "        h.dmg = Math.max(1, Math.round(dannoArma107(w, h.zone, h.dist, ch, victim) * moltRarita114(ch.cur109())));   // v114: rarita'\n", 'danno con rarita');
sost('G.build.damagePiece(col.piece, Math.round(w.dmg * 0.9), ch);', 'G.build.damagePiece(col.piece, Math.round(w.dmg * 0.9 * moltRarita114(ch.cur109())), ch);', 'danno ai pezzi con rarita');
sost('    ch.fireCd = w.rate; ch.cur109().mag--;', "    if (ch.isPlayer && this.G.medikit114 && this.G.medikit114.attivo()) this.G.medikit114.annulla('Cura interrotta');   // v114\n    ch.fireCd = w.rate; ch.cur109().mag--;", 'sparare interrompe la cura');

// ---------- oggetti ----------
sost("  medkit: { label: 'Kit medico (vita piena)', kind: 'heal', n: 100, cap: 100 },", "  medkit: { label: 'Medikit', kind: 'medikit', n: 50, cap: 100 },   // v114: si porta (MEDIKIT114); etichetta vera nel modulo forzieri", 'medikit da portare');
sost('  mat: { puo: (ch, it) => ch.res[it.def.type] < 999,', "  // v114: il giocatore lo mette nello zaino (fino a MEDIKIT114.max) e lo usa col suo tasto; i bot lo usano subito\n  medikit: { puo: (ch) => ch.isPlayer ? ch.medikit114 < MEDIKIT114.max : ch.hp < ch.maxHp, motivo: 'Medikit al massimo', colore: 0x7dff8a,\n    prendi(I, ch) { if (ch.isPlayer) ch.medikit114++; else ch.heal(MEDIKIT114.cura); return true; } },\n  mat: { puo: (ch, it) => ch.res[it.def.type] < 999,", 'raccolta medikit');
sost('      if (ch.giveWeapon(it.type, res, mag) >= 0) return true;', '      if (ch.giveWeapon(it.type, res, mag, undefined, it.rar114) >= 0) return true;', 'raccolta arma con rarita');
sost('      ch.svuota109(k); ch.giveWeapon(it.type, res, mag, k);\n      I.lancia109(vecchia.w, ch, { mag: vecchia.mag, res: 0 });', '      ch.svuota109(k); ch.giveWeapon(it.type, res, mag, k, it.rar114);\n      I.lancia109(vecchia.w, ch, { mag: vecchia.mag, res: 0, rar: vecchia.rar });', 'scambio con rarita');
sost("    else if (def.kind === 'heal') { const med = type === 'medkit';", "    else if (def.kind === 'heal' || def.kind === 'medikit') { const med = type === 'medkit';", 'modello medikit');
sost('    const it = { type, def, g, x, y, z, t: Math.random() * 6, extra: extra || 0 }; this.list.push(it); return it;', '    const it = { type, def, g, ring, x, y, z, t: Math.random() * 6, extra: extra || 0 }; this.list.push(it); return it;', "anello nell'oggetto");
sost("    if (d.kind === 'weapon') { const m = it.mag109 !== undefined ? it.mag109 : WEAPONS[it.type].mag; return d.label + ' ' + m",
  "    if (d.kind === 'weapon') { const m = it.mag109 !== undefined ? it.mag109 : WEAPONS[it.type].mag; return d.label + (it.rar114 ? ' ' + RARITA114[it.rar114].nome : '') + ' ' + m", 'nome con rarita');
sost('  // cosa succede premendo raccogli: verbo', "  // v114: arma con rarita' (dai forzieri): la porta con se' e l'anello a terra prende il suo colore\n  rarita114(it, r) {\n    if (!r || !RARITA114[r]) return; it.rar114 = r;\n    if (!this.anelli114) this.anelli114 = {};\n    if (!this.anelli114[r]) this.anelli114[r] = hdr110(new THREE.SpriteMaterial({ map: TEX.ring, color: RARITY[r].col, transparent: true, opacity: 0.85, depthWrite: false }), 2.2);\n    if (it.ring) it.ring.material = this.anelli114[r];\n  }\n  // cosa succede premendo raccogli: verbo", 'rarita sugli oggetti');
sost('    if (o.mag !== undefined) it.mag109 = o.mag;', '    if (o.rar) this.rarita114(it, o.rar);   // v114\n    if (o.mag !== undefined) it.mag109 = o.mag;', 'lancio con rarita');
sost('for (const s of victim.inv) if (s) this.items.lancia109(s.w, victim, { mag: s.mag, res: 0, ang: n++ });', 'for (const s of victim.inv) if (s) this.items.lancia109(s.w, victim, { mag: s.mag, res: 0, ang: n++, rar: s.rar });', 'morte con rarita');
sost('    this.items.lancia109(s.w, p, { mag: s.mag, res: 0 }); this.hud.toast(', '    this.items.lancia109(s.w, p, { mag: s.mag, res: 0, rar: s.rar }); this.hud.toast(', 'butta con rarita');

// ---------- partita ----------
sost('this.items = new Items(this); this.zone = new SafeZone(this);', 'this.items = new Items(this); this.zone = new SafeZone(this); this.forzieri114 = new Forzieri114(this); this.medikit114 = new Medikit114(this);', 'sistemi nella partita');
sost('    this.items.reset(); this.fx.reset(); this.world.restoreHarvestables();', '    this.items.reset(); if (this.forzieri114) this.forzieri114.reset(); if (this.medikit114) this.medikit114.reset(); this.fx.reset(); this.world.restoreHarvestables();', 'reset forzieri');
sost('    for (const [type, x, z, yo] of W.itemSpawns) this.items.spawn(type, x, z, yo);\n', '    for (const [type, x, z, yo] of W.itemSpawns) this.items.spawn(type, x, z, yo);\n    if (this.forzieri114) { spargiMedikit114(this); this.forzieri114.piazza(); }   // v114\n', 'forzieri e medikit sulla mappa');
sost('this.items.update(dt); this.world.update(dt, this.time);', 'this.items.update(dt); if (this.forzieri114) this.forzieri114.update(dt); if (this.medikit114) this.medikit114.update(dt); this.world.update(dt, this.time);', 'aggiornamento');
sost("      case 'pickup': { const it = this.items.nearest(p.pos, 2.6);", "      case 'pickup': { const fz = this.forzieri114 && this.forzieri114.bersaglio(p); if (fz) { this.forzieri114.apri(fz, p); return; }   // v114: prima il forziere guardato\n        const it = this.items.nearest(p.pos, 2.6);", 'tasto raccogli apre il forziere');
sost("      case 'drop': if (!this.build.active && !this.edit.active) this.lascia109(); return;\n", "      case 'drop': if (!this.build.active && !this.edit.active) this.lascia109(); return;\n      case 'medikit': if (this.medikit114) this.medikit114.inizia(p); return;   // v114\n", 'tasto medikit nel gioco');
sost('if(down(2)){const it=G.items.nearest(G.player.pos,2.6);', 'if(down(2)){const it=G.items.nearest(G.player.pos,2.6)||(G.forzieri114&&G.forzieri114.bersaglio(G.player));', 'controller apre il forziere');
sost("  tapPickup105(x,y){const G=this.G,p=G.player;if(!p||!p.alive||p.air88||G.state!=='playing'||!G.items)return false;\n", "  tapPickup105(x,y){const G=this.G,p=G.player;if(!p||!p.alive||p.air88||G.state!=='playing'||!G.items)return false;\n    if(G.forzieri114&&G.forzieri114.tocco(x,y,p))return true;   // v114\n", 'tocco apre il forziere');

// ---------- interfaccia ----------
sost("this.set('hp', e.hpNum, Math.ceil(ch.hp) + ' | 100'); e.hpBar.style.width = clamp(ch.hp, 0, 100) + '%';", "this.set('hp', e.hpNum, Math.ceil(ch.hp) + ' | ' + ch.maxHp); e.hpBar.style.width = clamp(ch.hp / ch.maxHp * 100, 0, 100) + '%';", 'barra vita');
sost("this.set('wn', e.weaponName, w.name); }", "this.set('wn', e.weaponName, w.name + (ch.cur109().rar ? ' · ' + RARITA114[ch.cur109().rar].nome : '')); }", 'nome arma con rarita');
sost('    e.reloadBar.style.width = ch.reloading ?', "    e.reloadBar.style.width = G.medikit114 && G.medikit114.attivo() ? (G.medikit114.progresso() * 100) + '%' : ch.reloading ?", 'barra della cura');
sost("ch.inv.forEach((s, i) => { const r = s ? WEAPONS[s.w].rarity : '';", 'ch.inv.forEach((s, i) => { const r = raritaDi114(s);', 'colore casella con rarita');
sost('    }\n    hb.innerHTML = html;', "      html += `<div class=\"slot r-common medikit114 ${ch.medikit114 ? '' : 'vuoto114'}\"><span class=\"k\">${keyLabel(KEYS.medikit)}</span><span class=\"cr114\">✚</span><span class=\"n\">${ch.medikit114 || 0}/${MEDIKIT114.max}</span></div>`;   // v114\n    }\n    hb.innerHTML = html;", 'casella medikit');
sost('G.tienePremuto109(e,k);}}this.refreshHotbar();};', 'G.tienePremuto109(e,k);}else if(k===ch.inv.length&&G.medikit114)G.medikit114.inizia(ch);}this.refreshHotbar();};', 'tocco sulla casella medikit');
sost('    const it = G.items.nearest(ch.pos, 2.6);\n', '    const fz114 = G.forzieri114 && ch.alive ? G.forzieri114.bersaglio(ch) : null;   // v114: il forziere guardato ha la precedenza\n    const it = fz114 ? null : G.items.nearest(ch.pos, 2.6);\n', 'scritta: forziere');
sost("    else e.prompt.classList.add('hidden');\n    // info pezzo puntato", "    else if (fz114) { const txt = G.touch84?.active ? 'Tocca per aprire il <b>forziere</b>' : `<b>${keyLabel(KEYS.pickup)}</b>Apri il forziere`; if (this.cache.prompt !== txt) { this.cache.prompt = txt; e.prompt.innerHTML = txt; } e.prompt.classList.remove('hidden'); }\n    else e.prompt.classList.add('hidden');\n    // info pezzo puntato", 'scritta apri forziere');
sost('.slot.r-epic{background:radial-gradient(circle at 50% 35%,#cf8cff,#6a23a8)}', '.slot.r-epic{background:radial-gradient(circle at 50% 35%,#cf8cff,#6a23a8)}\n/* v114: casella dei medikit */\n.slot.medikit114 .cr114{font-size:26px;line-height:1;color:#ff4a4a;text-shadow:0 0 3px #fff,0 2px 0 #000}.slot.vuoto114{opacity:.45}', 'stile casella medikit');

// ---------- versione ----------
sost('<div id="ver">v113</div>', '<div id="ver">v114</div>', 'versione in lobby');
fs.writeFileSync(path.join(RAD, 'VERSIONE'), '114\n');
fs.writeFileSync(F, s);
console.log('scritto', F, (s.length / 1e6).toFixed(2), 'MB');
