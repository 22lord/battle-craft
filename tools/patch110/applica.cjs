// Patch v110 (fase 1: luce, cielo, post-processing). Uso: node tools/patch110/applica.cjs
// Ogni sostituzione controlla che il testo cercato compaia UNA volta sola (trappola 19).
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', '..', 'index.html');
let s = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');   // git (autocrlf) lo estrae in CRLF: si lavora in LF, come e' salvato nel repo
const sost = (da, a, nome) => { const n = s.split(da).length - 1; if (n !== 1) throw new Error(nome + ': trovato ' + n + ' volte'); s = s.replace(da, () => a); console.log('ok', nome); };
const blocco = fs.readFileSync(path.join(__dirname, 'blocco.js'), 'utf8');

sost('"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}',
  '"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}', 'importmap');
sost('outline:none;filter:saturate(1.14) contrast(1.05)}', 'outline:none}', 'filtro CSS del canvas');
sost('\nclass Game {\n', '\n' + blocco + '\nclass Game {\n', 'blocco v110');
sost('r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.LinearToneMapping; r.toneMappingExposure = 0.86;',
  'r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.CustomToneMapping; r.toneMappingExposure = 1.0; r.info.autoReset = false; /* v110: ACES + grading (CustomToneMapping), info azzerata a mano a ogni fotogramma (F3) */', 'renderer');
sost('this.scene.add(new THREE.AmbientLight(0x5a8fd6, 0.22));', 'this.amb110 = new THREE.AmbientLight(0x5a8fd6, 0.22); this.scene.add(this.amb110);', 'luce ambiente');
sost('    this.makeEnvironment();\n', '    this.makeEnvironment();\n    this.giorno110 = new Giorno110(this); this.post110 = new Post110(this); this.perf110 = new Perf110(this); this.giorno110.applica(this.world.playerSpawn);\n', 'creazione v110');

// mappa d'ambiente rifatta col colore del cielo del momento
const envDa = s.indexOf('  makeEnvironment() {'), envA = s.indexOf("    } catch (e) { console.warn('environment non disponibile', e); }\n  }", envDa);
if (envDa < 0 || envA < 0 || s.indexOf('  makeEnvironment() {', envDa + 1) >= 0) throw new Error('makeEnvironment');
s = s.slice(0, envDa) + `  makeEnvironment() {
    /* v110: stessa sfera sfumata di prima, ma coi colori del ciclo del giorno: rifatta da
       rifaiAmbiente110 ogni ~15 s di gioco (Giorno110). uK = 0,32 come prima. */
    try {
      this.pmrem110 = new THREE.PMREMGenerator(this.renderer); const es = this.envScene110 = new THREE.Scene();
      this.envMat110 = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uZen: { value: new THREE.Color(0x2f7fe6) }, uHor: { value: new THREE.Color(0xb4dcff) }, uTerra: { value: new THREE.Color(0x8fa070) }, uK: { value: 0.32 } },
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 uZen, uHor, uTerra; uniform float uK; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(uHor, uZen, pow(h, 0.6)) : mix(uHor, uTerra * 0.6, smoothstep(0.0, -0.3, h)); gl_FragColor = vec4(c * uK, 1.0); }' });
      es.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), this.envMat110));
      this.rifaiAmbiente110(null);
` + s.slice(envA);
sost("    } catch (e) { console.warn('environment non disponibile', e); }\n  }",
  "    } catch (e) { console.warn('environment non disponibile', e); }\n  }\n  rifaiAmbiente110(k) {\n    if (!this.pmrem110) return; const u = this.envMat110.uniforms; if (k) { u.uZen.value.copy(k._zen); u.uHor.value.copy(k._hor); u.uTerra.value.copy(k._terra); }\n    const old = this.envRT110; this.envRT110 = this.pmrem110.fromScene(this.envScene110, 0.04); this.scene.environment = this.envRT110.texture; if (old) old.dispose();\n  }", 'rifaiAmbiente110');

// cielo e nuvole
const skyDa = s.indexOf('  makeSky() {'), skyFine = '    this.sunSprite93=null;\n  }', skyA = s.indexOf(skyFine, skyDa);
if (skyDa < 0 || skyA < 0) throw new Error('makeSky');
s = s.slice(0, skyDa) + fs.readFileSync(path.join(__dirname, 'cielo.js'), 'utf8') + s.slice(skyA + skyFine.length);
console.log('ok makeSky');

sost('this.renderer.toneMappingExposure = on ? 0.80 : 0.86;', 'this.renderer.toneMappingExposure = on ? LOBBY_ESP110 : (this.giorno110 ? this.giorno110.esp : 1.0);', 'esposizione lobby');
sost('    if (this.world) this.world.setGrassQuality(q);\n', '    if (this.world) this.world.setGrassQuality(q);\n    if (this.post110) this.post110.setQuality(q);\n', 'qualita post');
sost(`    if (this.state !== 'title' && this.world && this.world.sky) this.world.sky.position.copy(this.camera.position);
    if (this.state === 'title') this.renderer.render(this.lobbyScene, this.lobbyCam); else this.renderer.render(this.scene, this.camera);`,
  `    /* v110: il giorno scorre anche in pausa e a fine partita (in partita lo muove update, dopo la telecamera) */
    if (this.giorno110 && this.state !== 'title' && this.state !== 'visual93' && this.state !== 'playing') this.giorno110.update(dt, this.player ? this.player.pos : this.camera.position);
    if (this.state !== 'title' && this.world && this.world.sky) this.world.sky.position.copy(this.camera.position);
    if (this.post110) this.post110.aggiorna(); if (this.perf110) this.perf110.inizio(); this.renderer.info.reset();
    if (this.state === 'title') this.renderer.render(this.lobbyScene, this.lobbyCam); else if (this.post110 && this.post110.attivo()) this.post110.render(this.scene, this.camera); else this.renderer.render(this.scene, this.camera);
    if (this.perf110) { this.perf110.fine(); this.perf110.frame(rawMs93); }`, 'loop render');
sost('    this.sun.position.set(p.pos.x + 92, p.pos.y + 56, p.pos.z + 52); this.sun.target.position.copy(p.pos);',
  '    if (this.giorno110) this.giorno110.update(dt, p.pos); else { this.sun.position.set(p.pos.x + 92, p.pos.y + 56, p.pos.z + 52); this.sun.target.position.copy(p.pos); }', 'sole in partita');
sost('  onKeyDown(code, e) {\n', "  onKeyDown(code, e) {\n    if (code === 'F3') { if (e && e.preventDefault) e.preventDefault(); if (this.perf110) this.perf110.toggle(); return; }   // v110: prestazioni\n", 'F3');
// materiali che accendono il bloom
sost('this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });',
  'this.tracerMat = hdr110(new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), 3);', 'bloom scie');
sost('s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flash, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));',
  's = new THREE.Sprite(hdr110(new THREE.SpriteMaterial({ map: TEX.flash, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 3));', 'bloom fiammata');
sost('ringMat = new THREE.SpriteMaterial({ map: TEX.ring, color: 0xaef0ff, transparent: true, opacity: 0.7, depthWrite: false });',
  'ringMat = hdr110(new THREE.SpriteMaterial({ map: TEX.ring, color: 0xaef0ff, transparent: true, opacity: 0.7, depthWrite: false }), 2.2);', 'bloom anelli');
sost('new THREE.PointsMaterial({ size: 0.22, vertexColors: true, map: TEX.particle, transparent: true, depthWrite: false, sizeAttenuation: true })',
  'hdr110(new THREE.PointsMaterial({ size: 0.22, vertexColors: true, map: TEX.particle, transparent: true, depthWrite: false, sizeAttenuation: true }), 2)', 'bloom schegge');

sost('G.scene.fog.near=damp(G.scene.fog.near,drop?170:chunks.distance*.52,2,dt);G.scene.fog.far=damp(G.scene.fog.far,drop?430:', 'G.scene.fog.near=damp(G.scene.fog.near,drop?230:chunks.distance*.52,2,dt);G.scene.fog.far=damp(G.scene.fog.far,drop?560:', 'foschia del lancio');   /* v110: dal bus l'isola sta a 100-250 m: con 170-430 era tutta velata */
fs.writeFileSync(F, s);
fs.writeFileSync(path.join(__dirname, '..', '..', 'VERSIONE'), '110\n');
console.log('scritto', F, (s.length / 1e6).toFixed(2) + ' MB');
