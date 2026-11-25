// v107: sistema dei colpi. Uso: node test/colpi107.cjs index.html
// Controlla:
//  - ogni zona (testa, torace, addome, braccio, gamba) viene riconosciuta mirando all'osso giusto
//  - un raggio che passa a 40 cm dal corpo non colpisce; chi spara non colpisce se stesso
//  - formula del danno: base x zona, calo con la distanza fino a falloffMin, difficolta' solo bot->giocatore
//  - scudo: assorbe, si rompe (esito.scudoRotto, hitmarker 'shield'), "perfora" passa alla vita
//  - sparo vero (Combat.tryFire): esito, numeri, uccisione; il precisione spinge il colpito
//  - tempo per raggio contro 30 personaggi (fase larga)
const { load, THREE: T } = require('./harness.cjs'); const assert = require('assert');
(async () => {
  const c = load(process.argv[2]); await c.init(); c.window.keysDefaults(); c.document.documentElement = { style: { setProperty() {} } }; const A = c.API;
  const G = Object.create(A.Game.prototype);
  Object.assign(G, { scene: new T.Scene(), physics: new A.Physics(), state: 'title', time: 0, chars: [], bots: [], outfit: 0, playerName: 'Test', canvas: c.document.createElement('canvas'), renderer: { toneMappingExposure: 1, setPixelRatio() {}, setSize() {} }, lobbyCam: new T.PerspectiveCamera(), sens: 1, jumpBuf: 0, zoneTickT: 0, camera: new T.PerspectiveCamera(), stats: { xp: 0 } });
  G.scene.fog = new T.Fog(0, 50, 80); G.world = new A.World(G); G.world.build();
  for (const [key, cls] of Object.entries({ audio: 'AudioSys', fx: 'FX', input: 'Input', cam: 'CameraRig', hud: 'HUD', combat: 'Combat', build: 'BuildSystem', edit: 'EditSystem', harvest: 'Harvest', items: 'Items', zone: 'SafeZone', drop88: 'Drop88' })) G[key] = new A[cls](key === 'input' ? G.canvas : G);
  G.ui = Object.fromEntries(['title', 'end', 'pause', 'pauseNote', 'q1', 'q2'].map((k) => [k, c.document.createElement('div')])); G.bindUI(); G.startMatch();
  G.hud.killfeed = () => {}; G.hud.toast = () => {};   // il DOM finto non ha prepend
  const P = G.physics, p = G.player, b = G.bots[0], W = A.WEAPONS, r = {}; p.air88 = null; b.air88 = null;
  for (const o of G.bots) if (o !== b) o.alive = false;
  const at = (ch, x, z) => { ch.pos.set(x, 0, z); ch.pos.y = P.supportHeight(x, z, 60); ch.vel.set(0, 0, 0); ch.onGround = true; };
  const X = -60, Z = -8; at(b, X, Z); at(p, X, Z - 5); b.yaw = 0;
  // il bot appena creato puo' essere ancora nella posa del lancio: un secondo fermo a terra lo rimette in piedi
  for (let k = 0; k < 60; k++) { b.onGround = true; b.vel.set(0, 0, 0); b.animate(1 / 60); p.animate(1 / 60); }
  const m = b.model; m.group.updateWorldMatrix(true, true); const wp = (o) => o.getWorldPosition(new T.Vector3());
  const hips = wp(m.hips), chest = wp(m.chest), head = wp(m.head);
  r.ossa_m = Object.fromEntries([['anca', hips], ['petto', chest], ['testa', head], ['ginocchio', wp(m.legL.kn)], ['piede', wp(m.legL.ft)]].map(([k, v]) => [k, [+(v.x - b.pos.x).toFixed(2), +(v.y - b.pos.y).toFixed(2), +(v.z - b.pos.z).toFixed(2)]]));
  // 1. zone: raggio orizzontale da 5 m verso il punto, da davanti (z-) o di lato per il braccio
  const spara = (pt, da) => { const o = pt.clone().add(da), d = pt.clone().sub(o).normalize(); const res = P.raycast(o, d, 20, { chars: true, ignore: p }); return res.char === b ? res.zone : null; };
  /* si spara a ogni parte dal lato da cui sporge dal corpo (in orizzontale, dall'asse anca-petto verso
     il punto): cosi' vale per qualsiasi posa. Il bot appena creato puo' essere raccolto (seduto sui
     talloni): da dietro il busto copre gli stinchi, e il raggio prende giustamente il busto. */
  const davanti = new T.Vector3(0, 0, -5);
  const fuori = (pt, dz) => { const v = new T.Vector3(pt.x - hips.x, 0, pt.z - hips.z); if (v.lengthSq() < 0.01) return dz || davanti; return v.normalize().multiplyScalar(5); };
  const armS = m.armR || m.armL, legS = m.legL, pB = wp(armS.el).lerp(wp(armS.hand), 0.5), pG = wp(legS.kn).lerp(wp(legS.ft), 0.5);
  r.zone = {
    testa: spara(head.clone().add(new T.Vector3(0, 0.08, 0)), davanti),
    torace: spara(hips.clone().lerp(chest, 0.8), davanti),
    addome: spara(hips.clone().lerp(chest, 0.2), davanti),
    braccio: spara(pB, fuori(pB).setY(1.5)),
    gamba: spara(pG, fuori(pG)),
  };
  // 2. mancato e niente colpo a se stessi
  r.sfioraA40cm = spara(hips.clone().lerp(chest, 0.5).add(new T.Vector3(0.6, 0, 0)), davanti);
  { const e = p.eye(), d = new T.Vector3(0, -1, 0); const res = P.raycast(e, d, 3, { chars: true, ignore: p }); r.colpitoSeStesso = res.char === p; }
  // 3. formula
  const D = A.dannoArma107;
  r.danno = { arTorace: D(W.ar, 'chest', 10, p, b), arTesta: D(W.ar, 'head', 10, p, b), arGamba: D(W.ar, 'leg', 10, p, b), arTorace150m: D(W.ar, 'chest', 150, p, b), arTorace100m: D(W.ar, 'chest', 100, p, b), snTesta: D(W.sn, 'head', 300, p, b), pompaPallino: D(W.sg, 'chest', 5, p, b) };
  // 4. scudo con l'esito riusato
  { const h = G.combat.colpo107; b.hp = 100; b.shield = 10; h.reset(); h.victim = b; h.dmg = 23; b.takeDamage(23, p, h);
    r.scudo = { scudoAssorbe: h.shieldDmg, vitaPersa: h.hpDmg, rotto: h.shieldBroken, hp: b.hp };
    b.hp = 100; b.shield = 50; h.reset(); h.pen = 0.5; b.takeDamage(20, p, h); r.perfora50 = { scudo: h.shieldDmg, vita: h.hpDmg }; }
  // 5. sparo vero col fucile: mira al torace, scudo 5 -> si rompe; poi uccisione
  const mira = (pt) => { const e = p.eye(); return pt.clone().sub(e).normalize(); };
  const fuoco = (w, pt) => { p.weapon = w; p.weapons[w] = true; p.mag[w] = 5; p.fireCd = 0; p.reloading = false; p.mode = 'weapon'; p.recoil = 0; p.ads = true; p.vel.set(0, 0, 0);
    const d = mira(pt); let ok = false; for (let k = 0; k < 12 && !ok; k++) { p.fireCd = 0; p.mag[w] = 5; const hp0 = b.hp + b.shield; G.combat.tryFire(p, p.eye(), d); ok = b.hp + b.shield < hp0 || !b.alive; } return ok; };
  b.hp = 100; b.shield = 5; b.alive = true; b.animate(1 / 60);
  const pt = wp(m.hips).lerp(wp(m.chest), 0.7); fuoco('ar', pt);
  const e1 = G.combat.esito107; r.sparoFucile = { colpi: e1.colpi, danno: e1.danno, scudoRotto: e1.scudoRotto, marker: e1.marker() };
  b.hp = 10; b.shield = 0; fuoco('ar', pt); r.sparoUccide = { uccisione: G.combat.esito107.uccisione, marker: G.combat.esito107.marker() };
  // 6. spinta del precisione
  b.alive = true; b.hp = 1000; b.shield = 0; b.vel.set(0, 0, 0); fuoco('sn', wp(m.hips).lerp(wp(m.chest), 0.7)); r.spintaPrecisione = +Math.hypot(b.vel.x, b.vel.z).toFixed(2);
  // 7. tempo SOLO della parte personaggi (il resto del raggio, terreno e griglia, non e' cambiato):
  //    funzione nuova contro la v106 (copiata qui sotto) sugli stessi raggi e gli stessi personaggi
  { const vecchia = new Function('THREE', 'clamp', "function rayCapsule86(o,d,a,b,r){\n  const ba=b.clone().sub(a),oa=o.clone().sub(a),baba=ba.lengthSq();\n  const ray=new THREE.Ray(o,d),v=new THREE.Vector3();let best=Infinity;\n  if(baba<1e-10){if(oa.lengthSq()<=r*r)return 0;return ray.intersectSphere(new THREE.Sphere(a,r),v)?o.distanceTo(v):Infinity;}\n  const h=clamp(oa.dot(ba)/baba,0,1);if(oa.clone().addScaledVector(ba,-h).lengthSq()<=r*r)return 0;\n  const bard=ba.dot(d),baoa=ba.dot(oa),rdoa=d.dot(oa);\n  const A=baba-bard*bard,B=baba*rdoa-baoa*bard,C=baba*oa.lengthSq()-baoa*baoa-r*r*baba,disc=B*B-A*C;\n  if(Math.abs(A)>1e-10&&disc>=0){const t=(-B-Math.sqrt(disc))/A,y=baoa+t*bard;if(t>=0&&y>0&&y<baba)best=t;}\n  for(const p of [a,b])if(ray.intersectSphere(new THREE.Sphere(p,r),v))best=Math.min(best,o.distanceTo(v));return best;\n}\nfunction characterHit86(ch,o,d,maxDist){\n  const m=ch.model;if(!m||!m.head||!m.armL||!m.legL)return null;\n  m.group.updateWorldMatrix(true,true);const wp=b=>b.getWorldPosition(new THREE.Vector3());\n  const chest=wp(m.chest),hips=wp(m.hips),head=wp(m.head).add(new THREE.Vector3(0,0.08,0).applyQuaternion(m.group.quaternion));\n  const parts=[['head',head,head,.145],['body',hips,chest,.19]];\n  for(const side of ['L','R']){const arm=m['arm'+side],leg=m['leg'+side];parts.push(['body',wp(arm.sh),wp(arm.el),.065],['body',wp(arm.el),wp(arm.hand),.055],['body',wp(leg.hp),wp(leg.kn),.10],['body',wp(leg.kn),wp(leg.ft),.08]);}\n  let best=null;for(const [zone,a,b,r]of parts){const t=rayCapsule86(o,d,a,b,r);if(t<maxDist&&(!best||t<best.dist))best={dist:t,zone};}return best;\n}\n" + '; return characterHit86;')(T, (v, a, b) => Math.max(a, Math.min(b, v)));
    const all = G.chars.filter((q) => q !== p); for (const q of all) { q.alive = true; q.air88 = null; at(q, X + (Math.random() - 0.5) * 80, Z + (Math.random() - 0.5) * 80); q.onGround = true; q.animate(1 / 60); }
    const raggi = []; for (let i = 0; i < 600; i++) { const q = all[i % all.length]; raggi.push([new T.Vector3(q.pos.x + 8, q.pos.y + 1.3, q.pos.z + (Math.random() - 0.5)), new T.Vector3(-1, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2).normalize()]); }
    const giro = (fn) => { let n = 0; const t0 = performance.now(); for (const [o, d] of raggi) for (const q of all) if (fn(q, o, d, 40)) n++; return [(performance.now() - t0) * 1000 / raggi.length, n]; };
    giro(A.characterHit86); giro(vecchia);   // riscaldamento
    const [tn, nn] = giro(A.characterHit86), [tv, nv] = giro(vecchia);
    r.personaggiPerRaggio_us = { nuova: +tn.toFixed(1), v106: +tv.toFixed(1), colpiNuova: nn, colpiV106: nv }; }
  // 8. tempo del raggio intero (terreno compreso), per riferimento
  { const all = G.chars.filter((q) => q !== p); for (const q of all) { q.alive = true; at(q, X + (Math.random() - 0.5) * 80, Z + (Math.random() - 0.5) * 80); q.animate(1 / 60); }
    const o = new T.Vector3(), d = new T.Vector3(); const N = 3000; const t0 = performance.now(); let colpiti = 0;
    for (let i = 0; i < N; i++) { const q = all[i % all.length]; o.set(q.pos.x + 8, q.pos.y + 1.3, q.pos.z + (Math.random() - 0.5)); d.set(-1, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2).normalize(); if (P.raycast(o, d, 40, { chars: true, ignore: p }).char) colpiti++; }
    r.personaggi = all.length; r.usPerRaggio = +((performance.now() - t0) * 1000 / N).toFixed(1); r.raggiCheColpiscono = colpiti; }
  console.log(JSON.stringify(r, null, 1));
  assert.deepEqual(r.zone, { testa: 'head', torace: 'chest', addome: 'stomach', braccio: 'arm', gamba: 'leg' }, 'zone');
  assert.equal(r.sfioraA40cm, null, 'raggio che sfiora colpisce'); assert.equal(r.colpitoSeStesso, false, 'colpo a se stessi');
  assert.deepEqual([r.danno.arTorace, r.danno.arTesta, r.danno.arGamba, r.danno.arTorace150m], [23, 37, 18, 10], 'formula');
  assert(r.danno.arTorace100m < 23 && r.danno.arTorace100m > 10);
  assert.deepEqual([r.scudo.scudoAssorbe, r.scudo.vitaPersa, r.scudo.rotto], [10, 13, true], 'scudo');
  assert.deepEqual([r.perfora50.scudo, r.perfora50.vita], [10, 10], 'perfora');
  assert(r.sparoFucile.colpi === 1 && r.sparoFucile.scudoRotto && r.sparoFucile.marker !== '', 'esito sparo');
  assert(r.sparoUccide.uccisione && r.sparoUccide.marker === 'kill', 'uccisione');
  assert(r.spintaPrecisione > 1.5, 'spinta');
  assert(r.personaggiPerRaggio_us.nuova < r.personaggiPerRaggio_us.v106, 'hitbox piu lenta della v106');
  console.log('COLPI PASS');
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
