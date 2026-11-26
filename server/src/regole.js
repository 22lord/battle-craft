/* Regole condivise dal server: limiti del movimento e controlli sugli input.
   I numeri vengono dal gioco (index.html): MOVECFG.run = 4,6 m/s, JUMPCFG.speed = 8,4 m/s,
   gradino 0,7 m, isola entro ~220 m dal centro. Il server non rifa' la fisica del mondo:
   controlla che ogni movimento dichiarato dal client sia fisicamente possibile. */

export const REGOLE = {
  maxGiocatori: 10,
  secchiello: { capienza: 12, ritmo: 30 },   // un client manda 20 stati al secondo: oltre i 30 di media li scarto
  anticipoMs: 500,           // il client non puo' dichiarare piu' tempo di quello vero oltre questo
  creditoMs: 1000, creditoRicarica: 100,   // v117: intoppi una tantum dell'orologio (vedi validaStato)
  riservaMs: 500,            // tempo massimo "messo da parte" stando zitti
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
  // v117: 10 posti (griglia a 2 m sulla mappa vera: in piano, niente collisioni entro 3,5 m, almeno 7 m fra loro, prato a ovest della citta')
  spawn: [[-42, 42], [-40, 50], [-44, 56], [-28, 52], [-32, 62], [-24, 58], [-42, 68], [-54, 24], [-20, 64], [-6, 52]],
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
    if (orologio.ts0 === undefined) { orologio.ts0 = ts; orologio.ora0 = ora; orologio.credito = REGOLE.creditoMs; orologio.tc = ora; }
    let ritardo = (ora - orologio.ora0) - (ts - orologio.ts0);          // > 0: il client e' indietro (pacchetti in coda)
    if (ritardo > REGOLE.riservaMs) { orologio.ora0 += ritardo - REGOLE.riservaMs; ritardo = REGOLE.riservaMs; }
    /* v117: se il PRIMO pacchetto e' arrivato in ritardo (all'avvio il browser e' fermo a compilare la grafica),
       tutti i seguenti sembrano "in anticipo". Un credito che si ricarica piano (creditoRicarica ms al secondo,
       fino a creditoMs) sposta l'ancora una tantum; un orologio truccato in continuo lo esaurisce subito. */
    orologio.credito = Math.min(REGOLE.creditoMs, orologio.credito + (ora - orologio.tc) / 1000 * REGOLE.creditoRicarica); orologio.tc = ora;
    if (ritardo < -REGOLE.anticipoMs) {
      const extra = -ritardo - REGOLE.anticipoMs;
      if (extra > orologio.credito) return { ok: false, motivo: 'orologio', ritardo };
      orologio.credito -= extra; orologio.ora0 -= extra;
    }
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
      ts: msg.ts, ricarica: !!msg.ricarica, sw: (msg.sw | 0) & 255, aTerra: !!msg.aTerra, accov: !!msg.accov, mira: !!msg.mira && !!arma, arma, modo,
    },
  };
}

/* ---------- v117: COLPI ----------
   Copia dei numeri delle armi del gioco (index.html, WEAPONS e PICCONE106). Il client che spara fa il
   suo colpo (hitscan) come sempre e manda al server chi ha preso, dove e quanto; il server controlla
   che sia possibile e toglie vita e scudo. Il danno per pallino non puo' superare: danno base x zona
   piu' forte x rarita' leggendaria (1,16). Se cambiano le armi nel gioco, vanno cambiate anche qui. */
export const ARMI_DANNO = {
  ar: { dmg: 23, zonaMax: 1.6, rate: 0.105, range: 150, pellets: 1 },
  sg: { dmg: 11, zonaMax: 1.5, rate: 0.9, range: 38, pellets: 9 },
  sn: { dmg: 105, zonaMax: 2.0, rate: 1.6, range: 420, pellets: 1 },
};
export const PICCONE = { danno: 20, testa: 30, portata: 3.0, colpiAlSecondo: 3 };
export const RARITA_MAX = 1.16;
export const ZONE = ['head', 'chest', 'stomach', 'arm', 'leg'];
export const MARGINE_COLPI = { portata: 10, angoloGradi: 75, vicino: 4, raffica: 3 };

export function dannoMaxPallino(arma) { const a = ARMI_DANNO[arma]; return a ? Math.ceil(a.dmg * a.zonaMax * RARITA_MAX) + 1 : 0; }

/* Ritmo di fuoco: un secchiello per arma, capienza "raffica" spari, ricarica 1 sparo ogni rate s.
   Regge i grappoli della rete ma non una mitragliatrice al posto del fucile di precisione. */
export function puoSparare(sec, arma, ora) {
  const a = ARMI_DANNO[arma]; if (!a) return false;
  const s = sec[arma] || (sec[arma] = { t: ora, g: MARGINE_COLPI.raffica });
  s.g = Math.min(MARGINE_COLPI.raffica, s.g + (ora - s.t) / 1000 / (a.rate * 0.9)); s.t = ora;
  if (s.g < 1) return false; s.g -= 1; return true;
}

/* Un colpo andato a segno: chi spara (a) e chi e' colpito (v) come li sa il server.
   Torna null se va bene, se no il motivo. */
export function controllaColpo(a, v, arma, danno, portata) {
  if (!v) return 'bersaglio sconosciuto';
  if (!v.inGioco || !v.vivo) return 'bersaglio non in gioco';
  if (!(typeof danno === 'number' && danno >= 1)) return 'danno';
  const dx = v.x - a.x, dz = v.z - a.z, dy = v.y - a.y, dist = Math.hypot(dx, dy, dz);
  if (dist > portata + MARGINE_COLPI.portata) return 'troppo lontano';
  if (Math.hypot(dx, dz) > MARGINE_COLPI.vicino) {   // da vicino l'angolo non conta (spalla della telecamera)
    const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), l = Math.hypot(dx, dz);
    const ang = Math.acos(Math.max(-1, Math.min(1, (fx * dx + fz * dz) / l))) * 180 / Math.PI;
    if (ang > MARGINE_COLPI.angoloGradi) return 'non guardava il bersaglio';
  }
  return null;
}

/* Vita e scudo come Character.takeDamage del gioco: lo scudo assorbe prima, "pen" salta lo scudo. */
export function applicaDanno(v, danno, pen = 0) {
  const left0 = danno * (1 - pen); let left = left0, sd = 0;
  if (v.scudo > 0) { sd = Math.min(v.scudo, left); v.scudo -= sd; left -= sd; }
  left += danno * pen;
  v.hp = Math.max(0, v.hp - left);
  return { scudo: sd, vita: left, morto: v.hp <= 0 };
}
