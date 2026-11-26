import { Room } from 'colyseus';
import { schema, t } from '@colyseus/schema';
import { REGOLE, nuovoCodice, pulisciNome, validaStato, secchiello } from './regole.js';

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
  hp: t.uint8(),
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
    this.scarti = new Map();         // sessionId -> stati rifiutati (diagnosi)
    this.onMessage('stato', (client, msg) => this.riceviStato(client, msg));
    this.onMessage('inGioco', (client, v) => {
      const g = this.state.giocatori.get(client.sessionId); if (!g) return;
      const prima = g.inGioco; g.inGioco = v === true;
      /* una partita nuova riparte dal suo posto di partenza. Solo se arriva dalla lobby: chi si
         riconnette rimanda inGioco=true ma e' ancora in partita, e non va rimesso allo spawn. */
      if (g.inGioco && !prima) {
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
    g.nome = pulisciNome(opzioni.nome); g.spawn = spawn; g.connesso = true; g.hp = 100;
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
    this.state.giocatori.delete(client.sessionId); this.ultimo.delete(client.sessionId); this.scarti.delete(client.sessionId); this.orologi.delete(client.sessionId); this.secchi.delete(client.sessionId);
  }

  onDispose() { CODICI.delete(this.codice); console.log(`[stanza ${this.codice}] chiusa`); }

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

