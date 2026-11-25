// Patch v111: nome chiesto alla prima apertura + sparo automatico (opzione).
// Uso: git checkout index.html VERSIONE && node tools/patch111/applica.cjs   (parte dalla v110 del repo)
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', '..', 'index.html');
let s = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');   // git (autocrlf) lo estrae in CRLF
const sost = (da, a, nome) => { const n = s.split(da).length - 1; if (n !== 1) throw new Error(nome + ': trovato ' + n + ' volte'); s = s.replace(da, () => a); console.log('ok', nome); };

// --- impostazioni: riga dello sparo automatico ---
sost('    <div class="row">Volume armi <input id="armiSel109" type="range" min="0" max="1" step="0.05" value="0.7"></div>\n',
  '    <div class="row">Volume armi <input id="armiSel109" type="range" min="0" max="1" step="0.05" value="0.7"></div>\n    <div class="row">Sparo automatico <input id="sparoSel111" type="checkbox"></div>\n', 'riga impostazioni');
sost('    <p class="note">A Facile i bot ti vedono da meno lontano,',
  '    <p class="note">Sparo automatico: quando il mirino è su un avversario (senza muri in mezzo e entro la portata dell\'arma) l\'arma spara da sola, al suo ritmo.</p>\n    <p class="note">A Facile i bot ti vedono da meno lontano,', 'nota impostazioni');

// --- costanti e finestra di benvenuto, prima di class Game ---
sost('\nclass Game {\n', `
/* ============================================================
   v111 — SPARO AUTOMATICO e NOME ALLA PRIMA APERTURA
   Sparo automatico (opzione, spenta di serie, salvata in battlecraft_sparoauto111): se il mirino e'
   su un avversario vivo, senza muri in mezzo ed entro la portata dell'arma, l'arma spara da sola al
   suo ritmo (anche le armi a colpo singolo). Col piccone no. soloInMira = true lo limiterebbe a quando
   si tiene la mira (tasto destro / LT). Il controllo costa poco: prima un test geometrico sui
   personaggi (distanza dalla linea del mirino); il raggio vero (lo stesso dello sparo) parte solo se
   qualcuno e' vicino alla linea, al massimo ogni "intervallo" secondi.
   ============================================================ */
const SPARO111 = { soloInMira: false, intervallo: 0.05, largo: 1.0 };
/* Finestra di benvenuto: una volta per dispositivo (battlecraft_benvenuto111), col nome gia' scritto se
   c'era. Dopo il nome resta salvato (baia_nome, come prima) e si cambia da Impostazioni. */
function benvenuto111(G) {
  if (lsGet103('battlecraft_benvenuto111') === '1' || document.getElementById('benvenuto111')) return;
  const ov = document.createElement('div'); ov.id = 'benvenuto111';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(6,12,28,.72);font-family:inherit';
  ov.innerHTML = '<div style="background:#14213d;border:2px solid rgba(255,255,255,.18);border-radius:14px;padding:22px 24px;width:min(360px,calc(100vw - 32px));color:#fff;box-shadow:0 12px 40px rgba(0,0,0,.5)">'
    + '<div style="font-size:22px;font-weight:800;margin-bottom:4px">Benvenuto!</div>'
    + '<div style="opacity:.8;margin-bottom:14px">Come ti chiami? Il nome resta salvato: lo cambi quando vuoi da Impostazioni.</div>'
    + '<input id="benvNome111" type="text" maxlength="16" spellcheck="false" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:16px;padding:10px 12px;border-radius:8px;border:1px solid #567;background:#0d1730;color:#fff">'
    + '<label style="display:flex;gap:10px;align-items:flex-start;margin:14px 0 18px;cursor:pointer"><input id="benvSparo111" type="checkbox" style="width:20px;height:20px;margin-top:2px"><span><b>Sparo automatico</b><br><span style="opacity:.75;font-size:13px">L\\'arma spara da sola quando il mirino è su un avversario.</span></span></label>'
    + '<button id="benvOk111" type="button" style="width:100%;font-size:17px;font-weight:800;padding:11px;border-radius:9px;border:0;background:#ffd23f;color:#1a1a1a;cursor:pointer">Inizia</button></div>';
  document.body.appendChild(ov);
  const nome = document.getElementById('benvNome111'), sp = document.getElementById('benvSparo111');
  nome.value = G.playerName && G.playerName !== '22lordd' ? G.playerName : ''; nome.placeholder = 'Il tuo nome'; sp.checked = !!G.sparoAuto111;
  const ok = () => { G.applicaNome(nome.value.trim() || G.playerName); G.impostaSparo111(sp.checked); try { localStorage.setItem('battlecraft_benvenuto111', '1'); } catch (e) { } ov.remove(); };
  nome.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') ok(); });
  ov.addEventListener('pointerdown', (e) => e.stopPropagation()); ov.addEventListener('keydown', (e) => e.stopPropagation());
  document.getElementById('benvOk111').addEventListener('click', ok);
  setTimeout(() => { try { nome.focus(); } catch (e) { } }, 50);
}

class Game {
`, 'blocco v111');

// --- metodi del Game: impostazione e controllo del mirino ---
sost('  saveStats() {', `  impostaSparo111(on) {
    this.sparoAuto111 = !!on; try { localStorage.setItem('battlecraft_sparoauto111', on ? '1' : '0'); } catch (e) { }
    const el = document.getElementById('sparoSel111'); if (el) el.checked = this.sparoAuto111;
  }
  /* true se il mirino (raggio della telecamera, lo stesso dello sparo) prende un avversario vivo prima di
     qualsiasi muro, entro la portata dell'arma. Risultato tenuto per SPARO111.intervallo secondi. */
  mirinoSuNemico111(p, dt) {
    this._sparoT111 = (this._sparoT111 || 0) - dt; if (this._sparoT111 > 0) return !!this._sparoOk111;
    this._sparoT111 = SPARO111.intervallo; this._sparoOk111 = false;
    const w = WEAPONS[p.weapon]; if (!w) return false; const o = this.cam.pos, d = this.cam.dir, L = SPARO111.largo; let vicino = false;
    for (const c of this.chars) {
      if (c === p || !c.alive || c.air88) continue;
      const vx = c.pos.x - o.x, vy = c.pos.y + 0.9 - o.y, vz = c.pos.z - o.z, t = vx * d.x + vy * d.y + vz * d.z;
      if (t <= 0 || t > w.range + 1) continue;
      const px = vx - d.x * t, py = vy - d.y * t, pz = vz - d.z * t; if (px * px + py * py + pz * pz < L * L) { vicino = true; break; }
    }
    if (!vicino) return false;
    const r = this.physics.raycast(o, d, w.range, { chars: true, ignore: p });
    this._sparoOk111 = !!(r.hit && r.char && r.char !== p && r.char.alive); return this._sparoOk111;
  }
  saveStats() {`, 'metodi');

// --- sparo nel ciclo di gioco ---
sost("      if (!p.air88 && p.mode === 'weapon' && p.weapon && (inp.mouseL||inp.padFire88) && !this.edit.active) {",
  "      // v111: sparo automatico (opzione): nessun grilletto premuto, mirino su un avversario\n      const auto111 = !!this.sparoAuto111 && !p.air88 && p.mode === 'weapon' && !!p.weapon && !this.edit.active && !(this.build && this.build.active) && !(inp.mouseL || inp.padFire88) && (!SPARO111.soloInMira || p.ads) && this.mirinoSuNemico111(p, dt);\n      if (!p.air88 && p.mode === 'weapon' && p.weapon && (inp.mouseL||inp.padFire88||auto111) && !this.edit.active) {", 'condizione di fuoco');
sost('        if (w.auto || !this.firedPress) { const before = p.fireCd; if (this.combat.tryFire(p, this.cam.pos, this.cam.dir)) { this.firedPress = true;',
  '        if (w.auto || auto111 || !this.firedPress) { const before = p.fireCd; if (this.combat.tryFire(p, this.cam.pos, this.cam.dir)) { if (!auto111) this.firedPress = true;', 'colpo singolo in automatico');
sost('} else if (!w.auto && before <= 0) this.firedPress = true; }', '} else if (!w.auto && !auto111 && before <= 0) this.firedPress = true; }', 'grilletto non bloccato dall\'automatico');

// --- impostazioni: lettura e casella ---
sost("    { const sv = +lsGet103('bc_sens105');",
  "    { this.sparoAuto111 = lsGet103('battlecraft_sparoauto111') === '1'; const sa = $('sparoSel111'); if (sa) { sa.checked = this.sparoAuto111; sa.addEventListener('change', (e) => this.impostaSparo111(e.target.checked)); } }   // v111\n    { const sv = +lsGet103('bc_sens105');", 'casella impostazioni');

// --- finestra di benvenuto quando sparisce il caricamento ---
sost('provaMusica103();   // v103: musica della lobby subito, se il browser lo permette',
  'provaMusica103();   // v103: musica della lobby subito, se il browser lo permette\n  benvenuto111(window.__game);   // v111: nome (e sparo automatico) alla prima apertura', 'benvenuto');

sost('<div id="ver">v104</div>', '<div id="ver">v111</div>', 'versione in lobby');   // era ferma alla v104: il test v111 ora la confronta con VERSIONE
fs.writeFileSync(F, s);
fs.writeFileSync(path.join(__dirname, '..', '..', 'VERSIONE'), '111\n');
console.log('scritto', (s.length / 1e6).toFixed(2) + ' MB');
