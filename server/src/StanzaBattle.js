import { Room } from 'colyseus';
import { schema, t } from '@colyseus/schema';
import { REGOLE, nuovoCodice, pulisciNome, validaStato, secchiello, ARMI_DANNO, PICCONE, ZONE, dannoMaxPallino, puoSparare, controllaColpo, applicaDanno } from './regole.js';

/* Stato condiviso: lo scrive solo il server, i client lo leggono (Colyseus manda le differenze). */
export const Giocatore = schema({
  nome: t.string(),
  spawn: t.uint8(),
  connesso: t.boolean(),
  inGioco: t.boolean(),       // e' dentro la partita in corso (false = in lobby, o spettatore)
  pronto: t.boolean(),        // v118: ha finito di caricare la partita
  x: t.float32(), y: t.float32(), z: t.float32(),
  vx: t.float32(), vy: t.float32(), vz: t.float32(),
  yaw: t.float32(), pitch: t.float32(),
  ts: t.float64(),            // ms dell'orologio di chi si muove: l'altro interpola su questo, non sull'arrivo
  aTerra: t.boolean(), accov: t.boolean(), mira: t.boolean(),
  arma: t.string(), modo: t.string(),
  aria: t.string(),           // v118: '' a terra, 'bus', 'fall' (caduta), 'glide' (deltaplano)
  hp: t.uint8(), scudo: t.uint8(), vivo: t.boolean(), uccisioni: t.uint8(),   // v117: la vita la tiene il server
  ricarica: t.boolean(),
  sw: t.uint8(),              // contatore dei colpi di piccone (animazione dell'altro)
}, 'Giocatore');

/* v118: i bot. Li fa ragionare il client dell'host (il server non ha la mappa); qui c'e' la loro vita. */
export const Bot = schema({ hp: t.uint8(), scudo: t.uint8(), vivo: t.boolean() }, 'Bot');

export const StatoStanza = schema({
  codice: t.string(),
  modo: t.string(),           // 'bus' (partita vera) | 'prato' (prove: si parte nel prato, niente bus/tempesta)
  fase: t.string(),           // 'lobby' | 'carico' | 'partita' | 'fine'
  host: t.string(),           // sessionId di chi avvia la partita e fa ragionare i bot
  seme: t.uint32(),           // stesso seme per tutti: stesso bus, stessa tempesta, stessi bot, stesso bottino
  nBot: t.uint8(),
  via: t.float64(),           // ms del SERVER in cui parte il bus
  vincitore: t.string(),      // id dell'ultimo rimasto (giocatore o 'b3'), '' se nessuno
  giocatori: t.map(Giocatore),
  bot: t.map(Bot),
}, 'StatoStanza');

const CODICI = new Set();   // codici delle stanze aperte in questo processo
const ARIA = ['', 'bus', 'fall', 'glide'];

export class StanzaBattle extends Room {
  maxClients = REGOLE.maxGiocatori;
  patchRate = 50;   // 20 aggiornamenti al secondo verso i client

  onCreate(opzioni = {}) {
    const codice = nuovoCodice(CODICI); CODICI.add(codice);
    this.roomId = codice;            // il codice stanza E' l'id: gli amici entrano con joinById(codice)
    this.codice = codice;
    this.state = new StatoStanza(); this.state.codice = codice;
    this.state.modo = opzioni.prato ? 'prato' : 'bus'; this.state.fase = 'lobby'; this.state.host = ''; this.state.nBot = 0; this.state.vincitore = '';
    this.ultimo = new Map();         // sessionId -> ultimo stato accettato { x, y, z, ts }
    this.orologi = new Map();        // sessionId -> guinzaglio dell'orologio del client
    this.secchi = new Map();         // sessionId -> secchiello dei messaggi di movimento
    this.armi = new Map();           // id (giocatore o bot) -> secchielli del ritmo di fuoco, del piccone, della zona, delle cure
    this.scarti = new Map();         // sessionId -> messaggi rifiutati (diagnosi)
    this.botPos = [];                // ultima posizione nota dei bot (dai messaggi dell'host): per controllare i colpi
    this.pezzi = new Map();          // costruzioni della partita: chiave -> messaggio (per chi si riconnette)
    this.onMessage('stato', (c, m) => this.riceviStato(c, m));
    this.onMessage('sparo', (c, m) => this.riceviSparo(c, m, null));
    this.onMessage('sparoBot', (c, m) => { if (this.eHost(c) && m) this.riceviSparo(c, m, m.b | 0); });
    this.onMessage('piccone', (c, m) => this.riceviPiccone(c, m));
    this.onMessage('impostaBot', (c, n) => { if (this.eHost(c) && this.state.fase === 'lobby') this.state.nBot = Math.max(0, Math.min(REGOLE.maxBot, n | 0)); });
    this.onMessage('avvia', (c) => this.avvia(c));
    this.onMessage('pronto', (c, m) => this.pronto(c, m));
    this.onMessage('arrendo', (c) => this.arrendo(c));
    this.onMessage('bots', (c, m) => this.riceviBots(c, m));
    this.onMessage('zona', (c, m) => this.riceviZona(c, m));
    this.onMessage('cura', (c, m) => this.riceviCura(c, m));
    this.onMessage('pezzo', (c, m) => this.riceviPezzo(c, m));
    this.onMessage('dannoPezzo', (c, m) => this.giraPezzo(c, 'dannoPezzo', m));
    this.onMessage('modifica', (c, m) => { if (this.giraPezzo(c, 'modifica', m) && this.pezzi.has(m.k)) this.pezzi.get(m.k).pattern = m.pattern | 0; });
    this.onMessage('rotto', (c, m) => { if (this.giraPezzo(c, 'rotto', m)) this.pezzi.delete(m.k); });
    this.onMessage('ping', (c, t) => c.send('pong', { t, s: Date.now() }));   // s: orologio del server (per far partire il bus insieme)
    console.log(`[stanza ${codice}] creata (${this.state.modo})`);
  }

  onJoin(client, opzioni = {}) {
    // v118: a partita iniziata la stanza e' chiusa finche' non resta uno solo
    if (this.state.fase !== 'lobby') throw new Error('partita in corso: aspetta la fine');
    const presi = new Set([...this.state.giocatori.values()].map((g) => g.spawn));
    let spawn = 0; while (presi.has(spawn)) spawn++;
    const g = new Giocatore();
    g.nome = pulisciNome(opzioni.nome); g.spawn = spawn; g.connesso = true; this.azzera(g);
    const [sx, sz] = REGOLE.spawn[spawn % REGOLE.spawn.length];
    g.x = sx; g.y = 0; g.z = sz; const [ax, az] = REGOLE.spawn[(spawn + 1) % REGOLE.spawn.length]; g.yaw = Math.atan2(ax - sx, az - sz);
    this.state.giocatori.set(client.sessionId, g);
    if (!this.state.host) this.state.host = client.sessionId;
    client.send('benvenuto', { codice: this.codice, spawn, x: sx, z: sz, yaw: g.yaw });
    console.log(`[stanza ${this.codice}] entra ${g.nome} (${client.sessionId}) al posto ${spawn}`);
  }
  azzera(g) {
    g.inGioco = false; g.pronto = false; g.hp = 100; g.scudo = 0; g.vivo = true; g.uccisioni = 0; g.ricarica = false; g.sw = 0; g.aria = '';
    g.vx = g.vy = g.vz = 0; g.pitch = 0; g.accov = false; g.mira = false; g.arma = 'ar'; g.modo = 'weapon'; g.aTerra = true;
  }

  async onDrop(client) {
    const g = this.state.giocatori.get(client.sessionId); if (!g) return;
    g.connesso = false;
    console.log(`[stanza ${this.codice}] ${g.nome} disconnesso, aspetto ${REGOLE.riconnessioneS} s`);
    if (this.state.host === client.sessionId) this.nuovoHost();
    if (this.state.fase === 'carico') this.forseVia();
    try { await this.allowReconnection(client, REGOLE.riconnessioneS); }
    catch (e) { /* tempo scaduto: onLeave lo toglie */ }
  }

  onReconnect(client) {
    const g = this.state.giocatori.get(client.sessionId); if (!g) return;
    g.connesso = true;   // l'ultimo stato buono resta: chi rientra riparte da li'
    this.orologi.delete(client.sessionId);   // la pagina puo' essere stata ricaricata: orologio nuovo
    const u = this.ultimo.get(client.sessionId); if (u) delete u.ts;
    if (!this.state.host || !this.state.giocatori.get(this.state.host)?.connesso) this.state.host = client.sessionId;
    if (this.state.fase === 'partita' && this.pezzi.size) client.send('pezzi', [...this.pezzi.values()]);
    console.log(`[stanza ${this.codice}] ${g.nome} riconnesso`);
  }

  onLeave(client) {
    const id = client.sessionId, g = this.state.giocatori.get(id);
    console.log(`[stanza ${this.codice}] esce ${g ? g.nome : id}`);
    this.state.giocatori.delete(id); this.ultimo.delete(id); this.scarti.delete(id); this.orologi.delete(id); this.secchi.delete(id); this.armi.delete(id);
    if (this.state.host === id) this.nuovoHost();
    if (this.state.fase === 'carico') this.forseVia();
    this.controllaFine();
  }

  onDispose() { CODICI.delete(this.codice); console.log(`[stanza ${this.codice}] chiusa`); }

  /* ---------- ciclo della partita ---------- */
  eHost(client) { return client.sessionId === this.state.host; }
  nuovoHost() {
    const altro = [...this.state.giocatori.entries()].find(([, g]) => g.connesso);
    this.state.host = altro ? altro[0] : '';
    if (altro) console.log(`[stanza ${this.codice}] nuovo host: ${altro[1].nome}`);
  }
  avvia(client) {
    const S = this.state; if (!this.eHost(client) || S.fase !== 'lobby') return;
    const umani = [...S.giocatori.values()].filter((g) => g.connesso).length;
    if (umani + S.nBot < 2) { client.send('errore', 'Serve almeno un altro giocatore o un bot.'); return; }
    S.fase = 'carico'; S.seme = (Math.random() * 4294967295) >>> 0; S.vincitore = ''; S.via = 0;
    for (const [id, g] of S.giocatori) { this.azzera(g); this.ultimo.delete(id); this.orologi.delete(id); this.armi.delete(id); }
    S.bot.clear(); this.botPos = []; this.pezzi.clear();
    for (let i = 0; i < S.nBot; i++) { const b = new Bot(); b.hp = 100; b.scudo = 0; b.vivo = true; S.bot.set('b' + i, b); }
    this.lock();
    if (this.timerCarico) this.timerCarico.clear();
    this.timerCarico = this.clock.setTimeout(() => this.via(), REGOLE.caricoMaxS * 1000);   // chi non ha finito in tempo guarda
    console.log(`[stanza ${this.codice}] avvio: ${umani} giocatori, ${S.nBot} bot, seme ${S.seme}`);
  }
  pronto(client, m) {
    const S = this.state, g = S.giocatori.get(client.sessionId); if (!g || S.fase !== 'carico') return;
    g.pronto = true; g.inGioco = true;
    if (S.modo === 'prato') { const [sx, sz] = REGOLE.spawn[g.spawn % REGOLE.spawn.length]; g.x = sx; g.z = sz; this.ultimo.set(client.sessionId, { x: sx, y: null, z: sz }); }
    else this.ultimo.delete(client.sessionId);   // col bus il primo stato e' sul bus, ovunque sia
    if (this.eHost(client) && m && Array.isArray(m.scudi)) m.scudi.forEach((s, i) => { const b = S.bot.get('b' + i); if (b) b.scudo = Math.max(0, Math.min(100, s | 0)); });
    this.forseVia();
  }
  forseVia() {
    const tutti = [...this.state.giocatori.values()].filter((g) => g.connesso);
    if (tutti.length && tutti.every((g) => g.pronto)) this.via();
  }
  via() {
    const S = this.state; if (S.fase !== 'carico') return;
    if (this.timerCarico) { this.timerCarico.clear(); this.timerCarico = null; }
    S.fase = 'partita'; S.via = Date.now() + REGOLE.viaTraMs;
    for (const g of S.giocatori.values()) if (!g.pronto) { g.inGioco = false; g.vivo = false; }   // non ha caricato in tempo: guarda
    console.log(`[stanza ${this.codice}] via!`);
    this.controllaFine();
  }
  arrendo(client) {   // e' tornato in lobby (o ha ricaricato la pagina) a partita in corso: e' fuori
    const g = this.state.giocatori.get(client.sessionId); if (!g) return;
    const eraVivo = g.inGioco && g.vivo; g.inGioco = false;
    if (eraVivo && this.state.fase === 'partita') { g.vivo = false; g.hp = 0; this.broadcast('eliminato', { v: client.sessionId, k: '', arma: 'esce' }); }
    this.controllaFine();
  }
  controllaFine() {
    const S = this.state; if (S.fase !== 'partita') return;
    const vivi = [];
    for (const [id, g] of S.giocatori) if (g.inGioco && g.vivo) vivi.push(id);
    const umani = vivi.length;
    for (const [id, b] of S.bot) if (b.vivo) vivi.push(id);
    if (vivi.length > 1 && umani > 0) return;
    S.fase = 'fine'; S.vincitore = vivi.length === 1 ? vivi[0] : '';
    const g = S.giocatori.get(S.vincitore);
    this.broadcast('fine', { id: S.vincitore, nome: g ? g.nome : '' });
    console.log(`[stanza ${this.codice}] fine: vince ${g ? g.nome : S.vincitore || 'nessuno'}`);
    this.clock.setTimeout(() => this.tornaLobby(), REGOLE.fineS * 1000);
  }
  tornaLobby() {
    const S = this.state; if (S.fase !== 'fine') return;
    S.fase = 'lobby'; S.via = 0;
    for (const g of S.giocatori.values()) { g.inGioco = false; g.pronto = false; g.aria = ''; }
    S.bot.clear(); this.botPos = []; this.pezzi.clear();
    this.unlock();
    console.log(`[stanza ${this.codice}] di nuovo in lobby`);
  }

  /* ---------- colpi ---------- */
  /* Chi colpisce e chi e' colpito come li sa il server: un giocatore (sessionId) o un bot ('b3'). */
  bersaglio(id) {
    if (typeof id !== 'string') return null;
    if (id[0] === 'b' && this.state.bot.has(id)) { const b = this.state.bot.get(id), p = this.botPos[+id.slice(1)] || null; return { bot: b, inGioco: true, vivo: b.vivo, x: p ? p[0] : 0, y: p ? p[1] : 0, z: p ? p[2] : 0, yaw: p ? p[3] : 0, noto: !!p }; }
    const g = this.state.giocatori.get(id); return g ? g : null;
  }
  /* v117: uno sparo. m = { arma, o: [x,y,z] bocca dell'arma, p: [[x,y,z]...] dove finiscono i pallini (per gli
     effetti), c: [{ a: colpito, d: danno, z: zona }...] }. botIdx: lo sparo e' di un bot (lo manda l'host).
     Il server controlla ritmo, portata, mira e danno massimo, toglie vita/scudo e gira lo sparo agli altri. */
  riceviSparo(client, m, botIdx) {
    if (this.state.fase !== 'partita' || !m || typeof m !== 'object') return;
    const id = botIdx === null ? client.sessionId : 'b' + botIdx, a = this.bersaglio(id);
    if (!a || !a.inGioco || !a.vivo) return;
    const W = ARMI_DANNO[m.arma]; if (!W) return;
    let sec = this.armi.get(id); if (!sec) this.armi.set(id, (sec = {}));
    if (!puoSparare(sec, m.arma, Date.now())) { this.scarta(client, 'ritmo di fuoco'); return; }
    const vec = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
    const o = vec(m.o) ? m.o : [a.x, a.y + 1.4, a.z];
    const p = Array.isArray(m.p) ? m.p.filter(vec).slice(0, W.pellets) : [];
    const colpi = Array.isArray(m.c) ? m.c.slice(0, W.pellets) : [];
    const max = dannoMaxPallino(m.arma), buoni = [];
    for (const c of colpi) {
      if (!c || c.a === id) continue;
      const v = this.bersaglio(c.a);
      const no = (a.noto === false || (v && v.noto === false)) ? (v && v.vivo ? null : 'bersaglio non in gioco') : controllaColpo(a, v, m.arma, c.d, W.range);
      if (no) { this.scarta(client, no); continue; }
      const d = Math.min(max, Math.round(c.d));
      buoni.push({ a: c.a, d, z: ZONE.includes(c.z) ? c.z : 'chest' });
      this.danno(id, c.a, d, m.arma);
    }
    this.broadcast('sparo', { da: id, arma: m.arma, o, p, c: buoni }, { except: client });
  }
  riceviPiccone(client, m) {
    const id = client.sessionId, a = this.state.giocatori.get(id);
    if (this.state.fase !== 'partita' || !a || !a.inGioco || !a.vivo || !m || typeof m !== 'object' || m.a === id) return;
    let sec = this.armi.get(id); if (!sec) this.armi.set(id, (sec = {}));
    const ora = Date.now(), s = sec.pick || (sec.pick = { t: ora, g: 2 });
    s.g = Math.min(2, s.g + (ora - s.t) / 1000 * PICCONE.colpiAlSecondo); s.t = ora; if (s.g < 1) { this.scarta(client, 'ritmo del piccone'); return; } s.g -= 1;
    const v = this.bersaglio(m.a);
    const no = v && v.noto === false ? null : controllaColpo(a, v, 'pick', m.d, PICCONE.portata - 8);   // portata + margine 10 -> 5 m
    if (no) { this.scarta(client, no); return; }
    const d = Math.min(PICCONE.testa, Math.round(m.d));
    this.danno(id, m.a, d, 'pick');
    this.broadcast('piccone', { da: id, a: m.a, d }, { except: client });
  }
  danno(daId, aId, d, arma) {
    const v = this.bersaglio(aId); if (!v || !v.vivo) return;
    const obj = v.bot || v, a = this.state.giocatori.get(daId);
    const r = applicaDanno(obj, d);
    obj.hp = Math.round(obj.hp); obj.scudo = Math.round(obj.scudo);
    if (r.morto) {
      obj.hp = 0; obj.vivo = false; if (a && daId !== aId) a.uccisioni = Math.min(255, a.uccisioni + 1);
      this.broadcast('eliminato', { v: aId, k: daId, arma });
      this.controllaFine();
    }
  }
  /* la tempesta: ogni client manda il danno del suo giocatore, l'host quello dei bot. Al massimo la dps piu'
     alta della tempesta (12) per il tempo passato, piu' un margine. */
  riceviZona(client, m) {
    if (this.state.fase !== 'partita' || !m || typeof m.d !== 'number' || !(m.d > 0)) return;
    const id = m.b !== undefined ? (this.eHost(client) ? 'b' + (m.b | 0) : null) : client.sessionId; if (!id) return;
    let sec = this.armi.get(id); if (!sec) this.armi.set(id, (sec = {}));
    const ora = Date.now(), s = sec.zona || (sec.zona = { t: ora, g: 3 });
    s.g = Math.min(REGOLE.zonaDps * 2, s.g + (ora - s.t) / 1000 * REGOLE.zonaDps * 1.2); s.t = ora;
    const d = Math.min(m.d, s.g); if (d <= 0) return; s.g -= d;
    this.danno(id, id, d, 'zona');
  }
  /* cure e scudo raccolti (medikit, pozioni): il client li prende come sempre e dice il valore nuovo. */
  riceviCura(client, m) {
    if (this.state.fase !== 'partita' || !m) return;
    const id = m.b !== undefined ? (this.eHost(client) ? 'b' + (m.b | 0) : null) : client.sessionId; if (!id) return;
    const v = this.bersaglio(id); if (!v || !v.vivo) return; const obj = v.bot || v;
    let sec = this.armi.get(id); if (!sec) this.armi.set(id, (sec = {}));
    const ora = Date.now(), s = sec.cura || (sec.cura = { t: ora, g: 3 });
    s.g = Math.min(3, s.g + (ora - s.t) / 1000 * 2); s.t = ora; if (s.g < 1) return; s.g -= 1;
    if (typeof m.hp === 'number') obj.hp = Math.max(obj.hp, Math.min(100, Math.round(m.hp)));
    if (typeof m.scudo === 'number') obj.scudo = Math.max(obj.scudo, Math.min(100, Math.round(m.scudo)));
  }

  /* ---------- bot (dall'host) ---------- */
  /* m = { ts, l: [[i, x, y, z, vx, vy, vz, yaw, pitch, bit, arma, modo, aria], ...] }: gira a tutti gli altri. */
  riceviBots(client, m) {
    if (!this.eHost(client) || this.state.fase !== 'partita' || !m || !Array.isArray(m.l)) return;
    for (const r of m.l) if (Array.isArray(r) && typeof r[0] === 'number') this.botPos[r[0]] = [r[1], r[2], r[3], r[7]];
    this.broadcast('bots', m, { except: client });
  }

  /* ---------- costruzioni ---------- */
  /* m = { k: chiave della cella, t: tipo, ix, iy, iz, rot, mat, c: [x,y,z], b?: indice del bot che costruisce } */
  riceviPezzo(client, m) {
    if (this.state.fase !== 'partita' || !m || typeof m.k !== 'string' || m.k.length > 40) return;
    if (!['wall', 'floor', 'ramp', 'roof'].includes(m.t) || !['wood', 'stone', 'metal'].includes(m.mat)) return;
    if (!Array.isArray(m.c) || m.c.length !== 3 || !m.c.every((n) => typeof n === 'number' && Number.isFinite(n))) return;
    const id = m.b !== undefined ? (this.eHost(client) ? 'b' + (m.b | 0) : null) : client.sessionId; if (!id) return;
    const a = this.bersaglio(id); if (!a || !a.vivo) return;
    if (a.noto !== false && Math.hypot(m.c[0] - a.x, m.c[2] - a.z) > REGOLE.portataCostruzione) { this.scarta(client, 'costruzione troppo lontana'); return; }
    if (!this.secchioPezzi(client)) return;
    if (this.pezzi.has(m.k)) return;
    const msg = { k: m.k, t: m.t, ix: m.ix | 0, iy: m.iy | 0, iz: m.iz | 0, rot: m.rot | 0, mat: m.mat, c: m.c, pattern: 0, da: id };
    this.pezzi.set(m.k, msg);
    this.broadcast('pezzo', msg, { except: client });
  }
  giraPezzo(client, tipo, m) {
    if (this.state.fase !== 'partita' || !m || typeof m.k !== 'string') return false;
    const g = this.state.giocatori.get(client.sessionId); if (!g || !g.inGioco) return false;
    if (!this.secchioPezzi(client)) return false;
    const out = { k: m.k }; if (tipo === 'dannoPezzo') out.d = Math.max(0, Math.min(500, +m.d || 0)); if (tipo === 'modifica') out.pattern = m.pattern | 0;
    this.broadcast(tipo, out, { except: client });
    return true;
  }
  secchioPezzi(client) {
    const id = client.sessionId; let sec = this.armi.get(id); if (!sec) this.armi.set(id, (sec = {}));
    const ora = Date.now(), s = sec.pezzi || (sec.pezzi = { t: ora, g: 40 });
    s.g = Math.min(40, s.g + (ora - s.t) / 1000 * 30); s.t = ora; if (s.g < 1) { this.scarta(client, 'troppe costruzioni'); return false; } s.g -= 1; return true;
  }

  scarta(client, motivo) {
    const n = (this.scarti.get(client.sessionId) || 0) + 1; this.scarti.set(client.sessionId, n);
    if (n <= 20 || n % 100 === 0) console.log(`[stanza ${this.codice}] scartato (${n}): ${motivo}`);
  }

  riceviStato(client, msg) {
    const g = this.state.giocatori.get(client.sessionId); if (!g || !g.inGioco || this.state.fase !== 'partita') return;
    const id = client.sessionId, ora = Date.now(), prec = this.ultimo.get(id);
    let sec = this.secchi.get(id); if (!sec) this.secchi.set(id, (sec = {}));
    if (!secchiello(sec, ora)) return;   // troppi messaggi: scarto senza rispondere
    let orol = this.orologi.get(id); if (!orol) this.orologi.set(id, (orol = {}));
    const r = validaStato(msg, prec, ora, orol);
    if (!r.ok) {
      const n = (this.scarti.get(id) || 0) + 1; this.scarti.set(id, n);
      if (r.motivo === 'formato' || r.motivo === 'numeri' || r.motivo === 'vecchio') return;
      // rimando il giocatore all'ultima posizione buona
      const p = { x: prec ? prec.x : g.x, y: prec && prec.y !== null ? prec.y : g.y, z: prec ? prec.z : g.z };
      client.send('correggi', { x: p.x, y: p.y, z: p.z, motivo: r.motivo });
      if (n <= 20 || n % 100 === 0) console.log(`[stanza ${this.codice}] correggo ${g.nome} (${n}): ${r.motivo}`, JSON.stringify({ dh: r.dh, maxH: r.maxH, dy: r.dy }));
      if (r.motivo === 'orologio') this.orologi.delete(id);
      if (prec) delete prec.ts;
      return;
    }
    Object.assign(g, r.stato);
    this.ultimo.set(id, { x: g.x, y: g.y, z: g.z, ts: msg.ts, aria: g.aria });
  }
}
