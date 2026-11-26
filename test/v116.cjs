// v116: multiplayer online, la parte dentro il gioco (senza rete: la stanza e' finta).
// La prova con due browser veri e il server vero e' tools/browser/online116.cjs; quella del server e' server/test/stanza.mjs.
// Uso: node test/v116.cjs [file.html]
// Controlla:
//  - indirizzo del server: ?server=, <meta> della pubblicazione, localhost SOLO se la pagina e' locale, mai altrove
//  - partita in solitario identica (29 bot, bus) se non si e' in una stanza
//  - partita online: niente bot/bus, giocatore al suo posto sul terreno, niente tempesta
//  - l'altro giocatore: un Character normale col modello pieno, interpolato fra i pacchetti, accovacciato,
//    arma e piccone, etichetta col nome (grigia se si sta riconnettendo), i colpi non lo feriscono (fase 2)
//  - tornando in lobby si resta nella stanza e l'altro sparisce dalla mappa
const { load, THREE: T } = require('./harness.cjs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
let ok = 0, ko = 0; const prova = (nome, cond, info) => { if (cond) { ok++; console.log('PASS', nome); } else { ko++; console.log('FAIL', nome, info !== undefined ? JSON.stringify(info) : ''); } };
(async () => {
  const c = load(file); await c.init(); c.window.keysDefaults(); c.document.documentElement = { style: { setProperty() {} } }; const A = c.API;
  prova('classi v116 presenti', !!(A.Rete116 && A.indirizzoServer116 && A.codice116 && A.RETE116));

  // ---------- indirizzo del server ----------
  const metaVal = { v: null }; const qsOrig = c.document.querySelector;
  c.document.querySelector = (sel) => (sel.includes('battlecraft-server') ? (metaVal.v === null ? null : { content: metaVal.v }) : qsOrig(sel));
  const dove = (prot, host, search) => { c.location.protocol = prot; c.location.hostname = host; c.location.search = search || ''; return A.indirizzoServer116(); };
  metaVal.v = null;
  prova('pagina pubblicata senza indirizzo: nessun server (mai localhost)', dove('https:', 'battlecraft.vercel.app') === null);
  metaVal.v = '';
  prova('meta vuoto in pubblicazione: nessun server', dove('https:', 'battlecraft.vercel.app') === null);
  metaVal.v = 'wss://battlecraft-server.onrender.com';
  prova('pubblicata col meta: usa quello', dove('https:', 'battlecraft.vercel.app') === 'wss://battlecraft-server.onrender.com');
  prova('anche aperta in locale, il meta vince', dove('http:', 'localhost') === 'wss://battlecraft-server.onrender.com');
  metaVal.v = '';
  prova('aperta in locale senza meta: server locale', dove('http:', 'localhost') === 'ws://localhost:2567' && dove('file:', '') === 'ws://localhost:2567');
  prova('?server= per le prove vince su tutto', dove('https:', 'battlecraft.vercel.app', '?server=wss://prova.example') === 'wss://prova.example');
  c.location.search = ''; c.location.protocol = 'https:'; c.location.hostname = 'battlecraft.vercel.app';
  prova('codice stanza ripulito', A.codice116(' k7q2-x ') === 'K7Q2' && A.codice116('ab') === 'AB');

  // ---------- gioco ----------
  const G = Object.create(A.Game.prototype);
  Object.assign(G, { sun: new T.DirectionalLight(), scene: new T.Scene(), physics: new A.Physics(), state: 'title', time: 0, chars: [], bots: [], outfit: 0, playerName: 'Test', canvas: c.document.createElement('canvas'), renderer: { toneMappingExposure: 1, setPixelRatio() {}, setSize() {} }, lobbyCam: new T.PerspectiveCamera(), sens: 1, jumpBuf: 0, zoneTickT: 0, camera: new T.PerspectiveCamera(), stats: { xp: 0 } });
  G.scene.fog = new T.Fog(0, 50, 80); G.world = new A.World(G); G.world.build();
  for (const [key, cls] of Object.entries({ audio: 'AudioSys', fx: 'FX', input: 'Input', cam: 'CameraRig', hud: 'HUD', combat: 'Combat', build: 'BuildSystem', edit: 'EditSystem', harvest: 'Harvest', items: 'Items', zone: 'SafeZone', drop88: 'Drop88' })) G[key] = new A[cls](key === 'input' ? G.canvas : G);
  G.ui = Object.fromEntries(['title', 'end', 'pause', 'pauseNote', 'q1', 'q2'].map((k) => [k, c.document.createElement('div')]));
  G.rete116 = new A.Rete116(G); G.bindUI();
  G.hud.killfeed = () => {}; G.hud.toast = () => {}; G.hud.update = () => {}; G.hud.refreshHotbar = () => {};

  prova('senza stanza la rete e\' spenta', !G.rete116.attiva());
  G.startMatch();
  prova('solitario invariato: 29 bot e il bus', G.bots.length === 29 && G.chars.length === 30 && !!G.drop88.bus && !G.online116, [G.bots.length, G.chars.length]);
  G.quitToMenu();

  // stanza finta: quello che il client manda lo registro
  const mandati = [];
  const giocatori = new Map();
  const room = { roomId: 'K7Q2', sessionId: 'io', reconnectionToken: 't', state: { giocatori }, send: (tipo, m) => mandati.push([tipo, m]), leave: async () => {} };
  G.rete116.room = room; G.rete116.benv = { codice: 'K7Q2', spawn: 0, x: -42, z: 40, yaw: 0.2 };
  giocatori.set('io', { nome: 'Test', spawn: 0, connesso: true, inGioco: false });
  prova('in stanza la rete e\' attiva', G.rete116.attiva());
  G.startMatch();
  const p = G.player;
  prova('online: niente bot, niente bus', G.bots.length === 0 && G.chars.length === 1 && !G.drop88.bus && G.online116 === true, [G.bots.length, G.chars.length]);
  const suolo = G.physics.supportHeight(-42, 40, 60);
  prova('online: al suo posto, appoggiato sul terreno', Math.hypot(p.pos.x + 42, p.pos.z - 40) < 0.01 && Math.abs(p.pos.y - suolo) < 0.2 && Math.abs(p.yaw - 0.2) < 1e-6, [p.pos.x, p.pos.y, p.pos.z, suolo]);
  prova('online: avvisa il server che e\' in partita', mandati.some(([t, m]) => t === 'inGioco' && m === true));

  // il mio stato parte ~20 volte al secondo, con l'ora d'invio
  mandati.length = 0; for (let i = 0; i < 60; i++) G.rete116.update(1 / 60);
  const stati = mandati.filter(([t]) => t === 'stato');
  prova('invio ~20 stati al secondo', stati.length >= 18 && stati.length <= 22, stati.length);
  const s0 = stati[0] && stati[0][1];
  prova('lo stato ha posizione, velocita\', yaw, pitch, a terra, accovacciato, arma, ora d\'invio', s0 && ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'aTerra', 'accov', 'mira', 'arma', 'modo', 'ts'].every((k) => k in s0) && s0.arma === 'ar', s0);

  // ---------- l'altro giocatore ----------
  const now = () => c.performance.now();
  const g = { nome: 'Amico', spawn: 1, connesso: true, inGioco: true, x: -40, y: suolo, z: 50, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, aTerra: true, accov: false, mira: false, arma: 'ar', modo: 'weapon', ts: 1000 };
  giocatori.set('lui', g);
  const R = G.rete116;
  // due pacchetti a 50 ms (sul SUO orologio), poi lo guardo a meta' fra i due
  R.istantanea(room.state);
  g.x = -39.77; g.vx = 4.6; g.ts = 1050; R.istantanea(room.state);
  const r = R.remoti.get('lui');
  prova('i pacchetti dell\'altro finiscono nel buffer', r && r.buf.length === 2, r && r.buf.length);
  // metto i due pacchetti a 120+25 ms fa e 120-25 ms fa: col ritardo voluto di 120 ms cado a meta'
  const t = now(); r.buf[0].t = t - 145; r.buf[1].t = t - 95;
  R.update(1 / 60);
  const ch = r.ch;
  prova('l\'altro e\' un personaggio nella mappa', ch && G.chars.includes(ch) && ch.remoto116 === 'lui' && !ch.isPlayer && !ch.brain);
  prova('l\'altro ha il modello pieno (come il giocatore)', ch && ch.model && ch.model.group && ch.model.group.parent === G.scene);
  prova('posizione interpolata fra i due pacchetti', ch && ch.pos.x > -39.95 && ch.pos.x < -39.82, ch && ch.pos.x);
  prova('velocita\' passata all\'animazione (corsa)', ch && ch.vel.x > 2 && ch.moving && ch.inputDir, ch && [ch.vel.x, ch.moving]);
  prova('etichetta col nome sopra la testa', r.tag && r.tag.parent === G.scene && r.tag.userData.testo116 === 'Amico' && r.tag.position.y > ch.pos.y + 1.8, r.tag && [r.tag.userData.testo116, r.tag.position.y - ch.pos.y]);
  for (let i = 0; i < 30; i++) ch.animate(1 / 60);
  prova('animate() gira sull\'altro senza errori', true);

  // accovacciato, piccone, mira
  g.accov = true; g.modo = 'harvest'; g.arma = ''; for (let i = 0; i < 40; i++) R.update(1 / 60);
  prova('l\'altro si accovaccia', ch.crouch90 === true && ch.crouchK90 > 0.9, ch.crouchK90);
  prova('l\'altro tiene il piccone', ch.mode === 'harvest' && ch.weaponModels.pick.visible === true);
  g.accov = false; g.modo = 'weapon'; g.arma = 'sg'; g.mira = true; for (let i = 0; i < 40; i++) R.update(1 / 60);
  prova('l\'altro si rialza, cambia arma e mira', ch.crouch90 === false && ch.crouchK90 < 0.1 && ch.weapon === 'sg' && ch.weaponModels.sg.visible && ch.ads === true);

  // riconnessione: etichetta grigia
  g.connesso = false; R.update(1 / 60);
  prova('in riconnessione l\'etichetta lo dice', r.tag.userData.testo116 === 'Amico (…)#');
  g.connesso = true; R.update(1 / 60);
  prova('riconnesso: etichetta normale', r.tag.userData.testo116 === 'Amico');

  // colpi: per ora non lo feriscono (danni in rete = fase successiva)
  ch.takeDamage(50, p, null);
  prova('i colpi sull\'altro non contano (ancora)', ch.hp === 100 && ch.alive);

  // niente tempesta online: anche fuori dall'area la vita resta
  G.zone.radius = 1; G.zone.center.set(500, 0, 500); G.drop88.elapsed = 999; G.state = 'playing';
  const hp0 = p.hp; for (let i = 0; i < 30; i++) G.update(1 / 60);
  prova('online la tempesta non fa danno', p.hp === hp0, [hp0, p.hp]);

  // fuori dalla mappa se lui torna in lobby
  g.inGioco = false; R.update(1 / 60);
  prova('lui torna in lobby: sparisce dalla mappa', !r.ch && !G.chars.some((x) => x.remoto116) && !r.tag);
  g.inGioco = true; g.ts = 2000; R.istantanea(room.state); R.update(1 / 60);
  prova('lui rientra: ricompare', !!r.ch && G.chars.includes(r.ch));

  // io torno in lobby: resto nella stanza, l'altro sparisce
  mandati.length = 0; G.quitToMenu();
  prova('in lobby: resto nella stanza', G.rete116.attiva() && !G.online116 && G.state === 'title');
  prova('in lobby: avviso il server', mandati.some(([t, m]) => t === 'inGioco' && m === false));
  prova('in lobby: l\'altro non e\' piu\' in mappa', !r.ch && !G.chars.some((x) => x.remoto116));
  // lui esce dalla stanza
  giocatori.delete('lui'); R.istantanea(room.state);
  prova('lui esce dalla stanza: lo dimentico', !R.remoti.has('lui'));

  console.log(`\n${ok} PASS, ${ko} FAIL`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
