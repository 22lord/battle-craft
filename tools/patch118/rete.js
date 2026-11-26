/* ============================================================
   v116: MULTIPLAYER ONLINE (server Colyseus, cartella server/)
   Il movimento resta quello del gioco (applyMovement + Physics): il client manda il suo
   stato ~20 volte al secondo, il server lo controlla (velocita', salti, confini) e lo
   gira agli altri. Gli altri sono Character normali senza cervello: gli do posizione,
   velocita', yaw, a terra / accovacciato / mira / arma interpolati, e le animazioni le
   ricava animate() come per tutti. Il client di rete si scarica solo se si gioca online.
   v117: fino a 10 giocatori; spari e danni (la vita sta sul server, che controlla ogni colpo).
   v118: PARTITA VERA. L'host (chi ha creato la stanza) preme Gioca; tutti caricano la stessa
   partita dallo stesso seme (bus, tempesta, bot, bottino); il bus parte quando tutti sono pronti,
   all'ora del server; la stanza resta chiusa finche' non ne rimane uno. Deltaplano degli altri,
   bot (li fa ragionare il client dell'host, la loro vita sta sul server), costruzioni condivise,
   chi viene eliminato guarda la partita.
   ============================================================ */
const RETE116 = {
  sdk: 'https://cdn.jsdelivr.net/npm/@colyseus/sdk@0.18.10/dist/colyseus.js',
  invioMs: 50,        // 20 stati al secondo
  ritardoMs: 120,     // gli altri si vedono 120 ms nel passato: c'e' sempre un pacchetto prima e uno dopo
  pingMs: 2000,
  buffer: 40,
  max: 10,            // v117: giocatori per stanza (come il server)
  botMs: 100,         // v118: l'host manda i bot 10 volte al secondo
  zonaMs: 500,        // v118: danno della tempesta mandato ogni mezzo secondo
  sceltaBot: [0, 5, 10, 15, 20, 29],
};
const ARIA118 = ['', 'bus', 'fall', 'glide'], ARMI118 = ['', 'ar', 'sg', 'sn', 'pick'], MODI118 = ['weapon', 'build', 'harvest'];
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
const n0_118 = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);   // un campo mai scritto arriva undefined: NaN rompeva l'IK delle braccia
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
/* posa al tempo t fra i due pacchetti del buffer che lo racchiudono (b = [{t, x, y, z, vx, vy, vz, yaw, pitch}]) */
function campiona118(b, t, out) {
  if (!b.length) return false;
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
/* Il tempo d'invio del mittente (il SUO orologio) portato sul mio, con lo scarto piu' piccolo visto: via
   Internet i pacchetti arrivano a grappoli e, datati all'arrivo, la posa saltava (v116). */
function datario118(o, ts, ora) {
  const d = ora - ts;
  if (o.off === undefined || Math.abs(d - o.off) > 5000) { o.off = d; return true; }   // primo pacchetto, o orologio nuovo (pagina ricaricata)
  if (d < o.off) o.off = d; else o.off += (d - o.off) * 0.02;
  return false;
}

class Rete116 {
  constructor(G) {
    this.G = G; this.client = null; this.room = null; this.benv = null; this.remoti = new Map(); this.bots = [];
    this.inviaT = 0; this.pingT = 0; this.rtt = 0; this.rttMin = 1e9; this.offSrv = 0; this.occupato = false; this.badgeT = 0; this.corrette = 0;
    this.carico = false; this.zona = { io: 0, bot: new Map(), t: 0 }; this.datBot = {};
    const $ = (id) => document.getElementById(id);
    this.el = { box: $('online116'), crea: $('o116crea'), entra: $('o116entra'), codice: $('o116codice'), info: $('o116info'), modo: $('modoNome116'), badge: $('rete116'), bot: $('o116bot'), botRiga: $('o116botRiga'), gioca: $('btnPlay') };
    if (this.el.crea && this.el.crea.addEventListener) this.el.crea.addEventListener('click', () => this.crea());
    if (this.el.entra && this.el.entra.addEventListener) this.el.entra.addEventListener('click', () => this.entra(this.el.codice.value));
    if (this.el.codice && this.el.codice.addEventListener) {
      this.el.codice.addEventListener('input', () => { this.el.codice.value = codice116(this.el.codice.value); });
      this.el.codice.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') this.entra(this.el.codice.value); });
    }
    if (this.el.bot && this.el.bot.addEventListener) this.el.bot.addEventListener('change', () => { if (this.room && this.eHost()) this.room.send('impostaBot', +this.el.bot.value || 0); });
    // v118: in stanza "Gioca" non fa partire una partita da soli: l'host avvia quella di tutti
    const avviaSolo = G.avvia102 ? G.avvia102.bind(G) : null;
    G.avvia102 = () => (this.room ? this.premiGioca() : avviaSolo && avviaSolo());
    // senza un gesto (la partita parte per tutti quando l'host preme) il mouse non si aggancia: lo riaggancia un clic
    if (G.canvas && G.canvas.addEventListener) G.canvas.addEventListener('mousedown', () => { if (G.online116 && G.state === 'playing' && typeof document !== 'undefined' && document.pointerLockElement !== G.canvas && !(G.touch84 && G.touch84.active)) G.requestLock(); });
    // agganciato davvero: via l'avviso "blocco del mouse non disponibile"
    if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement === G.canvas) { G.noLock = false; const n = G.hud && G.hud.el && G.hud.el.lockNote; if (n && n.style) n.style.display = 'none'; } });
    try { const q = codice116(new URLSearchParams(location.search).get('stanza')); if (q && this.el.codice) { this.el.codice.value = q; this.scrivi(`Invito alla stanza <b>${q}</b>: premi Entra.`); } } catch (e) { }
    this.aggiornaUI();
  }
  attiva() { return !!this.room; }
  eHost() { return !!(this.room && this.room.state && this.room.state.host === this.room.sessionId); }
  fase() { return this.room && this.room.state ? this.room.state.fase : ''; }
  srvOra() { return Date.now() + this.offSrv; }   // ora del server stimata
  scrivi(html) { if (this.el.info) this.el.info.innerHTML = html; }
  linkStanza() { try { const u = new URL(location.href); u.searchParams.set('stanza', this.room.roomId); u.searchParams.delete('server'); u.searchParams.delete('prato'); const s = new URLSearchParams(location.search).get('server'); if (s) u.searchParams.set('server', s); return u.toString(); } catch (e) { return ''; } }
  nomeDi(id) { if (!id) return ''; if (id[0] === 'b' && /^b\d+$/.test(id)) { const b = this.bots[+id.slice(1)]; return b ? b.name : 'un bot'; } const g = this.room && this.room.state.giocatori.get(id); return g ? g.nome : ''; }
  aggiornaUI() {
    const r = this.room, S = r && r.state, n = S && S.giocatori ? S.giocatori.size : 0;
    if (this.el.modo) this.el.modo.textContent = r ? 'Online ' + n + '/' + RETE116.max : 'Solo';
    if (this.el.crea) this.el.crea.disabled = !!r || this.occupato;
    if (this.el.entra) this.el.entra.disabled = !!r || this.occupato;
    if (this.el.codice) this.el.codice.disabled = !!r;
    const host = this.eHost(), fase = S ? S.fase : '';
    if (this.el.botRiga) this.el.botRiga.style.display = r ? 'flex' : 'none';
    if (this.el.bot) { this.el.bot.disabled = !host || fase !== 'lobby'; if (S && String(S.nBot) !== this.el.bot.value) this.el.bot.value = String(RETE116.sceltaBot.includes(S.nBot) ? S.nBot : 0); }
    if (this.el.gioca) {
      const pronto = !r || (host && fase === 'lobby');
      this.el.gioca.textContent = !r ? 'Gioca' : fase === 'lobby' ? (host ? 'Avvia' : 'Attendi') : 'In corso';
      this.el.gioca.disabled = !pronto; this.el.gioca.style.opacity = pronto ? '' : '.55';
    }
    if (!r || !S || !S.giocatori) return;
    const nomi = [...S.giocatori.entries()].map(([id, g]) => `<b>${g.nome}</b>${id === S.host ? ' ★' : ''}${g.connesso ? '' : ' (…)'}`);
    const hostNome = this.nomeDi(S.host) || '…';
    let stato = '';
    if (fase === 'lobby') stato = host ? 'Premi <b>Avvia</b> quando ci siete tutti.' : `Aspetta che <b>${hostNome}</b> avvii la partita.`;
    else if (fase === 'carico') stato = 'Caricamento della partita…';
    else if (fase === 'partita') { let vivi = 0; for (const g of S.giocatori.values()) if (g.inGioco && g.vivo) vivi++; for (const b of S.bot.values()) if (b.vivo) vivi++; stato = `Partita in corso (${vivi} in vita): aspetta la fine.`; }
    else if (fase === 'fine') stato = 'Partita finita: si torna in lobby…';
    const firma = r.roomId + '|' + nomi.join(',') + '|' + stato; if (firma === this._firmaUI) return; this._firmaUI = firma;   // ridisegno solo se cambia (se no si perde il clic su Copia link)
    this.scrivi(`Stanza <b class="o116cod">${r.roomId}</b> · ${nomi.join(', ')}<br>${stato}<br><button class="sbtn o116p" id="o116copia">Copia link</button> <button class="sbtn o116p o116esci" id="o116esci">Esci</button>`);
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
      this.scrivi(/in corso/i.test(m) ? 'Partita in corso in quella stanza: riprova quando finisce.' : /not found|no rooms|invalid|locked|full/i.test(m) ? 'Stanza inesistente, piena o in partita. Controlla il codice.' : 'Server non raggiungibile. Riprova tra poco.');
      console.warn('rete116:', m);
    }
    this.occupato = false; this.aggiornaUI();
  }
  crea() { let prato = false; try { prato = new URLSearchParams(location.search).has('prato'); } catch (e) { } return this.apri((c) => c.create('battle', { nome: this.G.playerName, prato })); }
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
    this.room = room; this.benv = null; this.rttMin = 1e9;
    try { sessionStorage.setItem('battlecraft_rete116', JSON.stringify({ codice: room.roomId, token: room.reconnectionToken })); } catch (e) { }
    try { const u = new URL(location.href); u.searchParams.set('stanza', room.roomId); history.replaceState(null, '', u.toString()); } catch (e) { }
    room.onMessage('benvenuto', (m) => { this.benv = m; });
    room.onMessage('correggi', (m) => this.correggi(m));
    room.onMessage('pong', (m) => this.pong(m));
    room.onMessage('sparo', (m) => this.riceviSparo(m));
    room.onMessage('piccone', (m) => this.riceviPiccone(m));
    room.onMessage('eliminato', (m) => this.riceviEliminato(m));
    room.onMessage('fine', (m) => this.riceviFine(m));
    room.onMessage('errore', (m) => this.scrivi(String(m)));
    room.onMessage('bots', (m) => this.riceviBots(m));
    room.onMessage('pezzo', (m) => this.riceviPezzo(m));
    room.onMessage('pezzi', (l) => { if (Array.isArray(l)) for (const m of l) this.riceviPezzo(m); });
    room.onMessage('dannoPezzo', (m) => this.riceviDannoPezzo(m));
    room.onMessage('modifica', (m) => this.riceviModifica(m));
    room.onMessage('rotto', (m) => this.riceviRotto(m));
    room.onStateChange((st) => this.istantanea(st));
    room.onDrop(() => { if (this.G.hud && this.G.online116) this.G.hud.toast('Connessione persa: mi riconnetto…', true); this.aggiornaUI(); });
    room.onReconnect(() => {
      try { sessionStorage.setItem('battlecraft_rete116', JSON.stringify({ codice: room.roomId, token: room.reconnectionToken })); } catch (e) { }
      if (this.G.hud && this.G.online116) this.G.hud.toast('Riconnesso', true);
      this.aggiornaUI();
    });
    room.onLeave((code) => { if (this.room === room) this.chiudi(code === 4000 || code === 1000 ? '' : 'Disconnesso dal server.'); });
    for (let i = 0; i < 3; i++) setTimeout(() => { if (this.room === room) room.send('ping', performance.now()); }, 150 + i * 400);   // orologio del server subito
  }
  pong(m) {
    const t = typeof m === 'number' ? m : m && m.t; if (typeof t !== 'number') return;
    this.rtt = performance.now() - t;
    if (m && typeof m.s === 'number' && this.rtt <= this.rttMin * 1.2 + 5) { this.rttMin = Math.min(this.rttMin, this.rtt); this.offSrv = m.s + this.rtt / 2 - Date.now(); }
  }
  /* uscita: volontaria (Esci) o per connessione persa senza ritorno */
  async esci() { const r = this.room; if (!r) return; this.chiudi(''); try { await r.leave(true); } catch (e) { } try { sessionStorage.removeItem('battlecraft_rete116'); } catch (e) { } }
  chiudi(motivo) {
    const G = this.G, eraInGioco = G.online116;
    this.room = null; this.benv = null; this._firmaUI = null; this.carico = false;
    for (const r of this.remoti.values()) this.togliRemoto(r); this.remoti.clear();
    if (eraInGioco && G.state !== 'title') G.quitToMenu();
    G.online116 = false;
    this.aggiornaUI(); if (motivo) this.scrivi(motivo);
    if (this.el.badge) this.el.badge.style.display = 'none';
    this.mostraCarico(false);
  }
  istantanea(st) {
    if (!this.room || !st || !st.giocatori) return; const ora = performance.now(), mio = this.room.sessionId, visti = new Set();
    st.giocatori.forEach((g, id) => {
      if (id === mio) return; visti.add(id);
      let r = this.remoti.get(id); if (!r) { r = { id, buf: [], ch: null, tag: null }; this.remoti.set(id, r); }
      r.info = g;
      if (typeof g.ts !== 'number' || !isFinite(g.ts)) return;   // non ha ancora mandato niente
      const u = r.buf[r.buf.length - 1]; if (u && g.ts <= u.ts) return;   // niente di nuovo (o fuori ordine)
      if (datario118(r, g.ts, ora)) r.buf.length = 0;
      r.buf.push({ t: g.ts + r.off, ts: g.ts, x: n0_118(g.x), y: n0_118(g.y), z: n0_118(g.z), vx: n0_118(g.vx), vy: n0_118(g.vy), vz: n0_118(g.vz), yaw: n0_118(g.yaw), pitch: n0_118(g.pitch) });
      if (r.buf.length > RETE116.buffer) r.buf.splice(0, r.buf.length - RETE116.buffer);
    });
    for (const [id, r] of this.remoti) if (!visti.has(id)) { this.togliRemoto(r); this.remoti.delete(id); if (this.G.hud && this.G.online116) this.G.hud.toast(`${r.info ? r.info.nome : 'Un giocatore'} ha lasciato la stanza`, true); }
    this._uiSporca = true;   // la lobby si ridisegna in update (al massimo 4 volte al secondo, e solo se e' cambiata)
  }
  correggi(m) {
    const p = this.G.player; if (!p || !this.G.online116 || p.air88) return; this.corrette++; console.warn('rete116: il server mi ha corretto (' + m.motivo + ')');
    p.setPosition(m.x, typeof m.y === 'number' ? m.y : p.pos.y, m.z);
  }

  /* ---------- v118: CICLO DELLA PARTITA ---------- */
  premiGioca() {
    const G = this.G; if (!this.room) return;
    if (G.state !== 'title') G.quitToMenu();   // "Rigioca" dalla schermata di fine: si torna in lobby
    if (!this.eHost()) { this.scrivi(`Aspetta che <b>${this.nomeDi(this.room.state.host)}</b> avvii la partita.`); return; }
    if (this.fase() !== 'lobby') { this.aggiornaUI(); return; }
    this.room.send('avvia');
  }
  mostraCarico(on, k, testo) {
    const el = typeof document !== 'undefined' ? document.getElementById('matchLoad102') : null; if (!el || !el.classList) return;
    if (on) { el.classList.remove('fade'); el.classList.add('on'); const f = el.querySelector('.fill'), s = el.querySelector('.stato'); if (f && f.style) f.style.width = Math.round((k || 0) * 100) + '%'; if (s) s.textContent = testo || ''; }
    else if (el.classList.contains && el.classList.contains('on')) { el.classList.add('fade'); setTimeout(() => el.classList.remove('on', 'fade'), 380); }
  }
  /* L'host ha premuto Avvia: carico la partita dal seme, dico "pronto", aspetto l'ora del server e parto. */
  async carica() {
    if (this.carico) return; this.carico = true; const G = this.G, room = this.room;
    const frame = () => new Promise((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => r()) : setTimeout(r, 16)));
    try {
      this.mostraCarico(true, 0.1, 'Preparo l\'isola…'); await frame(); await frame();
      this.mostraCarico(true, 0.35, 'Faccio salire tutti sul bus…'); await frame();
      this.startMatch();
      this.mostraCarico(true, 0.7, 'Preparo la grafica…'); await frame();
      try { const r = G.renderer; if (r && r.compileAsync) await Promise.race([r.compileAsync(G.scene, G.camera), new Promise((ok) => setTimeout(ok, 4000))]); else if (r && r.compile) r.compile(G.scene, G.camera); } catch (e) { }
      for (let i = 0; i < 3; i++) await frame();
      if (this.room !== room) return;
      room.send('pronto', this.eHost() ? { scudi: this.bots.map((b) => b.shield | 0) } : {});
      // aspetto gli altri e l'ora di partenza decisa dal server
      const t0 = performance.now();
      while (this.room === room && this.fase() === 'carico' && performance.now() - t0 < 60000) {
        let n = 0, p = 0; room.state.giocatori.forEach((g) => { if (g.connesso) { n++; if (g.pronto) p++; } });
        this.mostraCarico(true, 0.85 + 0.1 * (p / Math.max(1, n)), `Aspetto gli altri… (${p}/${n} pronti)`); await frame();
      }
      if (this.room !== room || this.fase() !== 'partita') { if (G.state !== 'title') G.quitToMenu(); return; }
      while (this.room === room && this.srvOra() < room.state.via - 30) { this.mostraCarico(true, 1, 'Si parte!'); await frame(); }
      G.lastT = performance.now(); G.state = 'playing'; this.allinea(true);
      await frame(); await frame();
      this.mostraCarico(false);
      if (!(G.touch84 && G.touch84.active)) G.requestLock();
    } catch (e) { console.error(e); this.mostraCarico(false); if (G.state !== 'title') G.quitToMenu(); }
    finally { this.carico = false; }
  }
  /* La partita dal seme: stesso bus, stessi bot (nomi, colori, armi, scudi), stesso bottino, stessa tempesta.
     I bot li fa ragionare solo l'host; sugli altri client si muovono coi pacchetti dell'host. */
  startMatch() {
    const G = this.G, W = G.world, S = this.room.state, host = this.eHost(), prato = S.modo === 'prato';
    const mr = Math.random; Math.random = mulberry32(S.seme || 1);
    try {
      G.resetDynamic(); for (const r of this.remoti.values()) { liberaTarghetta116(r.tag); r.tag = null; r.ch = null; r.buf.length = 0; }
      G.online116 = true; this.bots = []; this.datBot = {}; this._mt = {}; this.zona = { io: 0, bot: new Map(), t: 0 }; this.zonaFatta = 0;
      const p = G.player = new Character(G, { isPlayer: true, name: G.playerName, colors: PALETTES[G.outfit] });
      const b0 = this.benv || { x: W.playerSpawn.x, z: W.playerSpawn.z, yaw: 0 };
      const ps = prato ? REGOLE118spawn(b0) : { x: W.playerSpawn.x, z: W.playerSpawn.z, yaw: 0 };
      p.setPosition(ps.x, G.physics.supportHeight(ps.x, ps.z, terrainHeight(ps.x, ps.z) + 3) + 0.05, ps.z); p.yaw = ps.yaw;
      p.res = { wood: 120, stone: 50, metal: 30 }; p.giveWeapon('ar', 30); p.selectWeapon('ar');
      /* la mia vita la decide il server; in locale mi ferisce solo la tempesta, che mando al server */
      p.takeDamage = (d, att, info) => {
        if (att === p) { if (d > 0 && G.online116) this.zona.io += d; return 0; }                              // tempesta
        if (att && att.bot118 !== undefined && this.autore(att)) return this.dannoAltro(this.room.sessionId, p, d, att, info);   // un mio bot (sono l'host) colpisce me
        return 0;                                                                                            // gli altri: li conta il server
      };
      this.avvolgiCure(p, null);
      this.sw = 0; this._swPrec = 0;
      G.chars.push(p);
      const spawns = [...W.botSpawns].sort(() => Math.random() - 0.5);
      for (let i = 0; i < S.nBot; i++) {
        const pi = (G.outfit + 1 + i) % PALETTES.length;
        const b = new Character(G, { name: BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? ' ' + (1 + Math.floor(i / BOT_NAMES.length)) : ''), colors: PALETTES[pi === G.outfit ? (pi + 1) % PALETTES.length : pi] });
        const s = spawns[i % spawns.length]; const x = s[0] + rnd(-2, 2), z = s[1] + rnd(-2, 2); b.setPosition(x, terrainHeight(x, z) + 0.3, z);
        b.res = { wood: 90, stone: 40, metal: 10 }; b.shield = Math.random() < 0.5 ? 50 : 0;
        const kit = i % 3; b.giveWeapon('ar', 90); if (kit === 1) b.giveWeapon('sg', 20); if (kit === 2) b.giveWeapon('sn', 10);
        b.selectWeapon(kit === 2 ? 'sn' : kit === 1 ? 'sg' : 'ar'); b.yaw = Math.random() * 6.28;
        b.bot118 = i; b.takeDamage = (d, att, info) => this.dannoAltro('b' + i, b, d, att, info);
        if (!host) { b.remoto116 = 'b' + i; b._buf = []; }
        G.chars.push(b); G.bots.push(b); this.bots.push(b);
      }
      /* il cervello dei bot (solo sull'host) consuma numeri casuali: dopo i bot ogni cosa che deve venire uguale
         per tutti riparte da un seme suo (prima il bus veniva diverso: 124 m fra i due schermi, misurato) */
      if (host) for (const b of this.bots) { new BotBrain(G, b); this.avvolgiCure(b, b.bot118); }
      Math.random = mulberry32(((S.seme || 1) ^ 0x11b0771) >>> 0);
      for (const [type, x, z, yo] of W.itemSpawns) G.items.spawn(type, x, z, yo);
      if (G.forzieri114) { spargiMedikit114(G); G.forzieri114.piazza(); }
      // la tempesta sceglie i cerchi con un suo caso, uguale per tutti (anche il primo, in reset)
      const rz = mulberry32(((S.seme || 1) ^ 0x5bd1e995) >>> 0), zn = G.zone;
      if (!zn._pn118) zn._pn118 = zn.pickNext.bind(zn);
      zn.pickNext = () => { const m = Math.random; Math.random = rz; try { zn._pn118(); } finally { Math.random = m; } };
      G.zone.reset(); this.aggancia();
      G.cam.yaw = ps.yaw || Math.atan2(-W.playerSpawn.x, -W.playerSpawn.z); G.cam.pitch = -0.1; G.cam.dist = CAMCFG.dist;
      G.time = 0; G.placement = 0; G.lobbyExposure(false); G.audio.musicaMenu(false);
      G.ui.title.classList.add('hidden'); G.ui.end.classList.add('hidden'); G.ui.pause.classList.add('hidden'); G.hud.show(true); G.hud.lastMode = ''; G.hud.refreshHotbar();
      Math.random = mulberry32(((S.seme || 1) ^ 0x2b05b05) >>> 0);   // il bus: percorso e salti dei bot
      if (!prato) G.drop88.start(); else G.drop88.elapsed = 999;
    } finally { Math.random = mr; }
    G.state = 'loading102';   // si parte all'ora del server (carica)
    G.hud.toast(prato ? 'Partita online (prato di prova)' : 'Resta nell\'area sicura. L\'ultimo sopravvissuto vince!', true);
    this.inviaT = 0; this.botT = 0;
    if (this.el.badge) this.el.badge.style.display = 'block';
  }
  /* bus e tempesta all'ora del server: se il mio orologio di gioco si allontana (fotogrammi lenti), lo riporto */
  allinea(forza) {
    const G = this.G, S = this.room && this.room.state; if (!S || S.modo === 'prato' || !S.via || !G.drop88) return;
    const el = (this.srvOra() - S.via) / 1000; if (el < 0) return;
    if (G.drop88.elapsed < G.drop88.duration + 5 && (forza || Math.abs(G.drop88.elapsed - el) > 0.3)) G.drop88.elapsed = el;
    this.zonaVoluta = Math.max(0, el - G.drop88.duration);
  }
  zonaOn() { return !!(this.room && this.room.state && this.room.state.modo !== 'prato'); }
  /* tornando in lobby a partita in corso si esce dalla partita (si resta nella stanza) */
  esciPartita() {
    const G = this.G; if (!G.online116) return; G.online116 = false;
    for (const r of this.remoti.values()) this.togliRemoto(r);
    if (this.room && this.fase() === 'partita') { try { this.room.send('arrendo'); } catch (e) { } }
    if (this.el.badge) this.el.badge.style.display = 'none';
    this.bots = []; this.aggiornaUI();
  }
  riceviFine(m) {
    const G = this.G; if (!G.online116 || !m) return;
    const nome = m.nome || this.nomeDi(m.id) || 'nessuno', io = m.id === this.room.sessionId;
    if (G.player && !io && G.player.alive) G.player.alive = false;   // non dovrebbe succedere (resta uno solo)
    if (G.state === 'playing' || G.state === 'paused') {
      G.endMatch();
      if (G.ui.endText) G.ui.endText.textContent = io ? `Sei l'ultimo sopravvissuto! Eliminazioni: ${G.player.kills}.` : `Ha vinto ${nome}. Eliminazioni: ${G.player ? G.player.kills : 0}. Fra poco si torna in lobby.`;
    }
    this._uiSporca = true;
  }

  /* ---------- SPARI, DANNI, CURE ---------- */
  /* Una volta per partita: avvolgo Combat.tryFire e FX.tracer (raccolgo dove finiscono i pallini e chi
     colpiscono), onDeath (online la partita la chiude il server), costruzioni e tempesta. */
  aggancia() {
    const G = this.G, R = this;
    if (G.combat && !G.combat._rete117) {
      const tf = G.combat.tryFire.bind(G.combat);
      G.combat.tryFire = function (ch, o, d) {
        const mio = G.online116 && R.room && R.autore(ch);
        const prima = R._sparo; if (mio) R._sparo = { punti: [], colpi: [], arma: ch.weapon, ch };
        let ok = false; try { ok = tf(ch, o, d); } finally { if (mio) { const sp = R._sparo; R._sparo = prima; if (ok) R.chiudiSparo(ch, sp); } }
        return ok;
      };
      G.combat._rete117 = true;
    }
    if (G.fx && !G.fx._rete117) {
      const tr = G.fx.tracer.bind(G.fx);
      G.fx.tracer = function (a, b) { if (R._sparo && R._sparo.punti.length < 12) R._sparo.punti.push([+b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2)]); return tr(a, b); };
      G.fx._rete117 = true;
    }
    if (!G._morte118) {
      const od = G.onDeath.bind(G);
      G.onDeath = function (v, k) {
        const r = od(v, k);
        if (G.online116) { G.endTimer = -1; if (v === G.player) G.hud.toast('Sei stato eliminato: ora guardi la partita', true); }   // la fine la decide il server
        return r;
      };
      G._morte118 = true;
    }
    const B = G.build;
    if (B && !B._rete118) {
      const pl = B.place.bind(B), dp = B.damagePiece.bind(B), ap = B.applyPattern.bind(B);
      B.place = function (def, ch, mat, cols, grounded) {
        const p = pl(def, ch, mat, cols, grounded);
        if (p && G.online116 && R.room && !R._daRete && R.autore(ch)) R.room.send('pezzo', { k: p.key, t: p.type, ix: p.ix, iy: p.iy, iz: p.iz, rot: p.rot, mat, c: [+p.center.x.toFixed(3), +p.center.y.toFixed(3), +p.center.z.toFixed(3)], b: ch.bot118 });
        return p;
      };
      B.damagePiece = function (p, dmg, att) {
        const mio = G.online116 && R.room && !R._daRete && att && R.autore(att) && B.pieces.has(p);
        dp(p, dmg, att);
        if (mio) { R.room.send('dannoPezzo', { k: p.key, d: dmg }); if (!B.pieces.has(p)) R.room.send('rotto', { k: p.key }); }
      };
      B.applyPattern = function (p, pattern) {
        const r = ap(p, pattern);
        if (r && r.ok && G.online116 && R.room && !R._daRete) R.room.send('modifica', { k: p.key, pattern });
        return r;
      };
      B._rete118 = true;
    }
    const Z = G.zone;
    if (Z && !Z._rete118) {
      const zu = Z.update.bind(Z);
      Z.update = function (dt) {   // online: la tempesta segue l'ora del server
        if (G.online116 && R.zonaVoluta !== undefined) { const d = Math.max(0, Math.min(2, R.zonaVoluta - R.zonaFatta)); R.zonaFatta += d; if (d > 0) zu(d); return; }
        zu(dt);
      };
      Z._rete118 = true;
    }
  }
  /* chi "fa" un'azione in rete da questo client: io, e i bot se sono l'host */
  autore(ch) { return !!ch && (ch === this.G.player || (ch.bot118 !== undefined && !ch.remoto116 && this.eHost())); }
  /* Un colpo su un altro (giocatore o bot): divisione scudo/vita per hitmarker e numeri, come takeDamage, ma la
     vita non la tocco: la cambia il server. Va al server solo se il colpo e' "mio" (mio o di un mio bot). */
  dannoAltro(id, ch, d, att, info) {
    const G = this.G; if (!G.online116 || !ch.alive) return 0;
    if (att === ch && d > 0) { if (this.eHost() && ch.bot118 !== undefined) this.zona.bot.set(ch.bot118, (this.zona.bot.get(ch.bot118) || 0) + d); return 0; }   // tempesta su un mio bot
    if (!this.autore(att)) return 0;
    const sh = ch.shield || 0, sd = Math.min(sh, d), left = d - sd;
    if (info && info instanceof ColpoInfo107) { info.shieldDmg = sd; info.hpDmg = Math.min(left, ch.hp); info.shieldBroken = sh > 0 && sd >= sh; info.killed = ch.hp - left <= 0; }
    if (this._sparo && this._sparo.ch === att) this._sparo.colpi.push({ a: id, d: Math.round(d), z: info && info.zone || 'chest' });
    else if (att === G.player && this.room) this.room.send('piccone', { a: id, d: Math.round(d) });   // fuori da uno sparo: e' il piccone
    if (att === G.player) ch.lastAttacker = att;
    return d;
  }
  chiudiSparo(ch, sp) {
    if (!this.room || !sp || !sp.arma) return;
    const m = ch.muzzleWorld(this._mz || (this._mz = new THREE.Vector3()));
    const msg = { arma: sp.arma, o: [+m.x.toFixed(2), +m.y.toFixed(2), +m.z.toFixed(2)], p: sp.punti, c: sp.colpi };
    if (ch === this.G.player) this.room.send('sparo', msg); else { msg.b = ch.bot118; this.room.send('sparoBot', msg); }
  }
  /* cure e scudo presi dal mio giocatore o dai bot dell'host: il valore nuovo va al server */
  avvolgiCure(ch, botIdx) {
    const R = this, h = ch.heal.bind(ch), s = ch.addShield.bind(ch);
    const manda = () => { if (R.room && R.G.online116 && ch.alive) R.room.send('cura', botIdx === null ? { hp: ch.hp, scudo: ch.shield } : { b: botIdx, hp: ch.hp, scudo: ch.shield }); };
    ch.heal = (n) => { h(n); manda(); };
    ch.addShield = (n, cap) => { s(n, cap); manda(); };
  }
  personaggio(id) {
    if (!this.room || !id) return null;
    if (id === this.room.sessionId) return this.G.player;
    if (id[0] === 'b' && /^b\d+$/.test(id)) return this.bots[+id.slice(1)] || null;
    return (this.remoti.get(id) || {}).ch || null;
  }
  /* Lo sparo di un altro (giocatore o bot non mio): fiammata, scie, impatti, sangue, suono 3D, rinculo. */
  riceviSparo(m) {
    const G = this.G, ch = m && this.personaggio(m.da); if (!G.online116 || !ch || ch === G.player) return;
    const w = WEAPONS[m.arma]; if (!w) return;
    const o = this._o || (this._o = new THREE.Vector3()), q = this._q || (this._q = new THREE.Vector3()), su = this._su || (this._su = new THREE.Vector3(0, 1, 0));
    if (Array.isArray(m.o)) o.fromArray(m.o); else ch.muzzleWorld(o);
    const colpiti = (m.c || []).length;
    for (const p of m.p || []) { q.fromArray(p); G.fx.tracer(o, q); if (!colpiti) G.fx.impact(q, su, COLORE_MAT107.terra); }
    for (const c of m.c || []) { const v = this.personaggio(c.a); if (v) { G.fx.blood(q.copy(v.pos).setY(v.pos.y + (c.z === 'head' ? 1.6 : 1.15)), v); if (v === G.player) v.lastAttacker = ch; } }
    ch.kick = w.kick; ch.recoil += w.recoil; ch.fireCd = w.rate;
    G.fx.muzzleFlash(ch); G.audio.shotFrom92(G, ch);
  }
  riceviPiccone(m) {
    const G = this.G; if (!G.online116 || !m) return;
    const v = this.personaggio(m.a);
    if (v) { G.fx.blood(this._q2 || (this._q2 = new THREE.Vector3()).copy(v.pos).setY(v.pos.y + 1.2), v); if (v === G.player || v.pos.distanceTo(G.player.pos) < 20) G.audio.pieceHit(); }
  }
  /* Eliminazione decisa dal server: la stessa onDeath del gioco (feed, armi a terra). */
  riceviEliminato(m) {
    const G = this.G; if (!G.online116 || !m || !this.room) return;
    const v = this.personaggio(m.v), k = this.personaggio(m.k);
    if (v && v.alive) { v.hp = 0; v.shield = 0; G.onDeath(v, k); }
    else if (!v && G.hud) {   // non lo sto ancora disegnando (appena entrato, lontano): il feed lo scrivo lo stesso
      const nv = this.nomeDi(m.v) || '?', nk = m.arma === 'zona' ? 'la zona' : m.arma === 'esce' ? '' : this.nomeDi(m.k);
      G.hud.killfeed(nk ? `<b>${nk}</b> ha eliminato <b>${nv}</b>` : `<b>${nv}</b> ha lasciato la partita`);
    }
  }
  /* La mia vita (e quella dei bot) dallo stato del server: se scende, vignetta rossa. */
  vitaMia(r0) {
    const G = this.G, p = G.player, S = r0.state, g = S && S.giocatori ? S.giocatori.get(r0.sessionId) : null;
    if (p && g && g.inGioco && typeof g.hp === 'number' && p.alive) {
      if (g.hp < p.hp - 0.01 || (g.scudo || 0) < (p.shield || 0) - 0.01) p.lastDamageT = G.time;
      p.hp = g.hp; p.shield = g.scudo || 0;
      if (g.vivo === false && this.tardi('io')) G.onDeath(p, null);   // se l'annuncio e' andato perso
    }
    if (S && S.bot) for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i], s = S.bot.get('b' + i); if (!b || !s) continue;
      if (b.alive) { if (s.hp < b.hp - 0.01) b.lastDamageT = G.time; b.hp = s.hp; b.shield = s.scudo; if (!s.vivo && this.tardi('b' + i)) G.onDeath(b, null); }
    }
  }

  /* Lo stato dice "morto" ma l'annuncio 'eliminato' (con chi ha sparato, per il feed) non e' ancora arrivato:
     l'ordine fra messaggi e patch dello stato non e' fisso. Aspetto 1,5 s prima di farlo cadere senza nome. */
  tardi(k) { const t = performance.now(), m = this._mt || (this._mt = {}); if (!m[k]) { m[k] = t; return false; } return t - m[k] > 1500; }

  /* ---------- BOT ---------- */
  /* l'host manda i suoi bot 10 volte al secondo: [i, x, y, z, vx, vy, vz, yaw, pitch, bit, arma, modo, aria] */
  mandaBots() {
    const l = [];
    for (const b of this.bots) {
      if (!b || b.remoto116) continue;
      const bit = (b.onGround ? 1 : 0) | (b.crouch90 ? 2 : 0) | (b.ads ? 4 : 0) | (b.reloading ? 8 : 0) | (b.alive ? 16 : 0);
      const r2 = (v) => Math.round(v * 100) / 100;
      l.push([b.bot118, r2(b.pos.x), r2(b.pos.y), r2(b.pos.z), r2(b.vel.x), r2(b.vel.y), r2(b.vel.z), r2(b.yaw), r2(b.aimPitch || 0), bit,
        Math.max(0, ARMI118.indexOf(b.mode === 'weapon' ? (b.weapon || '') : b.mode === 'harvest' ? 'pick' : '')), Math.max(0, MODI118.indexOf(b.mode)), Math.max(0, ARIA118.indexOf(b.air88 ? b.air88.phase : ''))]);
    }
    if (l.length) this.room.send('bots', { ts: performance.now(), l });
  }
  riceviBots(m) {
    if (!this.G.online116 || !m || !Array.isArray(m.l) || typeof m.ts !== 'number') return;
    const ora = performance.now(); if (datario118(this.datBot, m.ts, ora)) for (const b of this.bots) if (b && b._buf) b._buf.length = 0;
    for (const r of m.l) {
      const b = this.bots[r[0]]; if (!b || !b.remoto116 || !b._buf) continue;
      const u = b._buf[b._buf.length - 1]; if (u && m.ts <= u.ts) continue;
      b._buf.push({ t: m.ts + this.datBot.off, ts: m.ts, x: r[1], y: r[2], z: r[3], vx: r[4], vy: r[5], vz: r[6], yaw: r[7], pitch: r[8] });
      if (b._buf.length > RETE116.buffer) b._buf.splice(0, b._buf.length - RETE116.buffer);
      b._info = { bit: r[9], arma: ARMI118[r[10]] || '', modo: MODI118[r[11]] || 'weapon', aria: ARIA118[r[12]] || '' };
    }
  }
  /* sono diventato host a partita in corso: i bot li faccio ragionare io */
  prendiBots() {
    const G = this.G;
    for (const b of this.bots) {
      if (!b || !b.remoto116) continue;
      delete b.remoto116; b._buf = null;
      if (b.air88 && b.air88.phase !== 'bus') { if (b.air88.glider) { G.scene.remove(b.air88.glider); disposeGlider108(b.air88.glider); } b.air88 = null; }
      if (b.alive) { new BotBrain(G, b); this.avvolgiCure(b, b.bot118); }
    }
    G.hud.toast('Ora i bot li guida il tuo computer', true);
  }
  /* un personaggio mosso dalla rete (giocatore o bot) in volo: deltaplano visibile, sul bus nascosto */
  aria(ch, fase, dt) {
    const G = this.G;
    if (fase === 'bus' || fase === 'fall' || fase === 'glide') {
      if (!ch.air88) { ch.air88 = { phase: fase, time: 0, blend: 0, glider: makeGlider88(), target: ch.pos.clone(), rete118: true }; G.scene.add(ch.air88.glider); ch.air88.glider.visible = false; }
      else if (ch.air88.glider && !ch.air88.glider.parent) G.scene.add(ch.air88.glider);
      ch.air88.phase = fase; ch.air88.time += dt; ch.air88.turn = 0;
    } else if (ch.air88) {
      if (ch.air88.glider) { G.scene.remove(ch.air88.glider); disposeGlider108(ch.air88.glider); }
      ch.air88 = null; ch.wasGround = false;
    }
  }
  /* posa di un personaggio mosso dalla rete: s = campione interpolato, info = { a terra, accovacciato, mira, arma, modo, ricarica } */
  posa(ch, s, inf, dt) {
    ch.pos.set(s.x, s.y, s.z); ch.vel.set(s.vx, s.vy, s.vz); ch.yaw = s.yaw; ch.aimPitch = s.pitch;
    ch.onGround = !!inf.aTerra; ch.crouch90 = !!inf.accov;
    ch.crouchK90 = damp(ch.crouchK90 || 0, ch.crouch90 ? 1 : 0, 14, dt); ch.height = CHAR_CFG.height - .42 * ch.crouchK90;   // come updateCrouch90, senza il controllo del soffitto (lo fa il suo client)
    const hv = Math.hypot(s.vx, s.vz); ch.moving = hv > 0.05 && ch.onGround;
    if (hv > 0.05) { ch.wx = s.vx / hv; ch.wz = s.vz / hv; ch.inputDir = true; } else ch.inputDir = false;
    const arma = inf.arma === 'pick' ? '' : inf.arma;
    if (arma !== ch._arma118 || inf.modo !== ch._modo118) {
      ch._arma118 = arma; ch._modo118 = inf.modo;
      if (arma && WEAPONS[arma]) { ch.inv[0] = { w: arma, mag: WEAPONS[arma].mag }; ch.slot = 0; ch.weapon = arma; } else ch.weapon = null;
      ch.mode = inf.modo === 'harvest' || inf.modo === 'build' ? inf.modo : 'weapon'; ch.updateHeld();
    }
    ch.ads = !!inf.mira && ch.mode === 'weapon' && !!ch.weapon;
    if (inf.ricarica && !ch._ric118 && ch.weapon && WEAPONS[ch.weapon]) { ch.reloading = true; ch.reloadT = ch.reloadTotal = WEAPONS[ch.weapon].reload; }
    if (!inf.ricarica && ch._ric118) ch.reloading = false;
    ch._ric118 = !!inf.ricarica;
  }

  /* ---------- COSTRUZIONI ---------- */
  riceviPezzo(m) {
    const G = this.G, B = G.build; if (!G.online116 || !m || !B || B.grid.has(m.k)) return;
    const def = { type: m.t, ix: m.ix | 0, iy: m.iy | 0, iz: m.iz | 0, rot: m.rot | 0, key: m.k, center: new THREE.Vector3(m.c[0], m.c[1], m.c[2]), pattern: 0 };
    const chi = this.personaggio(m.da) || G.player; const res = chi.res; chi.res = { wood: 1e6, stone: 1e6, metal: 1e6 };
    this._daRete = true;
    try { const p = B.place(def, chi, m.mat, buildColliders(def), B.groundedFor(def, def.center)); if (p && m.pattern) B.applyPattern(p, m.pattern); }
    catch (e) { console.warn('rete116: pezzo non piazzato', e && e.message); }
    finally { this._daRete = false; chi.res = res; }
  }
  riceviDannoPezzo(m) { const B = this.G.build, p = m && B && B.grid.get(m.k); if (!this.G.online116 || !p) return; this._daRete = true; try { B.damagePiece(p, m.d, null); } finally { this._daRete = false; } }
  riceviModifica(m) { const B = this.G.build, p = m && B && B.grid.get(m.k); if (!this.G.online116 || !p) return; this._daRete = true; try { B.applyPattern(p, m.pattern | 0); } finally { this._daRete = false; } }
  riceviRotto(m) { const B = this.G.build, p = m && B && B.grid.get(m.k); if (!this.G.online116 || !p) return; this._daRete = true; try { B.destroyPiece(p, 'damage'); } finally { this._daRete = false; } }

  /* ---------- GIOCATORI REMOTI ---------- */
  creaRemoto(r) {
    const G = this.G, g = r.info, s = r.buf[r.buf.length - 1] || g;
    const ch = new Character(G, { name: g.nome, colors: PALETTES[(g.spawn + 1) % PALETTES.length], eroe116: true });
    ch.remoto116 = r.id; ch.takeDamage = (d, att, info) => this.dannoAltro(r.id, ch, d, att, info);   // il colpo va al server
    ch.giveWeapon('ar', 0); ch.selectWeapon('ar'); ch.onGround = true; ch.wasGround = true;
    ch.setPosition(s.x, s.y, s.z); ch.yaw = s.yaw || 0;
    G.chars.push(ch); r.ch = ch; r.sw = g.sw; r.vivoPrec = g.vivo;
    ch.hp = typeof g.hp === 'number' ? g.hp : 100; ch.shield = g.scudo || 0;
    if (g.vivo === false) { ch.alive = false; ch.deathT = 3; }   // entrato che era gia' eliminato: resta a terra
    r.tag = targhetta116(g.nome, !g.connesso); G.scene.add(r.tag);
  }
  togliRemoto(r) {
    const G = this.G; liberaTarghetta116(r.tag); r.tag = null;
    if (!r.ch) return;
    if (r.ch.air88 && r.ch.air88.glider) { G.scene.remove(r.ch.air88.glider); disposeGlider108(r.ch.air88.glider); r.ch.air88 = null; }
    const i = G.chars.indexOf(r.ch); if (i >= 0) G.chars.splice(i, 1);
    G.scene.remove(r.ch.model.group); r.ch = null;
  }

  update(dt) {
    const r0 = this.room; if (!r0) return; const G = this.G, S = r0.state;
    if (G.state === 'title' && this._uiSporca && (this._uiT = (this._uiT || 0) - dt) <= 0) { this._uiT = 0.25; this._uiSporca = false; this.aggiornaUI(); }
    // l'host ha premuto Avvia: chi e' in lobby carica la partita
    if (S && S.fase === 'carico' && G.state === 'title' && !this.carico) this.carica();
    // ricaricata la pagina a partita in corso: io risulto ancora "in gioco" ma non lo sono piu'
    if (S && S.fase === 'partita' && G.state === 'title' && !this.carico) { const g = S.giocatori.get(r0.sessionId); if (g && g.inGioco && g.vivo && !this._arreso) { this._arreso = true; r0.send('arrendo'); } }
    if (S && S.fase === 'lobby') this._arreso = false;
    // sono diventato host a partita in corso: prendo i bot
    if (G.online116 && this.eHost() && this.bots.some((b) => b && b.remoto116)) this.prendiBots();
    const inGioco = !!G.online116 && G.state !== 'title' && G.state !== 'visual93';
    if (inGioco && G.state !== 'loading102') this.allinea(false);
    this.pingT -= dt; if (this.pingT <= 0) { this.pingT = RETE116.pingMs / 1000; r0.send('ping', performance.now()); }
    // --- invio del mio stato, dei miei bot, della tempesta ---
    if (inGioco && G.player && G.state !== 'loading102') {
      const p0 = G.player; if ((p0.swingT || 0) > this._swPrec + 0.01) this.sw = (this.sw + 1) & 255; this._swPrec = p0.swingT || 0;   // un colpo di piccone nuovo
      this.vitaMia(r0);
      this.inviaT -= dt;
      if (this.inviaT <= 0 && p0.alive) {
        this.inviaT += RETE116.invioMs / 1000; if (this.inviaT < 0) this.inviaT = RETE116.invioMs / 1000;
        const p = p0;
        r0.send('stato', { ts: performance.now(), x: p.pos.x, y: p.pos.y, z: p.pos.z, vx: p.vel.x, vy: p.vel.y, vz: p.vel.z, yaw: p.yaw, pitch: p.aimPitch || 0,
          aTerra: !!p.onGround, accov: !!p.crouch90, mira: !!p.ads, arma: p.mode === 'weapon' ? (p.weapon || '') : '', modo: p.mode,
          ricarica: !!p.reloading, sw: this.sw, aria: p.air88 ? p.air88.phase : '' });
      }
      if (this.eHost()) { this.botT -= dt; if (this.botT <= 0) { this.botT = RETE116.botMs / 1000; this.mandaBots(); } }
      this.zona.t -= dt;
      if (this.zona.t <= 0) {
        this.zona.t = RETE116.zonaMs / 1000;
        if (this.zona.io > 0) { r0.send('zona', { d: Math.round(this.zona.io * 100) / 100 }); this.zona.io = 0; }
        for (const [i, d] of this.zona.bot) if (d > 0) r0.send('zona', { b: i, d: Math.round(d * 100) / 100 });
        this.zona.bot.clear();
      }
    }
    // --- gli altri giocatori ---
    const t = performance.now() - RETE116.ritardoMs, s = this._s || (this._s = {});
    for (const r of this.remoti.values()) {
      const g = r.info, vis = inGioco && G.state !== 'loading102' && g && g.inGioco;
      if (!vis) { if (r.ch) this.togliRemoto(r); continue; }
      if (!r.ch) { if (!r.buf.length) continue; this.creaRemoto(r); }
      const ch = r.ch; if (!campiona118(r.buf, t, s)) continue;
      this.posa(ch, s, g, dt);
      this.aria(ch, ch.alive ? (g.aria || '') : '', dt);
      if (typeof g.hp === 'number') { ch.hp = g.hp; ch.shield = g.scudo || 0; }
      if (g.vivo === false && ch.alive && this.tardi('p' + r.id)) G.onDeath(ch, null);   // solo se l'annuncio (col nome di chi ha sparato) non arriva
      r.vivoPrec = g.vivo;
      if (g.sw !== r.sw) { r.sw = g.sw; ch.swingT = ANIMCFG.swingPeriod; ch.pickSide81 = 1; if (G.player && ch.pos.distanceTo(G.player.pos) < 15) G.audio.swing(); }
      const etich = g.nome + (g.connesso ? '' : ' (…)'), chiave = etich + (g.connesso ? '' : '#');
      if (!r.tag || r.tag.userData.testo116 !== chiave) { liberaTarghetta116(r.tag); r.tag = targhetta116(etich, !g.connesso); G.scene.add(r.tag); }
      r.tag.visible = !(ch.air88 && ch.air88.phase === 'bus');
      r.tag.position.set(s.x, s.y + CHAR_CFG.height - .42 * ch.crouchK90 + 0.45, s.z);
    }
    // --- i bot dell'host, sugli altri client ---
    if (inGioco && G.state !== 'loading102') for (const b of this.bots) {
      if (!b || !b.remoto116 || !b._buf || !b._buf.length || !b._info) continue;
      if (!campiona118(b._buf, t, s)) continue;
      const bit = b._info.bit;
      this.posa(b, s, { aTerra: bit & 1, accov: bit & 2, mira: bit & 4, ricarica: bit & 8, arma: b._info.arma, modo: b._info.modo }, dt);
      this.aria(b, b.alive ? b._info.aria : '', dt);
    }
    // --- etichetta in alto: stanza, giocatori in vita, ping ---
    this.badgeT -= dt;
    if (this.el.badge && inGioco && this.badgeT <= 0) {
      this.badgeT = 0.5; let vivi = 0;
      if (S) { for (const g of S.giocatori.values()) if (g.inGioco && g.vivo) vivi++; for (const b of S.bot.values()) if (b.vivo) vivi++; }
      this.el.badge.textContent = `ONLINE · STANZA ${r0.roomId} · ${vivi} IN VITA · ${Math.round(this.rtt)} ms`;
    }
  }
}
/* posto di partenza nel prato (modalita' di prova): quello che il server ha dato all'entrata */
function REGOLE118spawn(b) { return { x: b.x, z: b.z, yaw: b.yaw || 0 }; }
