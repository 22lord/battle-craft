// v110 — fase 1: luce, cielo, post-processing. Uso: node test/v110.cjs [file.html]
// Cosa si puo' misurare senza WebGL: chunk degli shader, livelli di qualita', ciclo del giorno (continuita',
// sole del cielo = luce, notte leggibile), modello analitico contro la misura sul render, F3, bloom,
// mappa del mondo non spostata. L'aspetto si verifica coi render (tools/browser/fase.cjs).
const { load, THREE: T } = require('./harness.cjs');
const L = require('../tools/luce110.cjs');
const fs = require('fs'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'index.html');
let ok = 0, ko = 0; const prova = (nome, cond, info) => { if (cond) { ok++; console.log('PASS', nome); } else { ko++; console.log('FAIL', nome, info !== undefined ? JSON.stringify(info) : ''); } };
(async () => {
  const c = load(file); await c.init(); const A = c.API, html = fs.readFileSync(file, 'utf8');
  const C = c.THREE.ShaderChunk;
  // --- curva e nebbia ---
  prova('CustomToneMapping = ACES + grading', /vec3 CustomToneMapping\( vec3 color \) \{\s*color = ACESFilmicToneMapping\( color \);/.test(C.tonemapping_pars_fragment));
  prova('nebbia d\'altezza nei chunk', C.fog_vertex.includes('vFogY110') && C.fog_fragment.includes('hf110') && C.fog_pars_fragment.includes('vFogY110'));
  prova('grading uguale nel gioco e nel modello analitico', JSON.stringify(A.GRADING110) === JSON.stringify(L.GR), [A.GRADING110, L.GR]);
  prova('niente piu\' filtro CSS sul canvas (il grading sta nella curva)', !html.includes('filter:saturate(1.14)'));
  prova('importmap con gli addon della stessa versione', html.includes('"three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"'));
  // --- livelli di qualita' ---
  const P = A.POST110, Q = A.QUALITY;
  prova('Bassa: niente post-processing, ombre spente, dpr 1 come prima', P.low.post === false && Q.low.shadow === 0 && Q.low.dpr === 1);
  prova('Media: post con bloom e FXAA, AO spenta di serie', P.med.post && P.med.bloom && P.med.aa === 'fxaa' && !P.med.ao);
  prova('Alta: AO e FXAA (SMAA solo da F3: costa +4 ms a 1080p)', P.high.post && P.high.ao && P.high.aa === 'fxaa');
  { // Post110 senza WebGL2 non si accende; in Bassa non parte nessun import
    const G = { renderer: { capabilities: { isWebGL2: false } }, state: 'playing' }; const p = new A.Post110(G); p.setQuality('high');
    prova('senza WebGL2 il post resta spento (si disegna come prima)', p.attivo() === false);
    const G2 = { renderer: { capabilities: { isWebGL2: true }, getDrawingBufferSize: (v) => v.set(4, 4) }, state: 'playing' }; const p2 = new A.Post110(G2); p2.setQuality('low');
    prova('Bassa: post spento e SMAA mai caricato', p2.attivo() === false && p2.smaaStato === '');
    p2.setQuality('med'); prova('Media: post acceso in partita, spento in lobby', p2.attivo() === true && ((G2.state = 'title'), p2.attivo() === false));
    G2.state = 'playing'; p2.forza.post = false; prova('F3 puo\' spegnere il post', p2.attivo() === false);
  }
  { // bloom: i materiali segnati si accendono solo col bloom
    const m = new T.MeshBasicMaterial({ color: 0x808080 }); const base = m.color.r; A.hdr110(m, 3);
    A.hdrAccendi110(true); const acceso = m.color.r; A.hdrAccendi110(false);
    prova('materiale HDR: x3 col bloom, uguale a prima senza', Math.abs(acceso - base * 3) < 1e-6 && Math.abs(m.color.r - base) < 1e-6, [base, acceso, m.color.r]);
  }
  // --- ciclo del giorno ---
  const G = { scene: new T.Scene(), sun: new T.DirectionalLight(0xffffff, 1), hemi: new T.HemisphereLight(), amb110: new T.AmbientLight(), renderer: { toneMappingExposure: 1 }, state: 'playing' };
  G.scene.fog = new T.Fog(0, 50, 80); G.sun.shadow.mapSize.set(1024, 1024); const sc = G.sun.shadow.camera; sc.left = -42; sc.right = 42; sc.top = 42; sc.bottom = -42;
  G.world = { sky: { material: { uniforms: { uZen: { value: new T.Color() }, uHor: { value: new T.Color() }, uGlow: { value: new T.Color() }, uSole: { value: new T.Vector3() }, uSoleCol: { value: new T.Color() }, uDisco: { value: 0 }, uStelle: { value: 0 } } } } };
  const g = new A.Giorno110(G), tgt = new T.Vector3(10, 5, -3);
  let saltoI = 0, saltoDir = 0, maxScarto = 0, minEsp = 9, prevI = null, prevD = new T.Vector3(), elevPrec = null, saltoElev = 0, notteMinEmi = 9, giornoMaxI = 0;
  for (let i = 0; i <= 2000; i++) {
    g.u = i / 2000 % 1; g.applica(tgt); const I = G.sun.intensity, d = g.dirLuce.clone(), so = A.sole110(g.u);
    if (prevI !== null) { saltoI = Math.max(saltoI, Math.abs(I - prevI)); const ang = Math.acos(Math.min(1, d.dot(prevD))) * 180 / Math.PI; if (ang > 2) saltoDir = Math.max(saltoDir, Math.min(I, prevI)); saltoElev = Math.max(saltoElev, Math.abs(so.elev - elevPrec)); }
    if (so.elev > A.GIORNO110.elevOmbreMin + 1) maxScarto = Math.max(maxScarto, Math.acos(Math.min(1, d.dot(G.world.sky.material.uniforms.uSole.value))) * 180 / Math.PI);
    if (so.elev < -10) { notteMinEmi = Math.min(notteMinEmi, G.hemi.intensity); minEsp = Math.min(minEsp, G.renderer.toneMappingExposure); }
    giornoMaxI = Math.max(giornoMaxI, I); prevI = I; prevD.copy(d); elevPrec = so.elev;
  }
  prova('sole: niente salti di elevazione lungo il giro (anche all\'alba)', saltoElev < 0.5, saltoElev);
  prova('intensita\' della luce continua (passo 1/2000 di giro)', saltoI < 0.1, saltoI);
  prova('la luce cambia direzione (sole <-> luna) solo quando e\' spenta', saltoDir < 0.05, saltoDir);
  prova('disco del sole nel cielo = direzione delle ombre (entro 0,3°)', maxScarto < 0.3, maxScarto);
  prova('notte leggibile: luce diffusa >= 1,5 ed esposizione >= 1,25', notteMinEmi >= 1.5 && minEsp >= 1.25, [notteMinEmi, minEsp]);
  prova('orologio: alba 06:00, tramonto 18:00', A.ora110(A.GIORNO110.alba + 1e-6) === '06:00' && A.ora110(A.GIORNO110.alba + A.GIORNO110.giorno + 1e-6) === '18:00', [A.ora110(A.GIORNO110.alba + 1e-6), A.ora110(A.GIORNO110.alba + A.GIORNO110.giorno + 1e-6)]);
  { // ombre ferme: due bersagli a meno di mezzo texel danno la stessa luce
    const d = new T.Vector3(0.3, 0.8, 0.5).normalize(), s1 = G.sun; A.stableSun110(s1, new T.Vector3(3, 1, 4), d, 150); const p1 = s1.position.clone();
    A.stableSun110(s1, new T.Vector3(3.01, 1, 4.01), d, 150); prova('ombra ancorata ai texel (spostamento di 1 cm = stessa posizione)', p1.distanceTo(s1.position) < 1e-9, p1.distanceTo(s1.position));
  }
  { // il tempo scorre e si puo' fermare
    g.fisso = null; g.u = 0.2; g.update(A.GIORNO110.durata / 10, tgt); const avanti = Math.abs(g.u - 0.3) < 1e-9; g.fisso = 0.5; g.update(5, tgt);
    prova('il giorno avanza (1/10 di giro in 1/10 della durata) e si puo\' fissare', avanti && g.u === 0.5, g.u);
  }
  // --- modello analitico (sezione 3 di CONTESTO) contro la misura ---
  { // u = 0,33 (mezzogiorno), pelle con la normale verso la luce. Misura: render del 25/11/2026 con tools/browser/pelle110.cjs,
    // avambracci rivolti in su, mediana 238/226/220 (sole fff0da 3,6). Il modello deve stare entro 6 livelli.
    const k = { sole: { dir: L.norm([0.189, 0.897, -0.399]), col: L.hex(0xfff0da), i: 3.6 }, emi: { cielo: L.hex(0xbfe0ff), terra: L.hex(0x8fa070), i: 1.6 }, amb: { col: L.hex(0x9cc4ff), i: 0.25 }, env: [0.12, 0.20, 0.28] };
    const px = L.pixel([0.700, 0.502, 0.475], k.sole.dir, k, 1.0), mis = [238, 226, 220];
    prova('modello analitico: pelle al sole entro 6 livelli dal render', px.every((v, i) => Math.abs(v - mis[i]) <= 6), { previsto: px, misurato: mis });
  }
  { // ombre mai nere: per ogni chiave del giro, pietra (albedo 0,35) in ombra piena
    const peggio = A.GIORNO110.chiavi.map((k) => { const h = (x) => L.hex(parseInt(x, 16)); const luci = { sole: { dir: [0, 1, 0], col: h(k.sole), i: 0, ombra: true }, emi: { cielo: h(k.cielo), terra: h(k.terra), i: k.emiI }, amb: { col: h(k.amb), i: k.ambI }, env: [0.03, 0.04, 0.06] };
      const p = L.pixel([0.35, 0.33, 0.30], [1, 0, 0], luci, k.esp); return { u: k.u, L: Math.round(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) }; });
    const giorno = peggio.filter((x) => x.u <= 0.7), notte = peggio.filter((x) => x.u > 0.7);
    prova('ombre mai nere: muro in ombra >= 70 di giorno, >= 45 di notte (0-255)', giorno.every((x) => x.L >= 70) && notte.every((x) => x.L >= 45), peggio);
  }
  // --- F3 ---
  {
    const G3 = { renderer: { getContext: () => ({ getExtension: () => null }) } }; const pf = new A.Perf110(G3);
    const fk = Object.create(A.Game.prototype); fk.perf110 = pf; fk.state = 'title'; let prevenuto = false;
    fk.onKeyDown('F3', { preventDefault: () => { prevenuto = true; } });
    prova('F3 apre il pannello (anche in lobby) e blocca la ricerca del browser', pf.on === true && pf.el.style.display === 'block' && prevenuto);
    fk.onKeyDown('F3', {}); prova('F3 di nuovo lo chiude', pf.on === false && pf.el.style.display === 'none');
  }
  // --- mondo non spostato: le nuvole usano il generatore del mondo come prima ---
  {
    const Gw = Object.create(A.Game.prototype); Object.assign(Gw, { scene: new T.Scene(), physics: new A.Physics(), state: 'title', chars: [], bots: [] }); Gw.scene.fog = new T.Fog(0, 50, 80);
    const W = new A.World(Gw); W.build();
    prova('16 nuvole col materiale nuovo', W.clouds.children.length === 16 && W.clouds.children.every((m) => m.material === W.nuvole110));
    // v115: le auto lungo i sentieri si aggiungono dopo la vegetazione: tolte quelle, la mappa e' identica alla v109
    prova('mappa identica alla v109 (1656 oggetti raccoglibili + auto dei sentieri v115, 31 case)', W.harvestables.length - (W.autoStrade115N || 0) === 1656 && W.houses92.length === 31, [W.harvestables.length, W.autoStrade115N, W.houses92.length]);
    prova('cielo coi parametri del ciclo (uSole tenuto per la prova grafica)', !!(W.sky.material.uniforms.uZen && W.sky.material.uniforms.uSole && W.sky.material.toneMapped !== false));
  }
  console.log(ko ? 'FALLITI ' + ko + ' su ' + (ok + ko) : 'TUTTI PASS (' + ok + ')'); process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
