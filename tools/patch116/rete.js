/* ============================================================
   v116: MULTIPLAYER ONLINE (server Colyseus, cartella server/)
   Il movimento resta quello del gioco (applyMovement + Physics): il client manda il suo
   stato ~20 volte al secondo, il server lo controlla (velocita', salti, confini) e lo
   gira all'altro. L'altro giocatore e' un Character normale senza cervello: gli do
   posizione, velocita', yaw, a terra / accovacciato / mira / arma interpolati, e le
   animazioni (camminata, corsa, salto, accovacciamento, idle) le ricava animate() come
   per tutti. Il client di rete si scarica solo quando si sceglie di giocare online.
   ============================================================ */
const RETE116 = {
  sdk: 'https://cdn.jsdelivr.net/npm/@colyseus/sdk@0.18.10/dist/colyseus.js',
  invioMs: 50,        // 20 stati al secondo
  ritardoMs: 120,     // l'altro si vede 120 ms nel passato: c'e' sempre un pacchetto prima e uno dopo
  pingMs: 2000,
  buffer: 40,
};
/* Indirizzo del server: ?server=... (prove) > <meta name="battlecraft-server"> (lo scrive la
   pubblicazione su Vercel dalla variabile BATTLECRAFT_SERVER_URL) > localhost solo se la pagina
   stessa e' aperta in locale. Nella versione pubblicata localhost non entra mai. */
function indirizzoServer116() {
  try { const q = new URLSearchParams(location.search).get('server'); if (q) return q; } catch (e) { }
  try { const m = document.querySelector('meta[name="battlecraft-server"]'); const v = m && typeof m.content === 'string' ? m.content.trim() : ''; if (v && v.indexOf('%') < 0) return v; } catch (e) { }
  const h = typeof location !== 'undefined' ? location.hostname : undefined;
  if (typeof location !== 'undefined' && (location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1')) return 'ws://localhost:2567';
  return null;
}
function caricaSdk116() {
  if (window.Colyseus && window.Colyseus.Client) return Promise.resolve(window.Colyseus);
  if (RETE116._p) return RETE116._p;
  return (RETE116._p = new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = RETE116.sdk; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => (window.Colyseus && window.Colyseus.Client ? ok(window.Colyseus) : ko(new Error('client di rete non valido')));
    s.onerror = () => { RETE116._p = null; ko(new Error('non riesco a scaricare il client di rete')); };
    document.head.appendChild(s);
  }));
}
function codice116(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); }
const angolo116 = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
/* Etichetta col nome sopra la testa: sprite con una texture di testo, sempre rivolta alla telecamera. */
function targhetta116(testo, spento) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.clearRect(0, 0, 256, 64); x.font = 'bold 34px "Segoe UI",Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(testo, 128, 34); x.fillStyle = spento ? '#9aa3ad' : '#ffffff'; x.fillText(testo, 128, 34);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  s.scale.set(1.7, 0.425, 1); s.renderOrder = 20; s.userData.testo116 = testo + (spento ? '#' : ''); return s;
}
function liberaTarghetta116(s) { if (!s) return; if (s.parent) s.parent.remove(s); if (s.material) { if (s.material.map) s.material.map.dispose(); s.material.dispose(); } }

class Rete116 {
  constructor(G) {
    this.G = G; this.client = null; this.room = null; this.benv = null; this.remoti = new Map();
    this.inviaT = 0; this.pingT = 0; this.rtt = 0; this.occupato = false; this.badgeT = 0; this.corrette = 0;
    const $ = (id) => document.getElementById(id);
    this.el = { box: $('online116'), crea: $('o116crea'), entra: $('o116entra'), codice: $('o116codice'), info: $('o116info'), modo: $('modoNome116'), badge: $('rete116') };
    if (this.el.crea && this.el.crea.addEventListener) this.el.crea.addEventListener('click', () => this.crea());
    if (this.el.entra && this.el.entra.addEventListener) this.el.entra.addEventListener('click', () => this.entra(this.el.codice.value));
    if (this.el.codice && this.el.codice.addEventListener) {
      this.el.codice.addEventListener('input', () => { this.el.codice.value = codice116(this.el.codice.value); });
      this.el.codice.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') this.entra(this.el.codice.value); });
    }
    try { const q = codice116(new URLSearchParams(location.search).get('stanza')); if (q && this.el.codice) { this.el.codice.value = q; this.scrivi(`Invito alla stanza <b>${q}</b>: premi Entra.`); } } catch (e) { }
    this.aggiornaUI();
  }
  attiva() { return !!this.room; }
  scrivi(html) { if (this.el.info) this.el.info.innerHTML = html; }
  linkStanza() { try { const u = new URL(location.href); u.searchParams.set('stanza', this.room.roomId); u.searchParams.delete('server'); const s = new URLSearchParams(location.search).get('server'); if (s) u.searchParams.set('server', s); return u.toString(); } catch (e) { return ''; } }
  aggiornaUI() {
    const r = this.room, n = r && r.state && r.state.giocatori ? r.state.giocatori.size : 0;
    if (this.el.modo) this.el.modo.textContent = r ? 'Online ' + n + '/2' : 'Solo';
    if (this.el.crea) this.el.crea.disabled = !!r || this.occupato;
    if (this.el.entra) this.el.entra.disabled = !!r || this.occupato;
    if (this.el.codice) this.el.codice.disabled = !!r;
    if (!r) return;
    if (!r.state || !r.state.giocatori) return;
    const altro = [...r.state.giocatori.entries()].find(([id]) => id !== r.sessionId);
    const chi = altro ? `con <b>${altro[1].nome}</b>${altro[1].connesso ? '' : ' (si sta riconnettendo…)'}` : 'in attesa dell\'amico…';
    this.scrivi(`Stanza <b class="o116cod">${r.roomId}</b> · ${chi}<br><button class="sbtn o116p" id="o116copia">Copia link</button> <button class="sbtn o116p o116esci" id="o116esci">Esci</button>`);
    const cp = document.getElementById('o116copia'), es = document.getElementById('o116esci');
    if (cp && cp.addEventListener) cp.addEventListener('click', () => this.copia());
    if (es && es.addEventListener) es.addEventListener('click', () => this.esci());
  }
  async copia() {
    const l = this.linkStanza(); let fatto = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(l); fatto = true; } } catch (e) { }
    const cp = document.getElementById('o116copia'); if (cp) cp.textContent = fatto ? 'Copiato!' : l;
  }
  async apri(come) {
    if (this.room || this.occupato) return; const url = indirizzoServer116();
    if (!url) { this.scrivi('Server multiplayer non configurato in questa versione.'); return; }
    this.occupato = true; this.aggiornaUI(); this.scrivi('Mi collego al server…');
    try {
      const C = await caricaSdk116(); this.client = this.client || new C.Client(url);
      const room = await come(this.client); this.collega(room);
    } catch (e) {
      const m = String(e && e.message || e);
      this.scrivi(/not found|no rooms|invalid|locked|full/i.test(m) ? 'Stanza inesistente o piena. Controlla il codice.' : 'Server non raggiungibile. Riprova tra poco.');
      console.warn('rete116:', m);
    }
    this.occupato = false; this.aggiornaUI();
  }
  crea() { return this.apri((c) => c.create('battle', { nome: this.G.playerName })); }
  entra(cod) {
    const codice = codice116(cod); if (codice.length !== 4) { this.scrivi('Il codice ha 4 caratteri.'); return; }
    return this.apri(async (c) => {
      // pagina ricaricata: rientro nello stesso posto se il server lo tiene ancora
      let tok = null; try { const s = JSON.parse(sessionStorage.getItem('battlecraft_rete116') || 'null'); if (s && s.codice === codice) tok = s.token; } catch (e) { }
      if (tok) { try { return await c.reconnect(tok); } catch (e) { } }
      return c.joinById(codice, { nome: this.G.playerName });
    });
  }
  collega(room) {
    this.room = room; this.benv = null;
    try { sessionStorage.setItem('battlecraft_rete116', JSON.stringify({ codice: room.roomId, token: room.reconnectionToken })); } catch (e) { }
    try { const u = new URL(location.href); u.searchParams.set('stanza', room.roomId); history.replaceState(null, '', u.toString()); } catch (e) { }
    room.onMessage('benvenuto', (m) => { this.benv = m; });
    room.onMessage('correggi', (m) => this.correggi(m));
    room.onMessage('pong', (t) => { this.rtt = performance.now() - t; });
    room.onStateChange((st) => this.istantanea(st));
    room.onDrop(() => { if (this.G.hud && this.G.online116) this.G.hud.toast('Connessione persa: mi riconnetto…', true); this.aggiornaUI(); });
    room.onReconnect(() => {
      try { sessionStorage.setItem('battlecraft_rete116', JSON.stringify({ codice: room.roomId, token: room.reconnectionToken })); } catch (e) { }
      if (this.G.hud && this.G.online116) this.G.hud.toast('Riconnesso', true);
      if (this.G.online116) room.send('inGioco', true);
      this.aggiornaUI();
    });
    room.onLeave((code) => { if (this.room === room) this.chiudi(code === 4000 || code === 1000 ? '' : 'Disconnesso dal server.'); });
  }
  /* uscita: volontaria (Esci) o per connessione persa senza ritorno */
  async esci() { const r = this.room; if (!r) return; this.chiudi(''); try { await r.leave(true); } catch (e) { } try { sessionStorage.removeItem('battlecraft_rete116'); } catch (e) { } }
  chiudi(motivo) {
    const G = this.G, eraInGioco = G.online116;
    this.room = null; this.benv = null;
    for (const r of this.remoti.values()) this.togliRemoto(r); this.remoti.clear();
    if (eraInGioco && G.state !== 'title') G.quitToMenu();
    G.online116 = false;
    this.aggiornaUI(); if (motivo) this.scrivi(motivo);
    if (this.el.badge) this.el.badge.style.display = 'none';
  }
  istantanea(st) {
    if (!this.room || !st || !st.giocatori) return; const ora = performance.now(), mio = this.room.sessionId, visti = new Set();
    st.giocatori.forEach((g, id) => {
      if (id === mio) return; visti.add(id);
      let r = this.remoti.get(id); if (!r) { r = { id, buf: [], ch: null, tag: null }; this.remoti.set(id, r); }
      r.info = g;
      /* Ogni pacchetto porta l'ora d'invio del mittente (ts, il SUO orologio). Via Internet i
         pacchetti arrivano a grappoli: datati all'arrivo, due finivano sullo stesso istante e la
         posa saltava (con 150 ms di latenza simulata il salto visto dall'altro perdeva il 60%
         dell'altezza). Qui li dispongo sul tempo d'invio, portato sul mio orologio con lo scarto
         piu' piccolo visto (= il pacchetto arrivato piu' in fretta), che sale piano se la rete rallenta. */
      if (typeof g.ts !== 'number' || !isFinite(g.ts)) return;   // non ha ancora mandato niente
      const u = r.buf[r.buf.length - 1]; if (u && g.ts <= u.ts) return;   // niente di nuovo (o fuori ordine)
      const d = ora - g.ts;
      if (r.off === undefined || Math.abs(d - r.off) > 5000) { r.off = d; r.buf.length = 0; }   // primo pacchetto, o pagina ricaricata (orologio nuovo)
      else if (d < r.off) r.off = d; else r.off += (d - r.off) * 0.02;
      const n0 = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);   // un campo mai scritto arriva undefined: NaN rompeva l'IK delle braccia
      r.buf.push({ t: g.ts + r.off, ts: g.ts, x: n0(g.x), y: n0(g.y), z: n0(g.z), vx: n0(g.vx), vy: n0(g.vy), vz: n0(g.vz), yaw: n0(g.yaw), pitch: n0(g.pitch) });
      if (r.buf.length > RETE116.buffer) r.buf.splice(0, r.buf.length - RETE116.buffer);
    });
    for (const [id, r] of this.remoti) if (!visti.has(id)) { this.togliRemoto(r); this.remoti.delete(id); if (this.G.hud && this.G.online116) this.G.hud.toast(`${r.info ? r.info.nome : 'L\'altro giocatore'} ha lasciato la stanza`, true); }
    if (!this._ui || ora - this._ui > 400) { this._ui = ora; if (this.G.state === 'title') this.aggiornaUI(); }
  }
  correggi(m) {
    const p = this.G.player; if (!p || !this.G.online116) return; this.corrette++; console.warn('rete116: il server mi ha corretto (' + m.motivo + ')');
    p.setPosition(m.x, typeof m.y === 'number' ? m.y : p.pos.y, m.z);
  }
  /* --- partita online: come startMatch, ma senza bot, bus, tempesta e bottino (fasi successive) --- */
  startMatch() {
    const G = this.G, W = G.world;
    G.resetDynamic(); for (const r of this.remoti.values()) { liberaTarghetta116(r.tag); r.tag = null; r.ch = null; }
    G.online116 = true;
    const b = this.benv || { x: W.playerSpawn.x, z: W.playerSpawn.z, yaw: 0 };
    const p = G.player = new Character(G, { isPlayer: true, name: G.playerName, colors: PALETTES[G.outfit] });
    const y = G.physics.supportHeight(b.x, b.z, terrainHeight(b.x, b.z) + 3);
    p.setPosition(b.x, y + 0.05, b.z); p.res = { wood: 120, stone: 50, metal: 30 }; p.giveWeapon('ar', 30); p.selectWeapon('ar'); p.yaw = b.yaw;
    G.chars.push(p);
    G.zone.reset(); G.cam.yaw = b.yaw; G.cam.pitch = -0.1; G.cam.dist = CAMCFG.dist;
    G.time = 0; G.state = 'playing'; G.placement = 0; G.lobbyExposure(false); G.audio.musicaMenu(false);
    G.ui.title.classList.add('hidden'); G.ui.end.classList.add('hidden'); G.ui.pause.classList.add('hidden'); G.hud.show(true); G.hud.lastMode = ''; G.hud.refreshHotbar();
    G.hud.toast('Partita online: stanza ' + this.room.roomId, true);
    this.inviaT = 0; this.room.send('inGioco', true);
    if (this.el.badge) this.el.badge.style.display = 'block';
    if (!G._skipLock102) G.requestLock();
  }
  /* tornando in lobby si resta nella stanza: si puo' rigiocare con lo stesso codice */
  esciPartita() {
    const G = this.G; if (!G.online116) return; G.online116 = false;
    for (const r of this.remoti.values()) this.togliRemoto(r);
    if (this.room) { try { this.room.send('inGioco', false); } catch (e) { } }
    if (this.el.badge) this.el.badge.style.display = 'none';
    this.aggiornaUI();
  }
  creaRemoto(r) {
    const G = this.G, g = r.info, s = r.buf[r.buf.length - 1] || g;
    const ch = new Character(G, { name: g.nome, colors: PALETTES[(g.spawn + 1) % PALETTES.length], eroe116: true });
    ch.remoto116 = r.id; ch.takeDamage = () => 0;   // danni in rete: fase successiva (per ora i colpi sull'altro non contano)
    ch.giveWeapon('ar', 0); ch.selectWeapon('ar'); ch.onGround = true; ch.wasGround = true;
    ch.setPosition(s.x, s.y, s.z); ch.yaw = s.yaw || 0;
    G.chars.push(ch); r.ch = ch; r.arma = null; r.modo = null;
    r.tag = targhetta116(g.nome, !g.connesso); G.scene.add(r.tag);
  }
  togliRemoto(r) {
    const G = this.G; liberaTarghetta116(r.tag); r.tag = null;
    if (!r.ch) return; const i = G.chars.indexOf(r.ch); if (i >= 0) G.chars.splice(i, 1);
    G.scene.remove(r.ch.model.group); r.ch = null;
  }
  /* posa dell'altro al tempo (adesso - ritardo), fra i due pacchetti che lo racchiudono */
  campiona(r, t, out) {
    const b = r.buf; if (!b.length) return false;
    if (t <= b[0].t) { Object.assign(out, b[0]); return true; }
    for (let i = b.length - 1; i > 0; i--) {
      const a = b[i - 1], c = b[i]; if (t < a.t) continue;
      if (t >= c.t) break;
      const k = (t - a.t) / Math.max(1, c.t - a.t);
      out.x = a.x + (c.x - a.x) * k; out.y = a.y + (c.y - a.y) * k; out.z = a.z + (c.z - a.z) * k;
      out.vx = a.vx + (c.vx - a.vx) * k; out.vy = a.vy + (c.vy - a.vy) * k; out.vz = a.vz + (c.vz - a.vz) * k;
      out.yaw = angolo116(a.yaw, c.yaw, k); out.pitch = a.pitch + (c.pitch - a.pitch) * k; return true;
    }
    // oltre l'ultimo pacchetto: proseguo con la sua velocita' per al massimo 100 ms, poi resto fermo li'
    const u = b[b.length - 1], e = Math.min(0.1, (t - u.t) / 1000); Object.assign(out, u);
    out.x += u.vx * e; out.z += u.vz * e; return true;
  }
  update(dt) {
    const r0 = this.room; if (!r0) return; const G = this.G;
    const inGioco = !!G.online116 && G.state !== 'title' && G.state !== 'visual93';
    // --- invio del mio stato ---
    if (inGioco && G.player && G.state !== 'loading102') {
      this.inviaT -= dt;
      if (this.inviaT <= 0) {
        this.inviaT += RETE116.invioMs / 1000; if (this.inviaT < 0) this.inviaT = RETE116.invioMs / 1000;
        const p = G.player;
        r0.send('stato', { ts: performance.now(), x: p.pos.x, y: p.pos.y, z: p.pos.z, vx: p.vel.x, vy: p.vel.y, vz: p.vel.z, yaw: p.yaw, pitch: p.aimPitch || 0,
          aTerra: !!p.onGround, accov: !!p.crouch90, mira: !!p.ads, arma: p.mode === 'weapon' ? (p.weapon || '') : '', modo: p.mode });
      }
      this.pingT -= dt; if (this.pingT <= 0) { this.pingT = RETE116.pingMs / 1000; r0.send('ping', performance.now()); }
    }
    // --- l'altro giocatore ---
    const t = performance.now() - RETE116.ritardoMs, s = this._s || (this._s = {});
    for (const r of this.remoti.values()) {
      const g = r.info, vis = inGioco && g && g.inGioco;
      if (!vis) { if (r.ch) this.togliRemoto(r); continue; }
      if (!r.ch) { if (!r.buf.length) continue; this.creaRemoto(r); }
      const ch = r.ch; if (!this.campiona(r, t, s)) continue;
      ch.pos.set(s.x, s.y, s.z); ch.vel.set(s.vx, s.vy, s.vz); ch.yaw = s.yaw; ch.aimPitch = s.pitch;
      ch.onGround = !!g.aTerra; ch.crouch90 = !!g.accov;
      ch.crouchK90 = damp(ch.crouchK90 || 0, ch.crouch90 ? 1 : 0, 14, dt); ch.height = CHAR_CFG.height - .42 * ch.crouchK90;   // come updateCrouch90, senza il controllo del soffitto (lo fa il suo client)
      const hv = Math.hypot(s.vx, s.vz); ch.moving = hv > 0.05 && ch.onGround;
      if (hv > 0.05) { ch.wx = s.vx / hv; ch.wz = s.vz / hv; ch.inputDir = true; } else ch.inputDir = false;
      if (g.arma !== r.arma || g.modo !== r.modo) {
        r.arma = g.arma; r.modo = g.modo;
        if (g.arma && WEAPONS[g.arma]) { ch.inv[0] = { w: g.arma, mag: WEAPONS[g.arma].mag }; ch.slot = 0; ch.weapon = g.arma; } else { ch.weapon = null; }
        ch.mode = g.modo === 'harvest' || g.modo === 'build' ? g.modo : 'weapon'; ch.updateHeld();
      }
      ch.ads = !!g.mira && ch.mode === 'weapon' && !!ch.weapon;
      const etich = g.nome + (g.connesso ? '' : ' (…)'), chiave = etich + (g.connesso ? '' : '#');
      if (!r.tag || r.tag.userData.testo116 !== chiave) { liberaTarghetta116(r.tag); r.tag = targhetta116(etich, !g.connesso); G.scene.add(r.tag); }
      r.tag.position.set(s.x, s.y + CHAR_CFG.height - .42 * ch.crouchK90 + 0.45, s.z);
    }
    // --- etichetta in alto: stanza, giocatori, ping ---
    this.badgeT -= dt;
    if (this.el.badge && inGioco && this.badgeT <= 0) {
      this.badgeT = 0.5; const n = r0.state && r0.state.giocatori ? r0.state.giocatori.size : 1;
      this.el.badge.textContent = `ONLINE · STANZA ${r0.roomId} · ${n}/2 · ${Math.round(this.rtt)} ms`;
    }
  }
}
