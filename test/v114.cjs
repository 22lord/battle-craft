// v114: forzieri con bottino per rarita' e medikit da portare. Uso: node test/v114.cjs [file.html]
// Controlla:
//  - estrazione: frequenze delle rarita' vicine ai pesi, armi solo nelle rarita' ammesse, dati restituiti
//  - il modello vero si carica, ha il coperchio separato ed e' leggero
//  - forzieri piazzati su terreno piano senza toccare niente; si aprono col tasto guardandoli o standoci davanti,
//    UNA volta sola; un muro in mezzo blocca il raggio; il coperchio ruota; esce UN'arma con la sua rarita'
//  - l'arma raccolta porta la rarita' nella casella e il danno ne tiene conto; buttata a terra la conserva
//  - medikit: si portano fino al massimo, si usano col tasto, curano dopo il tempo giusto senza superare
//    la vita massima, si interrompono sparando o cambiando modalita'; i bot li usano subito
const { load, THREE: T } = require('./harness.cjs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
let ok = 0, ko = 0; const prova = (nome, cond, info) => { if (cond) { ok++; console.log('PASS', nome); } else { ko++; console.log('FAIL', nome, info !== undefined ? JSON.stringify(info) : ''); } };
const semeRng = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
(async () => {
  const c = load(file); await c.init(); c.window.keysDefaults(); c.document.documentElement = { style: { setProperty() {} } }; const A = c.API;
  prova('classi v114 presenti', !!(A.Forzieri114 && A.Medikit114 && A.spargiMedikit114));
  const C = A.Forzieri114.cfg;

  // ---------- estrazione ----------
  { const rng = semeRng(12345), N = 20000, conta = {}, armi = {}; let campiOk = true, dannoOk = true;
    for (let i = 0; i < N; i++) {
      const b = C.estraiArma114(rng); conta[b.rarita] = (conta[b.rarita] || 0) + 1; (armi[b.arma] = armi[b.arma] || new Set()).add(b.rarita);
      if (!(b.arma && b.nome && b.nomeRarita && b.colore !== undefined && b.caricatore > 0 && b.munizioni > 0 && b.tipoMunizioni)) campiOk = false;
      if (b.danno !== Math.max(1, Math.round(A.WEAPONS[b.arma].dmg * C.RARITA114[b.rarita].danno))) dannoOk = false;
    }
    let tot = 0; for (const k in C.RARITA114) tot += C.RARITA114[k].peso;
    const scarti = Object.keys(C.RARITA114).map((k) => Math.abs((conta[k] || 0) / N - C.RARITA114[k].peso / tot));
    prova('frequenze delle rarita\' entro 1,5 punti dai pesi (20.000 estrazioni)', Math.max(...scarti) < 0.015, { conta });
    prova('ogni arma esce solo nelle rarita\' ammesse', Object.entries(armi).every(([w, set]) => [...set].every((r) => C.BOTTINO114[w].rarita.includes(r))), Object.fromEntries(Object.entries(armi).map(([w, s]) => [w, [...s]])));
    prova('il fucile di precisione esce (epico/leggendario)', armi.sn && armi.sn.size > 0);
    prova('i dati dell\'arma estratta sono completi', campiOk);
    prova('danno restituito = danno base x rarita\'', dannoOk);
  }

  // ---------- modello vero ----------
  { const m = await C.caricaForziere114(); let tri = 0; if (m) m.traverse((o) => { if (o.isMesh) tri += o.geometry.index.count / 3; });
    const lid = m && m.getObjectByName('Coperchio');
    prova('il modello del forziere si carica e ha il coperchio separato', !!lid);
    prova('modello leggero (meno di 12.000 triangoli)', tri > 2000 && tri < 12000, tri);
    prova('la cerniera sta dietro e in alto (coperchio ruota attorno allo spigolo posteriore)', lid && lid.position.z < -0.4 && Math.abs(lid.position.y - 0.66) < 0.01, lid && lid.position.toArray());
  }

  // ---------- partita ----------
  const G = Object.create(A.Game.prototype);
  Object.assign(G, { sun: new T.DirectionalLight(), scene: new T.Scene(), physics: new A.Physics(), state: 'title', time: 0, chars: [], bots: [], outfit: 0, playerName: 'Test', canvas: c.document.createElement('canvas'), renderer: { toneMappingExposure: 1, setPixelRatio() {}, setSize() {} }, lobbyCam: new T.PerspectiveCamera(), sens: 1, jumpBuf: 0, zoneTickT: 0, camera: new T.PerspectiveCamera(), stats: { xp: 0 } });
  G.scene.fog = new T.Fog(0, 50, 80); G.world = new A.World(G); G.world.build();
  for (const [key, cls] of Object.entries({ audio: 'AudioSys', fx: 'FX', input: 'Input', cam: 'CameraRig', hud: 'HUD', combat: 'Combat', build: 'BuildSystem', edit: 'EditSystem', harvest: 'Harvest', items: 'Items', zone: 'SafeZone', drop88: 'Drop88', forzieri114: 'Forzieri114', medikit114: 'Medikit114' })) G[key] = new A[cls](key === 'input' ? G.canvas : G);
  G.ui = Object.fromEntries(['title', 'end', 'pause', 'pauseNote', 'q1', 'q2'].map((k) => [k, c.document.createElement('div')])); G.bindUI(); G.startMatch();
  const toast = []; G.hud.killfeed = () => {}; G.hud.toast = (t) => toast.push(t); G.hud.update = () => {}; G.hud.refreshHotbar = () => {};
  const P = G.physics, p = G.player, F = G.forzieri114; p.air88 = null; G.drop88.clear(); G.drop88.elapsed = 999;
  for (const b of G.bots) { b.alive = false; b.air88 = null; }
  const medATerra = G.items.list.filter((it) => it.type === 'medkit').length;
  prova('medikit sparsi a terra (prima non uscivano mai)', medATerra >= 6, medATerra);

  prova('forzieri piazzati alla partenza', F.lista.length >= 10, F.lista.length);
  F.piazza(semeRng(7));   // da qui in poi piazzamento ripetibile
  prova('forzieri piazzati sulla mappa (almeno 10)', F.lista.length >= 10, F.lista.length);
  { let libero = true, piano = true, sopraMare = true, appoggio = true; const tmp = [], dentro = [], storti = [];
    for (const f of F.lista) P.remove(f.col);   // si misura il mondo senza i forzieri
    for (const f of F.lista) {
      // dentro = collisioni che entrano nel volume del forziere (un pavimento su cui poggia lo tocca solo sotto: non conta)
      const q = P.query(f.col.min, f.col.max, tmp).filter((o) => o.max.y > f.y + 0.02); if (q.length) { libero = false; dentro.push([f.x, f.z, q.map((o) => o.tag)]); }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = sx < 0 ? f.col.min.x : f.col.max.x, z = sz < 0 ? f.col.min.z : f.col.max.z; const d = P.supportHeight(x, z, f.y + 0.3) - f.y; if (Math.abs(d) > 0.13) { piano = false; storti.push([f.x, f.z, d]); } }
      const sotto = P.query(new T.Vector3(f.col.min.x, f.y - 0.1, f.col.min.z), new T.Vector3(f.col.max.x, f.y + 0.02, f.col.max.z), tmp);
      if (sotto.some((o) => o.tag !== 'static')) appoggio = false;
      if (f.y < A.MARE + 0.1) sopraMare = false;
    }
    for (const f of F.lista) P.add(f.col);
    prova('nessun forziere dentro muri, case o altri oggetti fissi', libero, dentro);
    prova('ogni forziere poggia su terreno piano (angoli entro 13 cm)', piano, storti);
    prova('nessun forziere sopra rocce o auto (solo terreno o pavimenti)', appoggio);
    prova('nessun forziere in acqua', sopraMare);
    let minD = 1e9; for (let i = 0; i < F.lista.length; i++) for (let j = i + 1; j < F.lista.length; j++) minD = Math.min(minD, Math.hypot(F.lista[i].x - F.lista[j].x, F.lista[i].z - F.lista[j].z));
    prova('forzieri distanti fra loro', minD >= C.FORZIERE114.distanza - 0.01, minD);
  }

  // un forziere di prova su un prato noto (lo stesso punto aperto del test v111), girato verso +z
  const f = F.aggiungi(-60, P.supportHeight(-60, -15, 60), -15, 0);
  const dav = (f2, d) => { const s = Math.sin(f2.rot), co = Math.cos(f2.rot); return [f2.x + s * d, f2.z + co * d, Math.atan2(-s, -co)]; };   // punto davanti (z+ del modello) e yaw che guarda il forziere
  const metti = (d) => { const [x, z, yaw] = dav(f, d); p.pos.set(x, P.supportHeight(x, z, f.y + 1.5), z); p.vel.set(0, 0, 0); p.yaw = yaw; p.onGround = true; };
  const guarda = (h = 0.45) => { const t = new T.Vector3(f.x, f.y + h, f.z); const o = new T.Vector3(p.pos.x, p.pos.y + 1.7, p.pos.z).addScaledVector(new T.Vector3(p.pos.x - f.x, 0, p.pos.z - f.z).normalize(), 2.2); G.cam.pos.copy(o); G.cam.dir.subVectors(t, o).normalize(); };
  const lontano = () => { G.cam.pos.set(p.pos.x, p.pos.y + 30, p.pos.z); G.cam.dir.set(0, 1, 0); };
  G.state = 'playing';

  metti(2.0); lontano();
  prova('a 2 m senza guardarlo: niente forziere (oltre la distanza "vicino")', F.bersaglio(p) === null);
  guarda(); prova('a 2 m guardandolo (raggio dalla telecamera): e\' il bersaglio', F.bersaglio(p) === f);
  { // muro fra telecamera e forziere
    const m = new T.Vector3().lerpVectors(G.cam.pos, new T.Vector3(f.x, f.y + 0.45, f.z), 0.5);
    const muro = { type: 'box', min: new T.Vector3(m.x - 0.15, m.y - 2, m.z - 0.15), max: new T.Vector3(m.x + 0.15, m.y + 2, m.z + 0.15) }; P.add(muro);
    prova('muro in mezzo: il raggio non lo prende', F.bersaglio(p) === null); P.remove(muro);
  }
  metti(5); guarda(); prova('troppo lontano (5 m) anche guardandolo: no', F.bersaglio(p) === null);
  metti(f.box.max.z - f.box.min.z > 0 ? 1.0 : 1.0); lontano(); prova('davanti a 1 m senza mirare: e\' il bersaglio', F.bersaglio(p) === f);
  p.yaw += Math.PI; prova('girato di spalle: no', F.bersaglio(p) === null); p.yaw -= Math.PI;

  // apertura col tasto
  const armi0 = G.items.list.filter((it) => it.def.kind === 'weapon').length;
  G.onKeyDown(A.KEYS.pickup);
  prova('tasto Raccogli: il forziere si apre', f.aperto === true && !!f.bottino, f.bottino);
  const b = f.bottino;
  prova('apri() restituisce i dati dell\'arma (anche come F.ultimo)', F.ultimo === b && b.arma in C.BOTTINO114);
  prova('un secondo apri() sullo stesso forziere non estrae nulla', F.apri(f, p) === null && f.bottino === b);
  G.onKeyDown(A.KEYS.pickup);
  prova('un secondo tasto non riapre (non e\' piu\' un bersaglio)', F.bersaglio(p) !== f && f.bottino === b);
  for (let k = 0; k < 90; k++) { G.items.update(1 / 60); F.update(1 / 60); }
  const nuove = G.items.list.filter((it) => it.def.kind === 'weapon');
  prova('e\' uscita UN\'arma sola', nuove.length === armi0 + 1, { armi0, dopo: nuove.length });
  const it = nuove.find((o) => o.rar114);
  prova('l\'arma uscita e\' quella estratta, con la sua rarita\'', it && it.type === b.arma && it.rar114 === b.rarita, it && { t: it.type, r: it.rar114 });
  prova('l\'arma e\' atterrata (non e\' piu\' in volo) vicino al forziere', it && !it.v && Math.hypot(it.x - f.x, it.z - f.z) < 4, it && { x: it.x - f.x, z: it.z - f.z, v: !!it.v });
  prova('il coperchio e\' aperto di ~' + C.FORZIERE114.angolo + ' gradi', Math.abs(-f.lid.rotation.x * 180 / Math.PI - C.FORZIERE114.angolo) < 1, f.lid.rotation.x * 180 / Math.PI);
  prova('nome a terra con la rarita\'', G.items.nome109(it).includes(C.RARITA114[b.rarita].nome), G.items.nome109(it));

  // raccolta: la casella porta la rarita'
  p.inv.fill(null); p.slot = -1; p.weapon = null;
  p.pos.set(it.x, it.y - 0.25, it.z);
  prova('raccolta dell\'arma del forziere', G.items.pickup(p, it));
  const s0 = p.inv.find((s) => s); prova('la casella ha la rarita\'', s0 && s0.w === b.arma && s0.rar === b.rarita, s0);
  prova('moltiplicatore del danno della casella', C.moltRarita114(s0) === C.RARITA114[b.rarita].danno && C.moltRarita114({ w: 'ar', mag: 1 }) === 1);
  { const k = p.inv.indexOf(s0); p.selectSlot109(k); G.lascia109(k);
    const at = G.items.list[G.items.list.length - 1]; prova('buttata a terra conserva la rarita\'', at && at.rar114 === b.rarita); }

  // danno vero: colpo di precisione leggendario su un bot fermo
  { const bot = G.bots[0]; bot.alive = true; bot.brain = null; bot.hp = 1e6; bot.shield = 0;
    const x = f.x + 4, z = f.z + 9; bot.pos.set(x, P.supportHeight(x, z, f.y + 2), z); bot.vel.set(0, 0, 0); bot.onGround = true;   // di lato al forziere: niente in mezzo
    p.inv.fill(null); p.slot = -1; p.weapon = null; p.pos.set(f.x + 4, P.supportHeight(f.x + 4, f.z, f.y + 2), f.z); p.yaw = Math.atan2(bot.pos.x - p.pos.x, bot.pos.z - p.pos.z);
    for (let k = 0; k < 20; k++) { bot.tick(1 / 60); bot.animate(1 / 60); p.tick(1 / 60); p.animate(1 / 60); }
    p.giveWeapon('sn', 10, undefined, undefined, 'leg'); p.selectWeapon('sn'); p.mode = 'weapon'; p.ads = true;
    let colpito = null; const cfg0 = A.WEAPONS.sn.adsSpread; A.WEAPONS.sn.adsSpread = 0;
    for (let tent = 0; tent < 4 && !colpito; tent++) {
      bot.model.group.updateWorldMatrix(true, true); const h = new T.Vector3(); bot.model.head.getWorldPosition(h); const t = h.lerp(new T.Vector3(bot.pos.x, bot.pos.y + 0.9, bot.pos.z), 0.45);
      const o = p.eye().clone(); const d = t.clone().sub(o).normalize(); p.fireCd = 0; p.reloading = false; p.cur109().mag = 1; p.recoil = 0;
      const hp0 = bot.hp; G.combat.tryFire(p, o, d); if (bot.hp < hp0) colpito = { danno: hp0 - bot.hp, zona: G.combat.colpo107.zone, dist: G.combat.colpo107.dist };
    }
    A.WEAPONS.sn.adsSpread = cfg0;
    const atteso = colpito && Math.max(1, Math.round(A.dannoArma107(A.WEAPONS.sn, colpito.zona, colpito.dist, p, bot) * C.RARITA114.leg.danno));
    prova('colpo con arma leggendaria: danno = danno base x ' + C.RARITA114.leg.danno, colpito && colpito.danno === atteso, { colpito, atteso });
    bot.alive = false;
  }

  // ---------- medikit ----------
  const M = G.medikit114, MK = C.MEDIKIT114;
  p.inv.fill(null); p.slot = -1; p.weapon = null; p.giveWeapon('ar', 60); p.selectWeapon('ar'); p.mode = 'weapon';
  p.hp = 30; p.medikit114 = 0; toast.length = 0;
  prova('senza medikit non parte', M.inizia(p) === 'Nessun medikit' && !M.attivo());
  for (let k = 0; k < MK.max; k++) { const m = G.items.spawn('medkit', p.pos.x, p.pos.z, 0); G.items.pickup(p, m); }
  prova('si raccolgono fino a ' + MK.max + ' medikit, senza consumarli', p.medikit114 === MK.max && p.hp === 30, p.medikit114);
  { const m = G.items.spawn('medkit', p.pos.x, p.pos.z, 0); prova('oltre il massimo il medikit resta a terra', !G.items.canUse(p, m) && !G.items.pickup(p, m) && G.items.list.includes(m)); G.items.remove(m); }
  G.onKeyDown(A.KEYS.medikit);
  prova('tasto ' + A.KEYS.medikit + ': comincia la cura', A.KEYS.medikit === 'KeyT' && M.attivo());
  for (let k = 0; k < Math.floor(MK.tempo * 60) - 6; k++) M.update(1 / 60);
  prova('prima del tempo la vita non cambia', p.hp === 30 && p.medikit114 === MK.max, { hp: p.hp, n: p.medikit114 });
  for (let k = 0; k < 12; k++) M.update(1 / 60);
  prova('dopo ' + MK.tempo + ' s: +' + MK.cura + ' vita e un medikit in meno', p.hp === 30 + MK.cura && p.medikit114 === MK.max - 1 && !M.attivo(), { hp: p.hp, n: p.medikit114 });
  p.hp = 90; M.inizia(p); for (let k = 0; k < MK.tempo * 60 + 5; k++) M.update(1 / 60);
  prova('a 90 di vita il medikit porta a ' + p.maxHp + ', non oltre', p.hp === p.maxHp, p.hp);
  const n1 = p.medikit114;
  prova('a vita piena non parte e non consuma', M.inizia(p) === 'Vita già piena' && p.medikit114 === n1);
  p.hp = 40; M.inizia(p); for (let k = 0; k < 30; k++) M.update(1 / 60);
  p.fireCd = 0; p.reloading = false; p.cur109().mag = 10; G.combat.tryFire(p, p.eye().clone(), new T.Vector3(0, 0, 1));
  prova('sparare interrompe la cura (vita e medikit restano)', !M.attivo() && p.hp === 40 && p.medikit114 === n1);
  M.inizia(p); for (let k = 0; k < 10; k++) M.update(1 / 60); p.setMode('harvest'); M.update(1 / 60);
  prova('cambiare modalita\' interrompe la cura', !M.attivo() && p.hp === 40 && p.medikit114 === n1); p.setMode('weapon');
  p.heal(500); prova('heal() non supera mai la vita massima', p.hp === p.maxHp);
  { const bot = G.bots[1]; bot.alive = true; bot.hp = 20; const m = G.items.spawn('medkit', bot.pos.x, bot.pos.z, 0);
    prova('i bot usano il medikit subito (non lo portano)', G.items.pickup(bot, m) && bot.hp === 20 + MK.cura && bot.medikit114 === 0, { hp: bot.hp }); bot.alive = false; }

  // ---------- fine partita ----------
  const cols = F.lista.map((o) => o.col); G.resetDynamic();
  prova('reset: forzieri e collisioni tolti', F.lista.length === 0 && cols.every((o) => !P.all.has(o)));

  console.log(`\n${ok} PASS, ${ko} FAIL`); process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
