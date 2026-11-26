import { Room } from 'colyseus';
import { schema, t } from '@colyseus/schema';
import { REGOLE, nuovoCodice, pulisciNome, validaStato, secchiello, ARMI_DANNO, PICCONE, ZONE, dannoMaxPallino, puoSparare, controllaColpo, applicaDanno } from './regole.js';

/* Stato condiviso: lo scrive solo il server, i client lo leggono (Colyseus manda le differenze). */
export const Giocatore = schema({
  nome: t.string(),
  spawn: t.uint8(),
  connesso: t.boolean(),
  inGioco: t.boolean(),       // false = e' ancora in lobby: l'altro non lo vede
  x: t.float32(), y: t.float32(), z: t.float32(),
  vx: t.float32(), vy: t.float32(), vz: t.float32(),
  yaw: t.float32(), pitch: t.float32(),
  ts: t.float64(),            // ms dell'orologio di chi si muove: l'altro interpola su questo, non sull'arrivo
  aTerra: t.boolean(), accov: t.boolean(), mira: t.boolean(),
  arma: t.string(), modo: t.string(),
  hp: t.uint8(), scudo: t.uint8(), vivo: t.boolean(), uccisioni: t.uint8(),   // v117: la vita la tiene il server
  ricarica: t.boolean(),
  sw: t.uint8(),              // contatore dei colpi di piccone (animazione dell'altro)
}, 'Giocatore');

export const StatoStanza = schema({
  codice: t.string(),
  giocatori: t.map(Giocatore),
}, 'StatoStanza');

const CODICI = new Set();   // codici delle stanze aperte in questo processo

export class StanzaBattle extends Room {
  maxClients = REGOLE.maxGiocatori;
  patchRate = 50;   // 20 aggiornamenti al secondo verso i client

  onCreate() {
    const codice = nuovoCodice(CODICI); CODICI.add(codice);
    this.roomId = codice;            // il codice stanza E' l'id: l'amico entra con joinById(codice)
    this.codice = codice;
    this.state = new StatoStanza(); this.state.codice = codice;
    this.ultimo = new Map();         // sessionId -> ultimo stato accettato { x, y, z, ts }
    this.orologi = new Map();        // sessionId -> { ts0, ora0 } (guinzaglio dell'orologio del client)
    this.secchi = new Map();         // sessionId -> secchiello dei messaggi
    this.armi = new Map();           // sessionId -> secchielli del ritmo di fuoco (uno per arma) e del piccone
    this.onMessage('sparo', (client, m) => this.riceviSparo(client, m));
    this.onMessage('piccone', (client, m) => this.riceviPiccone(client, m));
    this.scarti = new Map();         // sessionId -> stati rifiutati (diagnosi)
    this.onMessage('stato', (client, msg) => this.riceviStato(client, msg));
    this.onMessage('inGioco', (client, v) => {
      const g = this.state.giocatori.get(client.sessionId); if (!g) return;
      const prima = g.inGioco; g.inGioco = v === true;
      /* una partita nuova riparte dal suo posto di partenza. Solo se arriva dalla lobby: chi si
         riconnette rimanda inGioco=true ma e' ancora in partita, e non va rimesso allo spawn. */
      if (g.inGioco && !prima) {
        g.hp = 100; g.scudo = 0; g.vivo = true; g.uccisioni = 0; this.armi.delete(client.sessionId);   // v117: partita nuova, vita piena
        const [sx, sz] = REGOLE.spawn[g.spawn % REGOLE.spawn.length];
        g.x = sx; g.z = sz; this.ultimo.set(client.sessionId, { x: sx, y: null, z: sz });
      }
    });
    this.onMessage('ping', (client, t) => client.send('pong', t));
    console.log(`[stanza ${codice}] creata`);
  }

  onJoin(client, opzioni = {}) {
    // il primo posto libero: se chi era al posto 0 e' uscito, il nuovo prende quello
    const presi = new Set([...this.state.giocatori.values()].map((g) => g.spawn));
    let spawn = 0; while (presi.has(spawn)) spawn++;
    const g = new Giocatore();
    g.nome = pulisciNome(opzioni.nome); g.spawn = spawn; g.connesso = true; g.hp = 100; g.scudo = 0; g.vivo = true; g.uccisioni = 0; g.ricarica = false;
    const [sx, sz] = REGOLE.spawn[spawn % REGOLE.spawn.length];
    g.x = sx; g.y = 0; g.z = sz; g.vx = g.vy = g.vz = 0; g.pitch = 0; g.accov = false; g.mira = false; g.inGioco = false; const [ax, az] = REGOLE.spawn[(spawn + 1) % REGOLE.spawn.length]; g.yaw = Math.atan2(ax - sx, az - sz);   /* guarda verso l'altro posto */ g.arma = 'ar'; g.modo = 'weapon'; g.aTerra = true;
    this.state.giocatori.set(client.sessionId, g);
    this.ultimo.set(client.sessionId, { x: sx, y: null, z: sz });   // il primo stato parte dal posto di partenza; la quota vera la fissa lui
    client.send('benvenuto', { codice: this.codice, spawn, x: sx, z: sz, yaw: g.yaw });
    console.log(`[stanza ${this.codice}] entra ${g.nome} (${client.sessionId}) al posto ${spawn}`);
  }

  async onDrop(client) {
    const g = this.state.giocatori.get(client.sessionId); if (!g) return;
    g.connesso = false;
    console.log(`[stanza ${this.codice}] ${g.nome} disconnesso, aspetto ${REGOLE.riconnessioneS} s`);
    try { await this.allowReconnection(client, REGOLE.riconnessioneS); }
    catch (e) { /* tempo scaduto: onLeave lo toglie */ }
  }

  onReconnect(client) {
    const g = this.state.giocatori.get(client.sessionId); if (!g) return;
    g.connesso = true;   // l'ultimo stato buono resta: chi rientra riparte da li'
    this.orologi.delete(client.sessionId);   // la pagina puo' essere stata ricaricata: orologio nuovo
    const u = this.ultimo.get(client.sessionId); if (u) delete u.ts;
    console.log(`[stanza ${this.codice}] ${g.nome} riconnesso`);
  }

  onLeave(client) {
    const g = this.state.giocatori.get(client.sessionId);
    console.log(`[stanza ${this.codice}] esce ${g ? g.nome : client.sessionId}`);
    this.state.giocatori.delete(client.sessionId); this.ultimo.delete(client.sessionId); this.scarti.delete(client.sessionId); this.orologi.delete(client.sessionId); this.secchi.delete(client.sessionId); this.armi.delete(client.sessionId);
  }

  onDispose() { CODICI.delete(this.codice); console.log(`[stanza ${this.codice}] chiusa`); }

  /* v117: uno sparo. m = { arma, o: [x,y,z] bocca dell'arma, p: [[x,y,z]...] dove finiscono i pallini (per gli
     effetti), c: [{ a: sessionId colpito, d: danno, z: zona }...] pallini andati a segno su giocatori }.
     Il server controlla ritmo, portata, mira e danno massimo, toglie vita/scudo e gira lo sparo agli altri
     (fiammata, scia, impatti, suono). Un colpo non valido viene tolto, lo sparo resta (gli effetti si vedono). */
  riceviSparo(client, m) {
    const id = client.sessionId, a = this.state.giocatori.get(id);
    if (!a || !a.inGioco || !a.vivo || !m || typeof m !== 'object') return;
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
      const v = this.state.giocatori.get(c.a);
      const no = controllaColpo(a, v, m.arma, c.d, W.range);
      if (no) { this.scarta(client, no); continue; }
      const d = Math.min(max, Math.round(c.d));
      buoni.push({ a: c.a, d, z: ZONE.includes(c.z) ? c.z : 'chest' });
      this.danno(id, c.a, d, m.arma);
    }
    this.broadcast('sparo', { da: id, arma: m.arma, o, p, c: buoni }, { except: client });
  }
  riceviPiccone(client, m) {
    const id = client.sessionId, a = this.state.giocatori.get(id);
    if (!a || !a.inGioco || !a.vivo || !m || typeof m !== 'object' || m.a === id) return;
    let sec = this.armi.get(id); if (!sec) this.armi.set(id, (sec = {}));
    const ora = Date.now(), s = sec.pick || (sec.pick = { t: ora, g: 2 });
    s.g = Math.min(2, s.g + (ora - s.t) / 1000 * PICCONE.colpiAlSecondo); s.t = ora; if (s.g < 1) { this.scarta(client, 'ritmo del piccone'); return; } s.g -= 1;
    const v = this.state.giocatori.get(m.a);
    const no = controllaColpo(a, v, 'pick', m.d, PICCONE.portata - 8);   // portata + margine 10 -> 5 m
    if (no) { this.scarta(client, no); return; }
    const d = Math.min(PICCONE.testa, Math.round(m.d));
    this.danno(id, m.a, d, 'pick');
    this.broadcast('piccone', { da: id, a: m.a, d }, { except: client });
  }
  danno(daId, aId, d, arma) {
    const v = this.state.giocatori.get(aId), a = this.state.giocatori.get(daId); if (!v || !v.vivo) return;
    const r = applicaDanno(v, d);
    v.hp = Math.round(v.hp); v.scudo = Math.round(v.scudo);
    if (r.morto) {
      v.hp = 0; v.vivo = false; if (a) a.uccisioni = Math.min(255, a.uccisioni + 1);
      this.broadcast('eliminato', { v: aId, k: daId, arma });
      console.log(`[stanza ${this.codice}] ${a ? a.nome : daId} elimina ${v.nome} (${arma})`);
    }
  }
  scarta(client, motivo) {
    const n = (this.scarti.get(client.sessionId) || 0) + 1; this.scarti.set(client.sessionId, n);
    if (n <= 20 || n % 100 === 0) console.log(`[stanza ${this.codice}] colpo scartato (${n}): ${motivo}`);
  }

  riceviStato(client, msg) {
    const g = this.state.giocatori.get(client.sessionId); if (!g) return;
    const id = client.sessionId, ora = Date.now(), prec = this.ultimo.get(id);
    let sec = this.secchi.get(id); if (!sec) this.secchi.set(id, (sec = {}));
    if (!secchiello(sec, ora)) return;   // troppi messaggi: scarto senza rispondere
    let orol = this.orologi.get(id); if (!orol) this.orologi.set(id, (orol = {}));
    const r = validaStato(msg, prec, ora, orol);
    if (!r.ok) {
      const n = (this.scarti.get(client.sessionId) || 0) + 1; this.scarti.set(client.sessionId, n);
      if (r.motivo === 'formato' || r.motivo === 'numeri' || r.motivo === 'vecchio') return;
      // rimando il giocatore all'ultima posizione buona (o al suo posto di partenza)
      const p = { x: prec ? prec.x : g.x, y: prec && prec.y !== null ? prec.y : g.y, z: prec ? prec.z : g.z };
      client.send('correggi', { x: p.x, y: p.y, z: p.z, motivo: r.motivo });
      if (n <= 20 || n % 100 === 0) console.log(`[stanza ${this.codice}] correggo ${g.nome} (${n}): ${r.motivo}`, JSON.stringify({ dh: r.dh, maxH: r.maxH, dy: r.dy }));
      if (r.motivo === 'orologio') this.orologi.delete(id);   // riparte da capo col prossimo
      if (prec) delete prec.ts;   // il prossimo stato deve ripartire dalla posizione buona
      return;
    }
    Object.assign(g, r.stato);
    this.ultimo.set(id, { x: g.x, y: g.y, z: g.z, ts: msg.ts });
  }
}

