// v116-v118: multiplayer online, la parte dentro il gioco (senza rete: la stanza e' finta).
// Le prove con browser veri e server vero sono tools/browser/online116/117/118.cjs; quella del server server/test/stanza.mjs.
// Uso: node test/v118.cjs [file.html]
// Controlla:
//  - indirizzo del server: ?server=, <meta> della pubblicazione, localhost SOLO se la pagina e' locale, mai altrove
//  - partita in solitario identica (29 bot, bus) se non si e' in una stanza; in stanza "Gioca" non parte da solo
//  - partita online dal seme: host e ospite hanno lo STESSO bus, gli stessi bot, lo stesso bottino, la stessa tempesta;
//    i bot li fa ragionare solo l'host
//  - stato mandato (con fase del volo), tempesta mandata al server, cure mandate al server
//  - gli altri: interpolati, deltaplano visibile, sul bus nascosti, vita dal server, colpi verso il server (sparo/piccone)
//  - bot dell'host sugli altri client: posizioni dai pacchetti; un mio bot che colpisce me va al server
//  - costruzioni: pezzo/danno/modifica/rotto ricevuti e mandati; eliminazione e fine dal server; spettatore
const { load, THREE: T } = require('./harness.cjs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
let ok = 0, ko = 0; const prova = (nome, cond, info) => { if (cond) { ok++; console.log('PASS', nome); } else { ko++; console.log('FAIL', nome, info !== undefined ? JSON.stringify(info) : ''); } };
(async () => {
  const c = load(file); await c.init(); c.window.keysDefaults(); c.document.documentElement = { style: { setProperty() {} } }; const A = c.API;
  prova('classi presenti', !!(A.Rete116 && A.indirizzoServer116 && A.codice116 && A.RETE116));

  // ---------- indirizzo del server ----------
  const metaVal = { v: null }; const qsOrig = c.document.querySelector;
  c.document.querySelector = (sel) => (sel.includes('battlecraft-server') ? (metaVal.v === null ? null : { content: metaVal.v }) : qsOrig(sel));
  const dove = (prot, host, search) => { c.location.protocol = prot; c.location.hostname = host; c.location.search = search || ''; return A.indirizzoServer116(); };
  metaVal.v = null; prova('pagina pubblicata senza indirizzo: nessun server (mai localhost)', dove('https:', 'battlecraft.vercel.app') === null);
  metaVal.v = 'wss://battlecraft-server.onrender.com'; prova('pubblicata col meta: usa quello', dove('https:', 'battlecraft.vercel.app') === 'wss://battlecraft-server.onrender.com');
  prova('anche aperta in locale, il meta vince', dove('http:', 'localhost') === 'wss://battlecraft-server.onrender.com');
  metaVal.v = ''; prova('aperta in locale senza meta: server locale', dove('http:', 'localhost') === 'ws://localhost:2567');
  prova('?server= per le prove vince su tutto', dove('https:', 'battlecraft.vercel.app', '?server=wss://prova.example') === 'wss://prova.example');
  c.location.search = ''; c.location.protocol = 'https:'; c.location.hostname = 'battlecraft.vercel.app';

  // ---------- gioco ----------
  const G = Object.create(A.Game.prototype);
  Object.assign(G, { sun: new T.DirectionalLight(), scene: new T.Scene(), physics: new A.Physics(), state: 'title', time: 0, chars: [], bots: [], outfit: 0, playerName: 'Test', canvas: c.document.createElement('canvas'), renderer: { toneMappingExposure: 1, setPixelRatio() {}, setSize() {} }, lobbyCam: new T.PerspectiveCamera(), sens: 1, jumpBuf: 0, zoneTickT: 0, camera: new T.PerspectiveCamera(), stats: { xp: 0, kills: 0, matches: 0, top3: 0 } });
  G.scene.fog = new T.Fog(0, 50, 80); G.world = new A.World(G); G.world.build();
  for (const [key, cls] of Object.entries({ audio: 'AudioSys', fx: 'FX', input: 'Input', cam: 'CameraRig', hud: 'HUD', combat: 'Combat', build: 'BuildSystem', edit: 'EditSystem', harvest: 'Harvest', items: 'Items', zone: 'SafeZone', drop88: 'Drop88' })) G[key] = new A[cls](key === 'input' ? G.canvas : G);
  G.ui = Object.fromEntries(['title', 'end', 'pause', 'pauseNote', 'endTitle', 'endText', 'q1', 'q2'].map((k) => [k, c.document.createElement('div')]));
  G.avvia102 = function () { this._soloAvviata = true; };   // la vera avvia102 apre la schermata di caricamento: qui basta sapere se parte
  G.rete116 = new A.Rete116(G); G.bindUI();
  G.hud.killfeed = () => {}; G.hud.toast = () => {}; G.hud.update = () => {}; G.hud.refreshHotbar = () => {}; G.saveStats = () => {}; G.refreshLobbyUI = () => {};
  const R = G.rete116;

  prova('senza stanza la rete e\' spenta', !R.attiva());
  G.startMatch();
  prova('solitario invariato: 29 bot e il bus', G.bots.length === 29 && G.chars.length === 30 && !!G.drop88.bus && !G.online116, [G.bots.length, G.chars.length]);
  G.quitToMenu();
  G.avvia102(); prova('senza stanza "Gioca" avvia la partita da soli', G._soloAvviata === true);

  // stanza finta
  const mandati = [];
  const giocatori = new Map(), bot = new Map();
  const S = { codice: 'K7Q2', modo: 'bus', fase: 'lobby', host: 'io', seme: 424242, nBot: 3, via: 0, vincitore: '', giocatori, bot };
  const room = { roomId: 'K7Q2', sessionId: 'io', reconnectionToken: 't', state: S, send: (tipo, m) => mandati.push([tipo, m]), leave: async () => {} };
  R.room = room; R.benv = { codice: 'K7Q2', spawn: 0, x: -42, z: 42, yaw: 0.2 };
  giocatori.set('io', { nome: 'Test', spawn: 0, connesso: true, inGioco: false, vivo: true, hp: 100, scudo: 0 });
  for (let i = 0; i < 3; i++) bot.set('b' + i, { hp: 100, scudo: 0, vivo: true });
  G._soloAvviata = false; G.avvia102();
  prova('in stanza "Gioca" dell\'host chiede al server di avviare (non parte da solo)', !G._soloAvviata && mandati.some(([t]) => t === 'avvia'));
  S.host = 'altro'; mandati.length = 0; G.avvia102();
  prova('chi non e\' host non avvia', !mandati.some(([t]) => t === 'avvia'));

  // ---------- la stessa partita per l'host e per l'ospite ----------
  const foto = () => ({ from: G.drop88.from.toArray().map((v) => +v.toFixed(3)), to: G.drop88.to.toArray().map((v) => +v.toFixed(3)), jump: G.chars.filter((x) => x.air88).map((x) => +x.air88.jumpAt.toFixed(3)),
    bot: G.bots.map((b) => b.name + ':' + b.shield + ':' + b.weapon), item: G.items.list.slice(0, 40).map((it) => it.type + '@' + (it.pos ? it.pos.x.toFixed(2) + ',' + it.pos.z.toFixed(2) : '')).join('|'), zona: G.zone.nextCenter.toArray().map((v) => +v.toFixed(3)) });
  S.host = 'io'; S.fase = 'carico'; R.startMatch();
  const fh = foto();
  prova('online: 3 bot, il bus, si aspetta l\'ora del server', G.bots.length === 3 && !!G.drop88.bus && G.state === 'loading102' && G.online116, [G.bots.length, G.state]);
  prova('host: i bot hanno il cervello', G.bots.every((b) => b.brain && !b.remoto116));
  const p = G.player; prova('io sul bus', p.air88 && p.air88.phase === 'bus');
  S.host = 'altro'; R.startMatch();
  const fo = foto();
  prova('ospite: i bot senza cervello, mossi dalla rete', G.bots.every((b) => !b.brain && b.remoto116));
  prova('stesso percorso del bus per host e ospite', JSON.stringify(fh.from) === JSON.stringify(fo.from) && JSON.stringify(fh.to) === JSON.stringify(fo.to), [fh.from, fo.from]);
  prova('stessi salti dei bot dal bus', JSON.stringify(fh.jump) === JSON.stringify(fo.jump), [fh.jump, fo.jump]);
  prova('stessi bot (nomi, scudi, armi)', JSON.stringify(fh.bot) === JSON.stringify(fo.bot), [fh.bot, fo.bot]);
  prova('stesso bottino a terra', fh.item === fo.item && fh.item.length > 10);
  prova('stesso primo cerchio della tempesta', JSON.stringify(fh.zona) === JSON.stringify(fo.zona), [fh.zona, fo.zona]);
  S.seme = 999; R.startMatch(); const f2 = foto(); S.seme = 424242;
  prova('un altro seme: un altro bus', JSON.stringify(f2.from) !== JSON.stringify(fh.from));

  // ---------- partita come host ----------
  S.host = 'io'; S.fase = 'partita'; R.startMatch(); G.state = 'playing';
  const me = G.player; giocatori.get('io').inGioco = true;
  mandati.length = 0; for (let i = 0; i < 60; i++) R.update(1 / 60);
  const stati = mandati.filter(([t]) => t === 'stato');
  prova('invio ~20 stati al secondo, con la fase del volo', stati.length >= 18 && stati.length <= 22 && stati[0][1].aria === 'bus', [stati.length, stati[0] && stati[0][1].aria]);
  prova('l\'host manda i suoi bot ~10 volte al secondo', mandati.filter(([t]) => t === 'bots').length >= 9, mandati.filter(([t]) => t === 'bots').length);
  // tempesta: il mio danno va al server, la mia vita la decide il server
  me.takeDamage(3, me, null); me.takeDamage(2, me, null);
  prova('tempesta: in locale niente, la vita resta', me.hp === 100);
  mandati.length = 0; for (let i = 0; i < 40; i++) R.update(1 / 60);
  const z = mandati.find(([t]) => t === 'zona');
  prova('tempesta: il danno va al server (5)', z && Math.abs(z[1].d - 5) < 0.01, z);
  // un mio bot colpisce me: va al server come sparo del bot
  const b0 = G.bots[0]; me.air88 = null; b0.air88 = null; me.pos.set(-40, 3, 40); b0.pos.set(-35, 3, 40);
  mandati.length = 0; R._sparo = { punti: [], colpi: [], arma: 'ar', ch: b0 }; me.takeDamage(23, b0, null); const sp = R._sparo; R._sparo = null; R.chiudiSparo(b0, sp);
  const sb = mandati.find(([t]) => t === 'sparoBot');
  prova('un mio bot che colpisce me: "sparoBot" col colpo su di me', sb && sb[1].b === 0 && sb[1].c[0].a === 'io' && sb[1].c[0].d === 23, sb);
  // cure: il valore nuovo va al server
  mandati.length = 0; me.hp = 40; me.heal(25);
  const cu = mandati.find(([t]) => t === 'cura');
  prova('cura del mio giocatore mandata al server', cu && cu[1].hp === 65 && cu[1].b === undefined, cu);
  // vita dal server
  giocatori.get('io').hp = 60; G.time = 5; R.update(1 / 60);
  prova('la mia vita viene dal server (e la vignetta si accende)', me.hp === 60 && me.lastDamageT === 5, [me.hp, me.lastDamageT]);
  bot.get('b1').hp = 33; R.update(1 / 60);
  prova('la vita dei bot viene dal server', G.bots[1].hp === 33);

  // ---------- un altro giocatore ----------
  const g = { nome: 'Amico', spawn: 1, connesso: true, inGioco: true, vivo: true, hp: 100, scudo: 0, x: -30, y: 108, z: 40, vx: 14, vy: 0, vz: 0, yaw: 0, pitch: 0, aTerra: false, accov: false, mira: false, arma: 'ar', modo: 'weapon', aria: 'bus', ts: 1000 };
  giocatori.set('lui', g);
  R.istantanea(S); g.x = -29.3; g.ts = 1050; R.istantanea(S);
  const r = R.remoti.get('lui'); const tt = c.performance.now(); r.buf[0].t = tt - 145; r.buf[1].t = tt - 95;
  R.update(1 / 60);
  const ch = r.ch;
  prova('l\'altro e\' un personaggio nella mappa', ch && G.chars.includes(ch) && ch.remoto116 === 'lui' && !ch.brain);
  prova('sul bus: nascosto, etichetta spenta', ch.air88 && ch.air88.phase === 'bus' && r.tag.visible === false);
  g.aria = 'glide'; g.y = 60; g.ts = 1100; R.istantanea(S); r.buf[r.buf.length - 1].t = c.performance.now() - 200; R.update(1 / 60);
  for (let i = 0; i < 40; i++) { R.update(1 / 60); ch.animate(1 / 60); }
  prova('in planata: deltaplano in scena e visibile', ch.air88 && ch.air88.phase === 'glide' && ch.air88.glider.parent === G.scene && ch.air88.glider.visible === true, ch.air88 && [ch.air88.phase, ch.air88.glider.visible]);
  g.aria = ''; g.aTerra = true; g.y = 3; g.ts = 1150; R.istantanea(S); r.buf[r.buf.length - 1].t = c.performance.now() - 200; R.update(1 / 60);
  prova('atterrato: deltaplano tolto', !ch.air88);
  mandati.length = 0; ch.takeDamage(20, me, null);
  prova('colpo mio di piccone sull\'altro: va al server, la sua vita non cambia', ch.hp === 100 && mandati.some(([t, m]) => t === 'piccone' && m.a === 'lui' && m.d === 20), mandati);
  mandati.length = 0; ch.takeDamage(20, G.bots[2], null);
  prova('un mio bot colpisce l\'altro fuori da uno sparo: niente (il piccone e\' solo mio)', mandati.length === 0);
  g.hp = 41; g.scudo = 10; R.update(1 / 60);
  prova('vita e scudo dell\'altro letti dallo stato', ch.hp === 41 && ch.shield === 10);
  R.riceviEliminato({ v: 'lui', k: 'io', arma: 'ar' });
  prova('eliminato dal server: l\'altro cade, l\'uccisione e\' mia, la partita NON finisce da sola', !ch.alive && me.kills === 1 && G.endTimer <= 0 && G.state === 'playing', [ch.alive, me.kills, G.endTimer]);

  // ---------- costruzioni ----------
  const Bs = G.build; me.res.wood = 200;
  const dir = new T.Vector3(1, 0, 0); const t = Bs.computeTarget(me, dir, 'wall', 0);
  const def = { type: 'wall', ix: t.ix, iy: t.iy, iz: t.iz, rot: t.rot, key: t.key, center: t.center.clone(), pattern: 0 };
  mandati.length = 0; const pz = Bs.tryPlace(me, def, 'wood', true);
  const mp = mandati.find(([tp]) => tp === 'pezzo');
  prova('una mia parete va al server', pz && mp && mp[1].k === pz.key && mp[1].t === 'wall' && mp[1].mat === 'wood', mp);
  mandati.length = 0; Bs.damagePiece(pz, 20, me);
  prova('un mio colpo sulla parete va al server', mandati.some(([tp, m]) => tp === 'dannoPezzo' && m.k === pz.key && m.d === 20));
  const t2 = Bs.computeTarget(me, new T.Vector3(-1, 0, 0), 'wall', 0);
  R.riceviPezzo({ k: t2.key, t: 'wall', ix: t2.ix, iy: t2.iy, iz: t2.iz, rot: t2.rot, mat: 'stone', c: t2.center.toArray(), da: 'lui' });
  const pz2 = Bs.grid.get(t2.key);
  prova('una parete di un altro compare (senza costargli risorse a me)', pz2 && pz2.mat === 'stone' && me.res.wood === 200 - 10, [!!pz2, me.res.wood]);
  mandati.length = 0; R.riceviDannoPezzo({ k: t2.key, d: 10 });
  prova('il danno di un altro alla sua parete arriva, senza rimandarlo', mandati.length === 0 && pz2.hp < pz2.maxHp);
  R.riceviRotto({ k: t2.key });
  prova('la parete rotta da un altro sparisce', !Bs.grid.has(t2.key));

  // ---------- bot dell'host visti da un ospite ----------
  S.host = 'altro'; R.startMatch(); G.state = 'playing';
  const bb = G.bots[1]; const ts0 = 5000;
  R.riceviBots({ ts: ts0, l: [[1, 10, 5, 20, 2, 0, 0, 0.5, 0, 1 | 16, 1, 0, 3]] });
  R.riceviBots({ ts: ts0 + 100, l: [[1, 10.2, 5, 20, 2, 0, 0, 0.5, 0, 1 | 16, 1, 0, 3]] });
  bb._buf[0].t = c.performance.now() - 170; bb._buf[1].t = c.performance.now() - 70;
  R.update(1 / 60);
  prova('ospite: il bot dell\'host si muove coi pacchetti, in planata col deltaplano', bb.pos.x > 10 && bb.pos.x < 10.2 && bb.air88 && bb.air88.phase === 'glide', [bb.pos.x, bb.air88 && bb.air88.phase]);
  // l'host esce: divento io l'host e prendo i bot
  S.host = 'io'; R.update(1 / 60);
  prova('divento host a partita in corso: i bot li guida il mio computer', G.bots.every((b) => !b.remoto116 && (b.brain || !b.alive)));

  // ---------- fine e spettatore ----------
  R.riceviEliminato({ v: 'io', k: 'b0', arma: 'ar' });
  prova('eliminato: guardo la partita (niente schermata di fine da solo)', !G.player.alive && G.state === 'playing' && G.endTimer <= 0);
  R.riceviFine({ id: 'b0', nome: '' });
  prova('fine dal server: schermata di fine col nome del vincitore (un bot)', G.state === 'ended' && /Ha vinto/.test(G.ui.endText.textContent) && G.ui.endText.textContent.includes(G.bots[0].name), G.ui.endText.textContent);
  S.fase = 'partita'; mandati.length = 0; G.quitToMenu();
  prova('tornando in lobby a partita in corso avviso il server ("arrendo")', mandati.some(([tp]) => tp === 'arrendo') && !G.online116 && G.state === 'title');

  console.log(`\n${ok} PASS, ${ko} FAIL`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
