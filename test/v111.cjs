// v111: sparo automatico e nome alla prima apertura. Uso: node test/v111.cjs [file.html]
// Controlla:
//  - mirino sul bot -> spara da solo; mirino a lato -> no; muro in mezzo -> no; oltre la portata -> no
//  - opzione spenta -> non spara; piccone -> non spara; in costruzione -> non spara
//  - arma a colpo singolo: spara al suo ritmo e non blocca il grilletto vero
//  - la casella delle impostazioni salva l'opzione; la finestra di benvenuto c'e' (una volta per dispositivo)
const { load, THREE: T } = require('./harness.cjs');
const fs = require('fs'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
let ok = 0, ko = 0; const prova = (nome, cond, info) => { if (cond) { ok++; console.log('PASS', nome); } else { ko++; console.log('FAIL', nome, info !== undefined ? JSON.stringify(info) : ''); } };
(async () => {
  const c = load(file); await c.init(); c.window.keysDefaults(); c.document.documentElement = { style: { setProperty() {} } }; const A = c.API;
  const salvati = {}; c.localStorage.setItem = (k, v) => { salvati[k] = String(v); };
  const G = Object.create(A.Game.prototype);
  Object.assign(G, { sun: new T.DirectionalLight(), scene: new T.Scene(), physics: new A.Physics(), state: 'title', time: 0, chars: [], bots: [], outfit: 0, playerName: 'Test', canvas: c.document.createElement('canvas'), renderer: { toneMappingExposure: 1, setPixelRatio() {}, setSize() {} }, lobbyCam: new T.PerspectiveCamera(), sens: 1, jumpBuf: 0, zoneTickT: 0, camera: new T.PerspectiveCamera(), stats: { xp: 0 } });
  G.scene.fog = new T.Fog(0, 50, 80); G.world = new A.World(G); G.world.build();
  for (const [key, cls] of Object.entries({ audio: 'AudioSys', fx: 'FX', input: 'Input', cam: 'CameraRig', hud: 'HUD', combat: 'Combat', build: 'BuildSystem', edit: 'EditSystem', harvest: 'Harvest', items: 'Items', zone: 'SafeZone', drop88: 'Drop88' })) G[key] = new A[cls](key === 'input' ? G.canvas : G);
  G.ui = Object.fromEntries(['title', 'end', 'pause', 'pauseNote', 'q1', 'q2'].map((k) => [k, c.document.createElement('div')])); G.bindUI(); G.startMatch();
  G.hud.killfeed = () => {}; G.hud.toast = () => {}; G.hud.update = () => {}; G.hud.refreshHotbar = () => {};   // l'interfaccia non e' cio' che si prova qui
  prova('opzione spenta di serie', G.sparoAuto111 === false);
  const P = G.physics, p = G.player, b = G.bots[0]; p.air88 = null; b.air88 = null; G.drop88.clear(); G.drop88.elapsed = 999;
  for (const o of G.bots) if (o !== b) o.alive = false;
  const at = (ch, x, z) => { ch.pos.set(x, 0, z); ch.pos.y = P.supportHeight(x, z, 60); ch.vel.set(0, 0, 0); ch.onGround = true; };
  const X = -60, Z = -8; at(b, X, Z); at(p, X, Z - 6); b.yaw = 0; b.brain = null; b.shield = 0; b.hp = 1e6;
  for (let k = 0; k < 60; k++) { b.onGround = true; b.vel.set(0, 0, 0); b.tick(1 / 60); b.animate(1 / 60); p.tick(1 / 60); p.animate(1 / 60); }
  // telecamera puntata dritta sul petto del bot (stesso raggio dello sparo)
  /* si mira alle ossa vere (sotto la testa: torace), non a 'piedi + 1,2 m': il bot puo' essere ancora nella posa del bus */
  const petto = () => { b.model.group.updateWorldMatrix(true, true); const h = new T.Vector3(); b.model.head.getWorldPosition(h); return h.lerp(new T.Vector3(b.pos.x, b.pos.y + 0.9, b.pos.z), 0.45); };
  const mira = (dx) => { const t = petto(); t.x += dx; G.cam.pos.set(p.pos.x + dx, t.y + 0.3, p.pos.z - 2.5); G.cam.dir.subVectors(t, G.cam.pos).normalize(); };
  p.giveWeapon('ar', 300); p.selectWeapon('ar'); p.mode = 'weapon';
  mira(0);
  G._sparoT111 = 0; prova('mirino sul bot: il controllo lo vede', G.mirinoSuNemico111(p, 1) === true);
  mira(2.5); G._sparoT111 = 0; prova('mirino a 2,5 m dal bot: niente', G.mirinoSuNemico111(p, 1) === false);
  // sparo vero nel ciclo di gioco: Game.update col mirino sul bot, opzione accesa / spenta
  const giraUpdate = (sec) => { const cd0 = p.cur109().mag; for (let k = 0; k < sec * 60; k++) { G.cam.update = () => {}; mira(0); p.yaw = 0; G.cam.yaw = 0; G.cam.pitch = Math.asin(G.cam.dir.y); G.update(1 / 60); } return cd0 - p.cur109().mag; };
  const sp0 = giraUpdate(0.5); prova('opzione spenta: non spara da solo', sp0 === 0, sp0);
  G.impostaSparo111(true); prova('impostaSparo111 salva l\'opzione', salvati.battlecraft_sparoauto111 === '1' && G.sparoAuto111 === true, salvati);
  const sp1 = giraUpdate(0.5); prova('opzione accesa, mirino sul bot: spara da solo (fucile d\'assalto)', sp1 >= 2, sp1);
  // muro in mezzo: un muro costruito fra i due
  { const r = P.raycast(G.cam.pos, G.cam.dir, 30, { chars: true, ignore: p }); prova('prima del muro il raggio prende il bot', !!(r.hit && r.char === b)); }
  { // muro in mezzo: una scatola di collisione fra i due (come un muro costruito)
    const col = { type: 'box', min: new T.Vector3(X - 2, p.pos.y - 1, Z - 3.3), max: new T.Vector3(X + 2, p.pos.y + 5, Z - 3.0) }; P.add(col);
    G._sparoT111 = 0; mira(0); prova('muro in mezzo: non spara', G.mirinoSuNemico111(p, 1) === false); P.remove(col);
    G._sparoT111 = 0; mira(0); prova('tolto il muro: di nuovo si', G.mirinoSuNemico111(p, 1) === true);
  }
  // portata: il bot oltre la portata del fucile a pompa
  p.giveWeapon('sg', 30); p.selectWeapon('sg'); const portata = A.WEAPONS.sg.range; at(b, X, Z - 6 + portata + 8); for (let k = 0; k < 10; k++) { b.tick(1 / 60); b.animate(1 / 60); }
  G._sparoT111 = 0; mira(0); prova('oltre la portata dell\'arma: non spara', G.mirinoSuNemico111(p, 1) === false, portata);
  at(b, X, Z); for (let k = 0; k < 10; k++) { b.tick(1 / 60); b.animate(1 / 60); }
  // colpo singolo (cecchino): spara al suo ritmo e il grilletto vero resta libero
  // il cecchino ha 1 colpo nel caricatore: ciclo = cadenza + ricarica. Si contano gli spari veri (il caricatore torna a 1)
  let snSpari = 0; const tf0 = G.combat.tryFire.bind(G.combat); G.combat.tryFire = (...a) => { const r = tf0(...a); if (r) snSpari++; return r; };
  p.giveWeapon('sn', 30); p.selectWeapon('sn'); const rate = A.WEAPONS.sn.rate + A.WEAPONS.sn.reload; giraUpdate(rate * 2.2); G.combat.tryFire = tf0;
  prova('cecchino in automatico: spara al suo ritmo, ricarica compresa (2-3 colpi in 2,2 cicli)', snSpari >= 2 && snSpari <= 3, { snSpari, rate });
  prova('l\'automatico non blocca il grilletto vero (firedPress libero)', G.firedPress === false);
  // piccone e costruzione
  p.mode = 'harvest'; const pc = p.mode; /* il piccone e' un modo, non una casella */ let sparato = false; const tf = G.combat.tryFire.bind(G.combat); G.combat.tryFire = (...a) => { sparato = true; return tf(...a); };
  giraUpdate(0.3); prova('col piccone non spara', !sparato, pc);
  p.selectWeapon('ar'); G.build.active = true; sparato = false; giraUpdate(0.3); G.build.active = false; prova('in costruzione non spara', !sparato);
  // bot: nessuno sparo automatico (e' solo del giocatore)
  prova('i bot non hanno l\'opzione (solo il giocatore la legge)', !('sparoAuto111' in b));
  // HTML: casella e finestra
  const html = fs.readFileSync(file, 'utf8');
  prova('casella "Sparo automatico" nelle impostazioni', html.includes('id="sparoSel111"'));
  prova('finestra di benvenuto chiamata dopo il caricamento, una volta per dispositivo', html.includes('benvenuto111(window.__game)') && html.includes("lsGet103('battlecraft_benvenuto111') === '1'"));
  { const v = fs.readFileSync(path.join(path.dirname(file), 'VERSIONE'), 'utf8').trim(); prova('scritta della versione in lobby = VERSIONE', html.includes('<div id="ver">v' + v + '</div>'), v); }
  console.log(ko ? 'FALLITI ' + ko + ' su ' + (ok + ko) : 'TUTTI PASS (' + ok + ')'); process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
