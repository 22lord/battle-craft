// v109: inventario a caselle, raccolta modulare, armi buttate a terra, bus audio delle armi.
// Uso: node test/v109.cjs index.html
// Controlla:
//  - un fucile scarico + uno pieno raccolto = due caselle, ognuna col suo caricatore; si spara e si ricarica
//    solo quello in mano
//  - inventario pieno con un'arma in mano: raccogliere la scambia, la vecchia cade a terra davanti col suo
//    caricatore (lanciata, rimbalza e si posa); col piccone in mano invece non si raccoglie
//  - buttare l'arma (tasto) e riprenderla: stesso caricatore, nessuna munizione regalata
//  - munizioni senza tetto; cure e scudi restano a terra a vita/scudo pieni
//  - alla morte cade tutto: armi coi loro caricatori e munizioni di riserva
//  - i bot non prendono doppioni (niente scambi all'infinito)
//  - audio: spari, ricarica e colpo a vuoto passano dal bus delle armi (0,70), intonazione fra 0,95 e 1,05
const { load, THREE: T } = require('./harness.cjs'); const assert = require('assert'); const vm = require('vm');
(async () => {
  const c = load(process.argv[2]);
  // finto AudioContext che ricorda chi e' collegato a chi
  const param = (v) => ({ value: v, setValueAtTime(x) { this.value = x; }, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  class N { constructor(k) { this.k = k; this.out = []; } connect(n) { this.out.push(n); return n; } disconnect() {} }
  const sorgenti = [];
  class Fake {
    constructor() { this.sampleRate = 8000; this.destination = new N('dest'); this.state = 'running'; this.currentTime = 0; }
    createGain() { const n = new N('gain'); n.gain = param(1); return n; }
    createBiquadFilter() { const n = new N('filtro'); n.frequency = param(350); n.Q = param(1); return n; }
    createStereoPanner() { const n = new N('pan'); n.pan = param(0); return n; }
    createOscillator() { const n = new N('osc'); n.frequency = param(440); n.start = n.stop = () => {}; sorgenti.push(n); return n; }
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len), duration: 1 }; }
    createBufferSource() { const n = new N('src'); n.playbackRate = param(1); n.start = n.stop = () => {}; sorgenti.push(n); return n; }
    decodeAudioData() { return null; }
  }
  c.window.AudioContext = Fake;
  await c.init(); c.window.keysDefaults(); c.document.documentElement = { style: { setProperty() {} } }; const A = c.API;
  const G = Object.create(A.Game.prototype);
  Object.assign(G, { scene: new T.Scene(), physics: new A.Physics(), state: 'title', time: 0, chars: [], bots: [], outfit: 0, playerName: 'Test', canvas: c.document.createElement('canvas'), renderer: { toneMappingExposure: 1, setPixelRatio() {}, setSize() {} }, lobbyCam: new T.PerspectiveCamera(), sens: 1, jumpBuf: 0, zoneTickT: 0, camera: new T.PerspectiveCamera(), stats: { xp: 0 } });
  G.scene.fog = new T.Fog(0, 50, 80); G.world = new A.World(G); G.world.build();
  for (const [key, cls] of Object.entries({ audio: 'AudioSys', fx: 'FX', input: 'Input', cam: 'CameraRig', hud: 'HUD', combat: 'Combat', build: 'BuildSystem', edit: 'EditSystem', harvest: 'Harvest', items: 'Items', zone: 'SafeZone', drop88: 'Drop88' })) G[key] = new A[cls](key === 'input' ? G.canvas : G);
  G.ui = Object.fromEntries(['title', 'end', 'pause', 'pauseNote', 'q1', 'q2'].map((k) => [k, c.document.createElement('div')])); G.bindUI(); G.startMatch();
  const toasts = []; G.hud.toast = (t) => toasts.push(t); G.hud.killfeed = () => {};
  const I = G.items, P = G.physics, p = G.player, INV = vm.runInContext('INV109', c), AU = vm.runInContext('AUDIO109', c);
  for (const b of G.bots) b.alive = false;
  // il giocatore a terra in un punto piano e libero (la piazza della citta')
  p.air88 = null; G.drop88.done = true;
  const x0 = 6, z0 = 18; p.pos.set(x0, P.supportHeight(x0, z0, 60), z0); p.vel.set(0, 0, 0); p.onGround = true; p.yaw = 0; p.mode = 'weapon';
  for (const it of [...I.list]) I.remove(it);
  const ok = {}, r = {};
  const vicino = (type, extra) => I.spawn(type, p.pos.x + 0.3, p.pos.z + 0.3, 0, extra);
  const atterra = () => { for (let i = 0; i < 300 && I.list.some((it) => it.v); i++) I.update(1 / 60); };

  // 1. partenza: 5 caselle, fucile nella prima
  ok.partenza = p.inv.length === INV.caselle && p.inv[0] && p.inv[0].w === 'ar' && p.slot === 0 && p.weapon === 'ar';

  // 2. fucile scarico + fucile pieno = due caselle
  { p.inv[0].mag = 0; const ris0 = p.ammo.light; const it = vicino('ar'); const preso = I.pickup(p, it);
    const ar = p.inv.filter((s) => s && s.w === 'ar');
    r.doppione = { caselle: p.inv.map((s) => s ? s.w + ':' + s.mag : '-').join(' '), riserva: [ris0, p.ammo.light] };
    ok.doppione = preso && ar.length === 2 && ar[0].mag === 0 && ar[1].mag === 30 && p.slot === 0 && p.ammo.light === ris0 + 60; }

  // 3. si spara e si ricarica solo il fucile in mano
  { p.selectSlot109(1); p.fireCd = 0; p.reloading = false; G.combat.tryFire(p, p.eye(), new T.Vector3(0, 0, 1));
    const sparo = p.inv[1].mag === 29 && p.inv[0].mag === 0;
    p.selectSlot109(0); G.combat.startReload(p); for (let i = 0; i < 200; i++) p.tick(1 / 60);
    r.ricarica = p.inv.map((s) => s ? s.w + ':' + s.mag : '-').join(' ');
    ok.slotIndipendenti = sparo && p.inv[0].mag === 30 && p.inv[1].mag === 29; }

  // 4. buttare l'arma e riprenderla: stesso caricatore, niente munizioni regalate
  { p.inv[1].mag = 13; p.selectSlot109(1); const ris = p.ammo.light;
    const buttata = G.lascia109(); const it = I.list[I.list.length - 1];
    const vuota = p.inv[1] === null && p.weapon === null && p.slot === 1;
    const inVolo = !!it.v && I.nearest(p.pos, 3) !== it;   // in volo non si prende
    atterra();
    const d = Math.hypot(it.x - p.pos.x, it.z - p.pos.z), avanti = (it.z - p.pos.z);
    const terra = Math.abs(it.y - (P.supportHeight(it.x, it.z, it.y + 0.3) + 0.25)) < 0.02;
    r.buttata = { distanza: +d.toFixed(2), avanti: +avanti.toFixed(2), mag: it.mag109 };
    p.pos.set(it.x, p.pos.y, it.z - 0.4); const ripresa = I.pickup(p, I.nearest(p.pos, 2.6));
    ok.buttaERiprendi = buttata && vuota && inVolo && !it.v && terra && avanti > 0.8 && d < 4 && ripresa && p.inv[1] && p.inv[1].mag === 13 && p.slot === 1 && p.weapon === 'ar' && p.ammo.light === ris; }

  // 5. inventario pieno: scambio con l'arma in mano, la vecchia cade col suo caricatore
  { p.giveWeapon('sg', 0, 2); p.giveWeapon('sn', 0, 1); p.giveWeapon('ar', 0, 7);
    const pieno = p.liberi109() === 0; p.selectSlot109(2); const vecchia = p.inv[2].w + ':' + p.inv[2].mag;
    const n0 = I.list.length; const it = vicino('sg'); const az = I.azione109(p, it);
    const preso = I.pickup(p, it); const caduta = I.list.find((x) => x !== it && x.v);
    atterra();
    r.scambio = { vecchia, nuova: p.inv[2].w + ':' + p.inv[2].mag, caduta: caduta && caduta.type + ':' + caduta.mag109, suggerimento: az };
    ok.scambio = pieno && az.verbo === 'scambiare' && preso && p.inv[2].w === 'sg' && p.inv[2].mag === 5 && p.slot === 2 && caduta && vecchia === caduta.type + ':' + caduta.mag109 && I.list.length === n0 + 1 - 1 + 1 && p.liberi109() === 0; }

  // 6. inventario pieno col piccone in mano: non si raccoglie, e lo si dice
  { G.enterMode('harvest'); const it = vicino('sn'); const preso = I.pickup(p, it);
    r.picconePieno = I.motivo109(p, it);
    ok.picconePieno = !preso && I.list.includes(it) && /Inventario pieno/.test(I.motivo109(p, it)) && p.liberi109() === 0; I.remove(it); G.enterMode('weapon'); }

  // 7. munizioni senza tetto
  { p.ammo.light = 995; const it = vicino('ammoLight'); ok.munizioni = I.canUse(p, it) && I.pickup(p, it) && p.ammo.light === 1055; }

  // 8. cure e scudi: a vita/scudo pieni restano a terra
  // v114: il medikit ora si porta nello zaino (test/v114.cjs); la regola 'a vita piena resta a terra' vale per la benda
  { p.hp = 100; p.shield = 100; const m = vicino('bandage'), s = vicino('shieldL');
    const bloccati = !I.pickup(p, m) && !I.pickup(p, s) && I.list.includes(m) && I.list.includes(s) && I.motivo109(p, m) === 'Vita già piena';
    p.hp = 40; const cura = I.pickup(p, m) && p.hp === 55; ok.cure = bloccati && cura; I.remove(s); }   // benda: +15

  // 9. bot: niente doppioni
  { const b = G.bots[0]; b.alive = true; b.pos.set(p.pos.x + 1, p.pos.y, p.pos.z); const it = vicino(b.hasWeapon('ar') ? 'ar' : b.inv.find((s) => s).w);
    ok.botNoDoppioni = !I.canUse(b, it); I.remove(it); b.alive = false; }

  // 10. alla morte cade tutto
  { const b = G.bots[1]; b.alive = true; b.pos.set(p.pos.x + 3, p.pos.y, p.pos.z);
    const armi = b.inv.filter((s) => s).map((s) => s.w + ':' + s.mag).sort().join(' ');
    const ris = Object.entries(b.ammo).filter(([, v]) => v > 0).map(([k, v]) => k + ':' + v).sort().join(' ');
    const n0 = I.list.length; G.onDeath(b, null); const nuovi = I.list.slice(n0); atterra();
    const cArmi = nuovi.filter((x) => x.def.kind === 'weapon').map((x) => x.type + ':' + x.mag109).sort().join(' ');
    const tipo = { ammoLight: 'light', ammoShell: 'shell', ammoHeavy: 'heavy' };
    const cRis = nuovi.filter((x) => x.def.kind === 'ammo').map((x) => tipo[x.type] + ':' + x.n109).sort().join(' ');
    r.morte = { armi, cadute: cArmi, riserva: ris, caduteRiserva: cRis };
    ok.morte = armi.length > 0 && armi === cArmi && ris === cRis && nuovi.every((x) => !x.v); }

  // 11. audio: bus delle armi e intonazione
  { const Au = G.audio; Au.muted = false; Au.init(); Au.buf.ar = { duration: 1 }; Au.buf.sg = { duration: 1 };
    const fino = (n, bersaglio) => { const visti = new Set(); const giu = (x) => { if (x === bersaglio) return true; if (visti.has(x)) return false; visti.add(x); return x.out.some(giu); }; return giu(n); };
    sorgenti.length = 0; const rate = [];
    for (let i = 0; i < 400; i++) Au.shot('ar', 1);
    for (const s of sorgenti) rate.push(s.playbackRate.value);
    const tuttiNelBus = sorgenti.every((s) => fino(s, Au.armi));
    sorgenti.length = 0; Au.reload('ar'); Au.dryFire(); const meccanica = sorgenti.length > 0 && sorgenti.every((s) => fino(s, Au.armi));
    sorgenti.length = 0; Au.pickup(); const altriFuori = sorgenti.length > 0 && sorgenti.every((s) => !fino(s, Au.armi) && fino(s, Au.master));
    const busAlMaster = Au.armi.out.includes(Au.master);
    Au.setArmiVol(0.4); const regola = Au.armi.gain.value === 0.4; Au.setArmiVol(AU.armi);
    r.audio = { bus: Au.armi.gain.value, tonoMin: +Math.min(...rate).toFixed(3), tonoMax: +Math.max(...rate).toFixed(3) };
    ok.audio = Au.armi.gain.value === 0.7 && tuttiNelBus && meccanica && altriFuori && busAlMaster && regola && Math.min(...rate) >= 0.95 && Math.max(...rate) <= 1.05 && Math.max(...rate) - Math.min(...rate) > 0.08; }

  console.log(JSON.stringify(r, null, 1));
  console.log(JSON.stringify(ok));
  for (const [k, v] of Object.entries(ok)) assert(v, 'fallito: ' + k);
  console.log('PASS v109');
})().catch((e) => { console.error(e); process.exit(1); });
