/* Regole condivise dal server: limiti del movimento e controlli sugli input.
   I numeri vengono dal gioco (index.html): MOVECFG.run = 4,6 m/s, JUMPCFG.speed = 8,4 m/s,
   gradino 0,7 m, isola entro ~220 m dal centro. Il server non rifa' la fisica del mondo:
   controlla che ogni movimento dichiarato dal client sia fisicamente possibile. */

export const REGOLE = {
  maxGiocatori: 2,
  secchiello: { capienza: 12, ritmo: 30 },   // un client manda 20 stati al secondo: oltre i 30 di media li scarto
  anticipoMs: 750,           // il client non puo' dichiarare piu' tempo di quello vero oltre questo
  riservaMs: 750,            // tempo massimo "messo da parte" stando zitti
  corsa: 4.6,                // m/s, MOVECFG.run
  margineVel: 1.35,          // tolleranza su latenza e arrotondamenti
  margineFisso: 0.6,         // m concessi a ogni controllo (pacchetti in ritardo, spinte fra personaggi)
  saltoSu: 9.0,              // m/s in su (salto 8,4)
  gradino: 0.8,              // m di gradino/rampa concessi a ogni controllo
  cadutaMax: 60,             // m/s in giu'
  limiteXZ: 320,             // m dal centro: oltre e' fuori dalla mappa
  quotaMin: -30, quotaMax: 220,
  riconnessioneS: 30,        // secondi in cui il posto resta tenuto
  nomeMax: 16,
  // posti di partenza (x, z): la y la calcola il client sul terreno vero
  spawn: [[-42, 40], [-40, 50]],   // verificati sulla mappa (griglia a 2 m): in piano, niente collisioni entro 3,5 m, 10 m fra loro
};

export const ARMI = ['', 'ar', 'sg', 'sn', 'pick'];
export const MODI = ['weapon', 'build', 'harvest'];

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // niente 0/O, 1/I
export function nuovoCodice(occupati, rng = Math.random) {
  for (let t = 0; t < 1000; t++) {
    let c = ''; for (let i = 0; i < 4; i++) c += ALFABETO[Math.floor(rng() * ALFABETO.length)];
    if (!occupati.has(c)) return c;
  }
  throw new Error('codici esauriti');
}

export function pulisciCodice(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); }

export function pulisciNome(n) {
  const s = String(n || '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, REGOLE.nomeMax);
  return s || 'Giocatore';
}

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/* Controlla uno stato mandato dal client.
   Il movimento si misura sul tempo del MITTENTE (msg.ts, ms del suo orologio): via Internet i
   pacchetti arrivano a grappoli, e col tempo d'arrivo un passo normale sembrerebbe un salto.
   Ma l'orologio del client e' al guinzaglio di quello del server (orologio = { ts0, ora0 }):
   non puo' dichiarare piu' tempo di quello passato davvero (oltre REGOLE.anticipoMs), e il tempo
   "messo da parte" restando zitti non supera REGOLE.riservaMs, quindi non si accumula per
   teletrasportarsi. prec = ultimo stato accettato { x, y, z, ts } (y null = quota ancora ignota).
   Torna { ok: true, stato } con i valori ripuliti, oppure { ok: false, motivo }. */
export function validaStato(msg, prec, ora, orologio) {
  if (!msg || typeof msg !== 'object') return { ok: false, motivo: 'formato' };
  const { x, y, z, vx = 0, vy = 0, vz = 0, yaw = 0, pitch = 0, ts } = msg;
  for (const v of [x, y, z, vx, vy, vz, yaw, pitch, ts]) if (!num(v)) return { ok: false, motivo: 'numeri' };
  if (Math.abs(x) > REGOLE.limiteXZ || Math.abs(z) > REGOLE.limiteXZ || y < REGOLE.quotaMin || y > REGOLE.quotaMax) return { ok: false, motivo: 'fuori mappa' };
  if (orologio) {
    if (orologio.ts0 === undefined) { orologio.ts0 = ts; orologio.ora0 = ora; }
    let ritardo = (ora - orologio.ora0) - (ts - orologio.ts0);          // > 0: il client e' indietro (pacchetti in coda)
    if (ritardo > REGOLE.riservaMs) { orologio.ora0 += ritardo - REGOLE.riservaMs; ritardo = REGOLE.riservaMs; }
    if (ritardo < -REGOLE.anticipoMs) return { ok: false, motivo: 'orologio' };
  }
  if (prec && prec.ts !== undefined) {
    const dt = (ts - prec.ts) / 1000;
    if (dt <= 0) return { ok: false, motivo: 'vecchio' };               // fuori ordine o ripetuto
    const dtv = Math.min(dt, 1.0);   // dopo una pausa lunga non regalo metri in piu'
    const dh = Math.hypot(x - prec.x, z - prec.z);
    const maxH = REGOLE.corsa * REGOLE.margineVel * dtv + REGOLE.margineFisso;
    if (dh > maxH) return { ok: false, motivo: 'troppo veloce', dh, maxH };
    if (prec.y !== null) {
      const dy = y - prec.y;
      if (dy > REGOLE.saltoSu * dtv + REGOLE.gradino) return { ok: false, motivo: 'salita impossibile', dy };
      if (-dy > REGOLE.cadutaMax * dtv + REGOLE.gradino + 2) return { ok: false, motivo: 'caduta impossibile', dy };
    }
  } else if (prec) {   // primo stato dopo l'entrata: deve stare vicino al posto di partenza
    const dh = Math.hypot(x - prec.x, z - prec.z);
    if (dh > REGOLE.margineFisso + 1) return { ok: false, motivo: 'troppo veloce', dh };
  }
  return pulito(msg);
}

/* Secchiello per i messaggi: ne regge un grappolo (capienza) ma non piu' di "ritmo" al secondo. */
export function secchiello(s, ora) {
  if (!s.t) { s.t = ora; s.gettoni = REGOLE.secchiello.capienza; }
  s.gettoni = Math.min(REGOLE.secchiello.capienza, s.gettoni + (ora - s.t) / 1000 * REGOLE.secchiello.ritmo); s.t = ora;
  if (s.gettoni < 1) return false;
  s.gettoni -= 1; return true;
}

function pulito(msg) {
  const { x, y, z, vx = 0, vy = 0, vz = 0, yaw = 0, pitch = 0 } = msg;
  const lim = (v, m) => Math.max(-m, Math.min(m, v));
  const arma = ARMI.includes(msg.arma) ? msg.arma : '';
  const modo = MODI.includes(msg.modo) ? msg.modo : 'weapon';
  return {
    ok: true,
    stato: {
      x, y, z,
      vx: lim(vx, 12), vy: lim(vy, REGOLE.cadutaMax), vz: lim(vz, 12),
      yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)), pitch: lim(pitch, 1.4),
      ts: msg.ts, aTerra: !!msg.aTerra, accov: !!msg.accov, mira: !!msg.mira && !!arma, arma, modo,
    },
  };
}
