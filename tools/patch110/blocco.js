/* ============================================================
   v110 — FASE 1: LUCE, CIELO, POST-PROCESSING
   - curva: ACES di Three + grading del gioco (CustomToneMapping), uguale a ogni qualita'
     (anche Bassa: e' qualche istruzione per pixel dentro gli shader che ci sono gia')
   - nebbia d'altezza: patch ai chunk della nebbia (le zone basse e il mare sfumano di piu')
   - ciclo del giorno continuo (GIORNO110): sole, luna, cielo, nuvole, foschia, lampioni
   - post-processing (Post110) solo a Media/Alta: AO dalla sola profondita' (niente
     secondo passaggio della geometria), bloom sopra soglia HDR, FXAA/SMAA
   - pannello F3 (Perf110): FPS, ms, 95° percentile, ms GPU se il browser li da',
     draw call, triangoli, interruttori degli effetti
   ============================================================ */
/* Grading: lavora dopo la curva, in uno spazio quasi percettivo (radice quadrata). I numeri sono
   gli stessi di tools/luce110.cjs (il modello analitico): se si cambiano qui, cambiarli anche li'
   (test/v110.cjs lo controlla). ombra/luce: spinta di colore nelle ombre (blu-viola) e nelle luci
   (calde), pesata sulla luminosita'. Sostituisce il filtro CSS saturate(1.14) contrast(1.05) del canvas,
   che costava un passaggio in piu' al compositore del browser e non toccava i colori prima della curva. */
const GRADING110 = { sat: 1.12, contrasto: 1.05, ombra: [-0.006, 0.0, 0.03], luce: [0.03, 0.012, -0.025] };
const TONO110 = (() => { try { const q = new URLSearchParams(location.search).get('tono'); return q === 'agx' ? 'agx' : 'aces'; } catch (e) { return 'aces'; } })();
const f110 = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
const v3110 = (a) => 'vec3(' + a.map(f110).join(',') + ')';
const GLSL_TONO110 = `vec3 CustomToneMapping( vec3 color ) {
  color = ${TONO110 === 'agx' ? 'AgXToneMapping' : 'ACESFilmicToneMapping'}( color );
  vec3 p = sqrt( max( color, vec3( 0.0 ) ) );   /* spazio quasi percettivo: radice al posto di potenza 1/2,2 (costa meno, per ogni pixel) */
  float l = dot( p, vec3( 0.2126, 0.7152, 0.0722 ) );
  p = vec3( l ) + ( p - vec3( l ) ) * ${f110(GRADING110.sat)};
  p = ( p - 0.5 ) * ${f110(GRADING110.contrasto)} + 0.5;
  float so = pow( 1.0 - clamp( l / 0.55, 0.0, 1.0 ), 2.0 ), hi = clamp( ( l - 0.55 ) / 0.45, 0.0, 1.0 );
  p += ${v3110(GRADING110.ombra)} * so + ${v3110(GRADING110.luce)} * hi;
  p = clamp( p, 0.0, 1.0 ); return p * p;
}`;
/* Nebbia d'altezza: oltre alla nebbia per distanza (near/far, che il lancio e la distanza di
   visuale gia' muovono), un velo in piu' dove si sta in basso, che cresce con la distanza.
   La quota del frammento viene dalla camera: cameraPosition + R^T * posizione in vista (la
   rotazione della vista e' ortonormale), quindi funziona con istanze, sprite e skinning. */
const NEBBIA110 = { base: 2.0, scala: 12.0, densita: 0.14 };
/* Cielo e foschia passano per la stessa curva degli oggetti: il colore dell'orizzonte e quello della
   foschia sono lo stesso numero (moltiplicato per CIELO110_LUM), cosi' dove il terreno sfuma nel cielo
   non c'e' scalino. LOBBY_ESP110: esposizione della lobby (luci sue, tarata sulla pelle). */
const CIELO110_LUM = 1.1, LOBBY_ESP110 = 0.80;
(function patchShader110() {
  const C = THREE.ShaderChunk;
  C.tonemapping_pars_fragment = C.tonemapping_pars_fragment.replace('vec3 CustomToneMapping( vec3 color ) { return color; }', GLSL_TONO110);
  C.fog_pars_vertex = '#ifdef USE_FOG\n\tvarying float vFogDepth;\n\tvarying float vFogY110;\n#endif';
  C.fog_vertex = '#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z;\n\tvFogY110 = cameraPosition.y + ( transpose( mat3( viewMatrix ) ) * mvPosition.xyz ).y;\n#endif';
  C.fog_pars_fragment = '#ifdef USE_FOG\n\tuniform vec3 fogColor;\n\tvarying float vFogDepth;\n\tvarying float vFogY110;\n\t#ifdef FOG_EXP2\n\t\tuniform float fogDensity;\n\t#else\n\t\tuniform float fogNear;\n\t\tuniform float fogFar;\n\t#endif\n#endif';
  C.fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
		float fogFar110 = 1.0 / max( fogDensity, 1e-4 );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
		float fogFar110 = fogFar;
	#endif
	float hf110 = exp( - max( vFogY110 - ${f110(NEBBIA110.base)}, 0.0 ) / ${f110(NEBBIA110.scala)} );
	fogFactor = clamp( fogFactor + hf110 * ${f110(NEBBIA110.densita)} * smoothstep( 0.0, fogFar110, vFogDepth ), 0.0, 1.0 );
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
})();

/* --- ciclo del giorno ---
   u = frazione del giro (0..1), durata in secondi reali. Il sole sale e scende su un arco
   (elevazione 64° * sin), la notte e' corta e "chiara" (luce di luna azzurra, esposizione piu'
   alta): in un gioco a eliminazione il buio vero toglierebbe la leggibilita'.
   Chiavi: colori sRGB esadecimali, interpolati in lineare. sole = colore/intensita' dell'astro che
   fa luce in quel momento (di notte la luna), gia' sfumato vicino all'orizzonte dal codice.
   esp = esposizione, lamp = lampioni accesi (0..1), stelle = 0..1. */
const GIORNO110 = {
  durata: 720, inizio: 0.06, elevMax: 64, alba: -0.03, giorno: 0.76,   // il sole e' sopra l'orizzonte da u = alba a u = alba + giorno
  azAlba: -150, azTramonto: 30,                                        // gradi, in pianta (x = cos, z = sin): il tramonto viene dal lato della v109
  elevOmbreMin: 14, lunaElev: 42, passoDir: 0.2,                       // gradi: la luce che fa ombra non scende sotto i 14° e si muove a scatti di 0,2° (ombre ferme)
  chiavi: [
    { u: 0.00, zen: '4a78c8', hor: 'ffc9a0', glow: 'ffa070', sole: 'ffb27a', soleI: 2.6, cielo: 'c8d4f0', terra: '7d8a68', emiI: 1.55, amb: '8090d8', ambI: 0.32, nubL: 'ffd6b8', nubO: 'a8a8c8', esp: 1.10, lamp: 0.3, stelle: 0 },
    { u: 0.10, zen: '3d8de8', hor: 'a8d4fa', glow: 'fff0d0', sole: 'fff0d8', soleI: 3.4, cielo: 'b8dcff', terra: '8a9a6c', emiI: 1.75, amb: '9cc4ff', ambI: 0.30, nubL: 'ffffff', nubO: '9db4d8', esp: 1.00, lamp: 0, stelle: 0 },
    { u: 0.33, zen: '2f7fe6', hor: '9ccdf8', glow: 'ffffff', sole: 'ffeacc', soleI: 3.5, cielo: 'bfe0ff', terra: '8fa070', emiI: 1.60, amb: '9cc4ff', ambI: 0.25, nubL: 'ffffff', nubO: 'a8bcdc', esp: 1.00, lamp: 0, stelle: 0 },
    { u: 0.52, zen: '3a86e6', hor: 'a6d2fa', glow: 'fff0d8', sole: 'fff0d0', soleI: 3.5, cielo: 'c4dcff', terra: '8f9c6c', emiI: 1.55, amb: '9cc4ff', ambI: 0.25, nubL: 'fffaf0', nubO: 'a4b4d8', esp: 1.00, lamp: 0, stelle: 0 },
    { u: 0.63, zen: '4a7fd6', hor: 'ffd8b0', glow: 'ffb878', sole: 'ffc890', soleI: 3.3, cielo: 'e8d8d0', terra: '8a9068', emiI: 1.45, amb: '8f9ae0', ambI: 0.28, nubL: 'ffe0b8', nubO: 'b8aac8', esp: 1.00, lamp: 0, stelle: 0 },
    { u: 0.70, zen: '4a62c0', hor: 'ff9e70', glow: 'ff7a40', sole: 'ff9a5a', soleI: 2.8, cielo: 'ffb898', terra: '7a7a68', emiI: 1.50, amb: '7f80d8', ambI: 0.32, nubL: 'ffb888', nubO: 'a088b0', esp: 1.05, lamp: 0.4, stelle: 0 },
    { u: 0.76, zen: '23306e', hor: '7a6aa8', glow: 'c86a70', sole: 'b8c8ff', soleI: 1.0, cielo: '6878b8', terra: '4a5260', emiI: 1.60, amb: '5060b0', ambI: 0.55, nubL: '9a88c0', nubO: '5a5a88', esp: 1.30, lamp: 1, stelle: 0.3 },
    { u: 0.85, zen: '0c1430', hor: '2a3a6a', glow: '2a3a6a', sole: 'a8c0ff', soleI: 1.2, cielo: '5a6aa8', terra: '2e3848', emiI: 1.80, amb: '4a5ab0', ambI: 0.75, nubL: '5a6890', nubO: '323a58', esp: 1.55, lamp: 1, stelle: 1 },
    { u: 0.94, zen: '1e2c60', hor: '9a7aa0', glow: 'e08a80', sole: 'a8c0ff', soleI: 0.8, cielo: '7080b8', terra: '4a5260', emiI: 1.60, amb: '5868b8', ambI: 0.55, nubL: 'c09ab8', nubO: '5a5a88', esp: 1.30, lamp: 0.8, stelle: 0.3 },
  ],
};
const COLORI110 = ['zen', 'hor', 'glow', 'sole', 'cielo', 'terra', 'amb', 'nubL', 'nubO'], NUMERI110 = ['soleI', 'emiI', 'ambI', 'esp', 'lamp', 'stelle'];
for (const k of GIORNO110.chiavi) for (const c of COLORI110) k['_' + c] = new THREE.Color('#' + k[c]);   // sRGB -> lineare (gestione colore di Three)
/* elevazione del sole (gradi) e azimut (gradi) per la frazione u */
function sole110(u) {
  const g = GIORNO110, s = ((u - g.alba + 1) % 1) / g.giorno;            // 0 all'alba, 1 al tramonto, >1 di notte
  // di giorno un arco fino a elevMax; di notte un arco sotto l'orizzonte che torna a 0 all'alba (niente salti)
  const elev = s <= 1 ? g.elevMax * Math.sin(Math.PI * s) : -0.6 * g.elevMax * Math.sin(Math.PI * (s - 1) / (1 / g.giorno - 1));
  const az = g.azAlba + (g.azTramonto - g.azAlba) * Math.min(Math.max(s, -0.1), 1.1);
  return { elev, az, s };
}
/* ore sull'orologio (per F3): giorno 06-18 in g.giorno del giro, notte 18-06 nel resto */
function ora110(u) {
  const g = GIORNO110, s = ((u - g.alba + 1) % 1); const h = s <= g.giorno ? 6 + 12 * s / g.giorno : 18 + 12 * (s - g.giorno) / (1 - g.giorno);
  const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
/* materiali che devono "accendere" il bloom: colore moltiplicato solo quando il bloom e' attivo
   (in Bassa restano come prima, se no la curva li brucerebbe in bianco) */
const HDR110 = { lista: [], on: false };
function hdr110(m, k) { if (!m || !m.color) return m; HDR110.lista.push({ m, k, base: m.color.clone() }); if (HDR110.on) m.color.copy(m.color).multiplyScalar(k); return m; }
function hdrAccendi110(on) { if (HDR110.on === on) return; HDR110.on = on; for (const e of HDR110.lista) { e.m.color.copy(e.base); if (on) e.m.color.multiplyScalar(e.k); } }

class Giorno110 {
  constructor(G) {
    this.G = G; this.u = GIORNO110.inizio; this.fisso = null; this.k = {}; for (const c of COLORI110) this.k['_' + c] = new THREE.Color();
    this.dir = new THREE.Vector3(); this.dirLuce = new THREE.Vector3(); this.dirOld = new THREE.Vector3(); this.envU = -1; this.esp = 1; this.notte = 0;
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._c = new THREE.Vector3();
  }
  interpola(u) {
    const K = GIORNO110.chiavi; let i = K.length - 1; for (let j = 0; j < K.length; j++) if (K[j].u <= u) i = j;
    const a = K[i], b = K[(i + 1) % K.length], ub = b.u <= a.u ? b.u + 1 : b.u; let t = (u - a.u) / (ub - a.u); t = t * t * (3 - 2 * t);
    for (const c of COLORI110) this.k['_' + c].copy(a['_' + c]).lerp(b['_' + c], t);
    for (const n of NUMERI110) this.k[n] = a[n] + (b[n] - a[n]) * t;
    return this.k;
  }
  update(dt, target) { if (this.fisso === null) this.u = (this.u + dt / GIORNO110.durata) % 1; else this.u = this.fisso; this.applica(target); }
  applica(target) {
    const G = this.G, g = GIORNO110, k = this.interpola(this.u), so = sole110(this.u), D = Math.PI / 180;
    // direzione vera del sole (cielo, disco) e direzione della luce che fa ombra
    const ce = Math.cos(so.elev * D); this.dir.set(Math.cos(so.az * D) * ce, Math.sin(so.elev * D), Math.sin(so.az * D) * ce);
    const suSole = so.elev > -2; this.notte = suSole ? 0 : 1;
    const fade = suSole ? THREE.MathUtils.smoothstep(so.elev, 0, 6) : THREE.MathUtils.smoothstep(-so.elev, 2, 10);
    let el = suSole ? Math.max(so.elev, g.elevOmbreMin) : g.lunaElev, az = suSole ? so.az : so.az + 180;
    const q = g.passoDir; el = Math.round(el / q) * q; az = Math.round(az / q) * q;
    this.dirLuce.set(Math.cos(az * D) * Math.cos(el * D), Math.sin(el * D), Math.sin(az * D) * Math.cos(el * D));
    if (G.sun) {
      G.sun.color.copy(k._sole); G.sun.intensity = k.soleI * fade;
      if (target) stableSun110(G.sun, target, this.dirLuce, 150);
    }
    if (G.hemi) { G.hemi.color.copy(k._cielo); G.hemi.groundColor.copy(k._terra); G.hemi.intensity = k.emiI; }
    if (G.amb110) { G.amb110.color.copy(k._amb); G.amb110.intensity = k.ambI; }
    if (G.scene && G.scene.fog) G.scene.fog.color.copy(k._hor).multiplyScalar(CIELO110_LUM);
    const W = G.world;
    if (W && W.sky && W.sky.material.uniforms && W.sky.material.uniforms.uZen) {
      const U = W.sky.material.uniforms; U.uZen.value.copy(k._zen); U.uHor.value.copy(k._hor); U.uGlow.value.copy(k._glow); U.uSole.value.copy(this.dir);
      U.uSoleCol.value.copy(k._sole); U.uDisco.value = suSole ? 9 * THREE.MathUtils.smoothstep(so.elev, -2, 3) : 0; U.uStelle.value = k.stelle;
    }
    if (W && W.nuvole110) { const U = W.nuvole110.uniforms; U.uLuce.value.copy(k._nubL); U.uOmbra.value.copy(k._nubO); U.uHor.value.copy(k._hor); U.uSole.value.copy(suSole ? this.dir : this.dirLuce); }
    if (typeof M !== 'undefined' && M.lamp) M.lamp.emissiveIntensity = 0.8 + 3.4 * k.lamp;
    this.esp = k.esp; if (G.renderer && G.state !== 'title') G.renderer.toneMappingExposure = k.esp;
    // mappa d'ambiente: rifatta quando il cielo e' cambiato abbastanza (ogni 1/48 di giro, ~15 s)
    if (G.rifaiAmbiente110 && (this.envU < 0 || Math.abs(((this.u - this.envU + 1.5) % 1) - 0.5) > 1 / 48)) { this.envU = this.u; G.rifaiAmbiente110(k); }
  }
}
/* Come stableSun93 ma con la direzione che cambia: il bersaglio dell'ombra cade sempre su un
   multiplo di un texel nello spazio della luce, cosi' muovendosi le ombre ferme non tremano. */
function stableSun110(sun, p, dir, dist) {
  const z = dir, x = new THREE.Vector3(0, 1, 0).cross(z); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize(); const y = z.clone().cross(x);
  const cam = sun.shadow.camera; const sx = (cam.right - cam.left) / Math.max(1, sun.shadow.mapSize.x), sy = (cam.top - cam.bottom) / Math.max(1, sun.shadow.mapSize.y);
  const t = x.multiplyScalar(Math.round(p.dot(x) / sx) * sx).add(y.multiplyScalar(Math.round(p.dot(y) / sy) * sy)).add(z.clone().multiplyScalar(Math.round(p.dot(z) * 2) / 2));
  sun.target.position.copy(t); sun.position.copy(t).addScaledVector(dir, dist); sun.target.updateMatrixWorld();
}

/* texture delle nuvole: atlante 2x2 di forme a sbuffi (cumuli con la base piatta). Generatore proprio:
   il generatore del mondo (wrand) non va toccato, se no si sposta tutta la mappa. Canale R = densita'. */
function nuvolaTex110() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const c = cv.getContext('2d'); let sd = 110;
  const rr = (a, b) => { sd = (sd * 16807) % 2147483647; return a + (b - a) * (sd - 1) / 2147483646; };
  c.fillStyle = '#000'; c.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4; i++) {
    const ox = (i % 2) * 256, oy = (1 - Math.floor(i / 2)) * 128;   // la riga 0 dell'atlante (uv.y 0..0,5) e' la meta' bassa del canvas
    const puff = (x, y, r) => { const g = c.createRadialGradient(ox + x, oy + y, r * 0.1, ox + x, oy + y, r); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.62, 'rgba(255,255,255,0.92)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(ox + x, oy + y, r, 0, Math.PI * 2); c.fill(); };
    const n = 5 + Math.floor(rr(0, 3)); for (let k = 0; k < n; k++) puff(40 + (176 * k) / (n - 1) + rr(-8, 8), 84 + rr(-6, 4), rr(20, 30));
    const m = 2 + Math.floor(rr(0, 3)); for (let k = 0; k < m; k++) puff(80 + rr(0, 96), 58 + rr(-10, 8), rr(26, 40));
    const g = c.createLinearGradient(0, oy + 92, 0, oy + 112); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(ox, oy + 92, 256, 36);   // base piatta
  }
  /* la luce delle nuvole si calcola qui una volta sola: G, B = pendenza della densita' sfocata (forma intera)
     + un terzo di quella fine (dettaglio dello sbuffo). Lo shader legge un pixel solo invece di nove. */
  try {
    const W = 512, H = 256, img = c.getImageData(0, 0, W, H), d = img.data, a = new Float32Array(W * H); for (let i = 0; i < W * H; i++) a[i] = d[i * 4] / 255;
    const blur = (src, r) => { const t = new Float32Array(W * H), o = new Float32Array(W * H); for (let y = 0; y < H; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * W + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { t[y * W + x] = s / (2 * r + 1); s += src[y * W + Math.min(W - 1, x + r + 1)] - src[y * W + Math.max(0, x - r)]; } }
      for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { o[y * W + x] = s / (2 * r + 1); s += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; } } return o; };
    const b = blur(blur(a, 6), 6), at = (v, x, y) => v[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const gx = (at(b, x + 6, y) - at(b, x - 6, y)) * 2.2 + (at(a, x + 2, y) - at(a, x - 2, y)) * 0.6, gy = (at(b, x, y - 6) - at(b, x, y + 6)) * 2.2 + (at(a, x, y - 2) - at(a, x, y + 2)) * 0.6; const i = (y * W + x) * 4; d[i + 1] = Math.max(0, Math.min(255, 128 - gx * 127)); d[i + 2] = Math.max(0, Math.min(255, 128 - gy * 127)); d[i + 3] = 255; }
    c.putImageData(img, 0, 0);
  } catch (e) { }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; return t;
}

/* --- post-processing (Media/Alta) --- */
const POST110 = {
  low: { post: false },
  med: { post: true, ao: false, bloom: true, aa: 'fxaa' },
  high: { post: true, ao: true, bloom: true, aa: 'fxaa' },   /* SMAA misurato: +4,3 ms a 1080p sulla UHD (FXAA 1,1): solo da F3 */
  ao: { raggio: 1.1, forza: 1.15, lontano: 70 },     // m, intensita', distanza oltre cui sparisce
  bloom: { soglia: 1.6, ginocchio: 0.6, forza: 0.55 },
  vignetta: 0.22,
};
const VS110 = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
class Post110 {
  constructor(G) {
    this.G = G; this.r = G.renderer; this.ok = !!(this.r && this.r.capabilities && this.r.capabilities.isWebGL2); this.cfg = POST110.med; this.forza = {}; this.w = 0; this.h = 0; this.smaa = null; this.smaaStato = '';
    if (!this.ok) return;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(geo, null); this.quad.frustumCulled = false;
    const rt = (opt) => new THREE.WebGLRenderTarget(1, 1, Object.assign({ depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }, opt));
    this.scena = rt({ type: THREE.HalfFloatType, depthBuffer: true, depthTexture: new THREE.DepthTexture(1, 1) });
    this.ldr = rt({}); this.aoA = rt({ type: THREE.HalfFloatType }); this.aoB = rt({ type: THREE.HalfFloatType });
    this.bl = [0, 1, 2, 3].map(() => rt({ type: THREE.HalfFloatType }));
    const mat = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS110, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false, toneMapped: false });
    this.mAO = mat(`varying vec2 vUv; uniform sampler2D tDepth; uniform mat4 uPInv; uniform vec2 uRes; uniform float uRaggio, uForza, uP11, uLontano;
      vec3 vp( vec2 uv ){ float d = textureLod( tDepth, uv, 0.0 ).x; vec4 v = uPInv * vec4( uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 ); return v.xyz / v.w; }
      void main(){
        float d = textureLod( tDepth, vUv, 0.0 ).x; if( d >= 0.99999 ){ gl_FragColor = vec4( 1.0, 1e4, 0.0, 1.0 ); return; }
        vec3 P = vp( vUv ); vec2 px = 2.0 / uRes;
        vec3 a = vp( vUv + vec2( px.x, 0.0 ) ), b = vp( vUv - vec2( px.x, 0.0 ) ), c = vp( vUv + vec2( 0.0, px.y ) ), e = vp( vUv - vec2( 0.0, px.y ) );
        vec3 dx = abs( a.z - P.z ) < abs( P.z - b.z ) ? a - P : P - b; vec3 dy = abs( c.z - P.z ) < abs( P.z - e.z ) ? c - P : P - e;
        vec3 N = normalize( cross( dx, dy ) );
        float rs = min( uRaggio * uP11 * 0.5 / -P.z, 0.15 );
        float ang = 6.2831853 * fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
        float occ = 0.0;
        for( int i = 0; i < 8; i ++ ){
          float fi = ( float( i ) + 0.5 ) / 8.0; float an = ang + float( i ) * 2.39996;
          vec2 off = vec2( cos( an ), sin( an ) ) * rs * sqrt( fi ); off.x *= uRes.y / uRes.x;
          vec3 v = vp( vUv + off ) - P; float vv = dot( v, v );
          occ += max( 0.0, dot( N, v ) - 0.015 * -P.z ) / ( vv + 0.04 ) * ( 1.0 - smoothstep( uRaggio * 0.7, uRaggio * 1.5, sqrt( vv ) ) );
        }
        float ao = clamp( 1.0 - uForza * occ / 8.0 * uRaggio, 0.0, 1.0 );
        ao = mix( ao, 1.0, smoothstep( uLontano * 0.6, uLontano, -P.z ) );
        gl_FragColor = vec4( ao, -P.z, 0.0, 1.0 );
      }`, { tDepth: { value: null }, uPInv: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2() }, uRaggio: { value: 1 }, uForza: { value: 1 }, uP11: { value: 1 }, uLontano: { value: 70 } });
    this.mBlur = mat(`varying vec2 vUv; uniform sampler2D tAO; uniform vec2 uDir;
      void main(){ vec2 c = textureLod( tAO, vUv, 0.0 ).xy; float s = c.x, w = 1.0;
        for( int i = -2; i <= 2; i ++ ){ if( i == 0 ) continue; vec2 t = textureLod( tAO, vUv + uDir * float( i ), 0.0 ).xy; float k = exp( -abs( t.y - c.y ) / ( 0.03 * c.y + 0.05 ) ) * ( 1.0 - abs( float( i ) ) * 0.25 ); s += t.x * k; w += k; }
        gl_FragColor = vec4( s / w, c.y, 0.0, 1.0 ); }`, { tAO: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.mSoglia = mat(`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTex; uniform float uSoglia, uGin;
      void main(){ vec3 c = ( texture2D( tSrc, vUv + uTex * vec2( -1.0, -1.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( 1.0, -1.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( -1.0, 1.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( 1.0, 1.0 ) ).rgb ) * 0.25;
        float l = max( c.r, max( c.g, c.b ) ); float s = clamp( l - uSoglia + uGin, 0.0, 2.0 * uGin ); s = s * s / ( 4.0 * uGin + 1e-4 );
        gl_FragColor = vec4( min( c * max( s, l - uSoglia ) / max( l, 1e-4 ), vec3( 30.0 ) ), 1.0 ); }`, { tSrc: { value: null }, uTex: { value: new THREE.Vector2() }, uSoglia: { value: 1 }, uGin: { value: 0.5 } });
    this.mGiu = mat(`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTex;
      void main(){ vec3 c = texture2D( tSrc, vUv ).rgb * 4.0 + texture2D( tSrc, vUv + uTex * vec2( -1.0, -1.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( 1.0, -1.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( -1.0, 1.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( 1.0, 1.0 ) ).rgb;
        gl_FragColor = vec4( c / 8.0, 1.0 ); }`, { tSrc: { value: null }, uTex: { value: new THREE.Vector2() } });
    this.mSu = mat(`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTex;
      void main(){ vec3 c = vec3( 0.0 ); c += texture2D( tSrc, vUv + uTex * vec2( -2.0, 0.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( 2.0, 0.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( 0.0, -2.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( 0.0, 2.0 ) ).rgb;
        c += ( texture2D( tSrc, vUv + uTex * vec2( -1.0, -1.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( 1.0, -1.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( -1.0, 1.0 ) ).rgb + texture2D( tSrc, vUv + uTex * vec2( 1.0, 1.0 ) ).rgb ) * 2.0;
        gl_FragColor = vec4( c / 12.0, 1.0 ); }`, { tSrc: { value: null }, uTex: { value: new THREE.Vector2() } });
    this.mFinale = mat(`varying vec2 vUv; uniform sampler2D tScena, tAO, tBloom; uniform float uAO, uBloom, uVign;
      ${THREE.ShaderChunk.tonemapping_pars_fragment}
      vec3 srgb110( vec3 c ){ return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( vec3( 0.0031308 ), c ) ); }
      void main(){ vec3 c = texture2D( tScena, vUv ).rgb;
        if( uAO > 0.0 ) c *= mix( 1.0, texture2D( tAO, vUv ).x, uAO );
        if( uBloom > 0.0 ) c += texture2D( tBloom, vUv ).rgb * uBloom;
        c = CustomToneMapping( c );
        vec2 q = vUv - 0.5; c *= 1.0 - uVign * dot( q, q ) * 1.6;
        gl_FragColor = vec4( srgb110( clamp( c, 0.0, 1.0 ) ), 1.0 ); }`, { tScena: { value: null }, tAO: { value: null }, tBloom: { value: null }, uAO: { value: 0 }, uBloom: { value: 0 }, uVign: { value: POST110.vignetta }, toneMappingExposure: { value: 1 } });
    // FXAA "lite" (9 letture, la versione classica PC di Lottes semplificata)
    this.mFXAA = mat(`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTex;
      float lu( vec3 c ){ return dot( c, vec3( 0.299, 0.587, 0.114 ) ); }
      void main(){ vec3 nw = texture2D( tSrc, vUv + vec2( -1.0, -1.0 ) * uTex ).rgb, ne = texture2D( tSrc, vUv + vec2( 1.0, -1.0 ) * uTex ).rgb, sw = texture2D( tSrc, vUv + vec2( -1.0, 1.0 ) * uTex ).rgb, se = texture2D( tSrc, vUv + vec2( 1.0, 1.0 ) * uTex ).rgb; vec4 m = texture2D( tSrc, vUv );
        float a = lu( nw ), b = lu( ne ), c = lu( sw ), d = lu( se ), l = lu( m.rgb ); float mn = min( l, min( min( a, b ), min( c, d ) ) ), mx = max( l, max( max( a, b ), max( c, d ) ) );
        vec2 dir = vec2( -( ( a + b ) - ( c + d ) ), ( a + c ) - ( b + d ) ); float red = max( ( a + b + c + d ) * 0.03125, 1.0 / 128.0 ); float rc = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + red );
        dir = clamp( dir * rc, vec2( -8.0 ), vec2( 8.0 ) ) * uTex;
        vec3 A = 0.5 * ( texture2D( tSrc, vUv + dir * ( 1.0 / 3.0 - 0.5 ) ).rgb + texture2D( tSrc, vUv + dir * ( 2.0 / 3.0 - 0.5 ) ).rgb );
        vec3 B = A * 0.5 + 0.25 * ( texture2D( tSrc, vUv - dir * 0.5 ).rgb + texture2D( tSrc, vUv + dir * 0.5 ).rgb ); float lb = lu( B );
        gl_FragColor = vec4( ( lb < mn || lb > mx ) ? A : B, 1.0 ); }`, { tSrc: { value: null }, uTex: { value: new THREE.Vector2() } });
    this.v2 = new THREE.Vector2();
  }
  /* effetto attivo: qualita' + interruttori di F3 (forza.ao/bloom/aa/post) */
  eff(n) { return this.forza[n] !== undefined ? this.forza[n] : this.cfg[n]; }
  attivo() { return this.ok && this.eff('post') && this.G.state !== 'title' && this.G.state !== 'visual93'; }
  setQuality(q) { this.cfg = POST110[q] || POST110.med; this.aggiorna(); }
  aggiorna() { hdrAccendi110(this.attivo() && !!this.eff('bloom')); if (this.attivo() && this.eff('aa') === 'smaa' && !this.smaa && !this.smaaStato) this.caricaSMAA(); }
  /* SMAA dagli addon della stessa versione di Three (import dinamico: in Bassa non si scarica;
     se la rete non risponde resta FXAA) */
  async caricaSMAA() {
    this.smaaStato = 'carico';
    try { const mod = await import('three/addons/postprocessing/SMAAPass.js'); this.smaa = new mod.SMAAPass(Math.max(1, this.w), Math.max(1, this.h)); this.smaa.renderToScreen = true; this.smaaStato = 'ok'; this.w = 0; }
    catch (e) { console.warn('SMAA non disponibile, resta FXAA', e); this.smaaStato = 'no'; }
  }
  passa(m, dest) { this.quad.material = m; this.r.setRenderTarget(dest); this.r.render(this.quad, this.cam); }
  dimensioni() {
    const s = this.r.getDrawingBufferSize(this.v2); const w = Math.max(1, s.x | 0), h = Math.max(1, s.y | 0); if (w === this.w && h === this.h) return;
    this.w = w; this.h = h; this.scena.setSize(w, h); this.ldr.setSize(w, h);
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1); this.aoA.setSize(hw, hh); this.aoB.setSize(hw, hh);
    this.bl.forEach((t, i) => t.setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1))));
    if (this.smaa) this.smaa.setSize(w, h);
  }
  render(scene, camera) {
    const r = this.r; this.dimensioni();
    r.setRenderTarget(this.scena); r.render(scene, camera);
    const ao = !!this.eff('ao'), bloom = !!this.eff('bloom'); let aa = this.eff('aa'); if (aa === 'smaa' && !this.smaa) aa = 'fxaa';
    if (ao) {
      const P = POST110.ao, u = this.mAO.uniforms; u.tDepth.value = this.scena.depthTexture; u.uPInv.value.copy(camera.projectionMatrixInverse); u.uRes.value.set(this.w, this.h);
      u.uRaggio.value = P.raggio; u.uForza.value = P.forza; u.uP11.value = camera.projectionMatrix.elements[5]; u.uLontano.value = P.lontano;
      this.passa(this.mAO, this.aoA);
      const b = this.mBlur.uniforms; b.tAO.value = this.aoA.texture; b.uDir.value.set(1 / this.aoA.width, 0); this.passa(this.mBlur, this.aoB);
      b.tAO.value = this.aoB.texture; b.uDir.value.set(0, 1 / this.aoA.height); this.passa(this.mBlur, this.aoA);
    }
    if (bloom) {
      const B = POST110.bloom, s = this.mSoglia.uniforms; s.tSrc.value = this.scena.texture; s.uTex.value.set(0.5 / this.w, 0.5 / this.h); s.uSoglia.value = B.soglia; s.uGin.value = B.ginocchio; this.passa(this.mSoglia, this.bl[0]);
      const g = this.mGiu.uniforms; for (let i = 1; i < 4; i++) { g.tSrc.value = this.bl[i - 1].texture; g.uTex.value.set(1 / this.bl[i - 1].width, 1 / this.bl[i - 1].height); this.passa(this.mGiu, this.bl[i]); }
      const su = this.mSu.uniforms; this.mSu.blending = THREE.AdditiveBlending; this.mSu.transparent = true;
      for (let i = 3; i > 0; i--) { su.tSrc.value = this.bl[i].texture; su.uTex.value.set(0.5 / this.bl[i].width, 0.5 / this.bl[i].height); this.passa(this.mSu, this.bl[i - 1]); }
    }
    const f = this.mFinale.uniforms; f.tScena.value = this.scena.texture; f.tAO.value = this.aoA.texture; f.tBloom.value = this.bl[0].texture;
    f.uAO.value = ao ? 1 : 0; f.uBloom.value = bloom ? POST110.bloom.forza : 0; f.toneMappingExposure.value = r.toneMappingExposure;
    if (!aa) { this.passa(this.mFinale, null); return; }
    this.passa(this.mFinale, this.ldr);
    if (aa === 'smaa') { this.smaa.render(r, null, this.ldr); r.setRenderTarget(null); return; }
    const x = this.mFXAA.uniforms; x.tSrc.value = this.ldr.texture; x.uTex.value.set(1 / this.w, 1 / this.h); this.passa(this.mFXAA, null);
  }
}

/* --- F3: prestazioni --- */
class Perf110 {
  constructor(G) {
    this.G = G; this.on = false; this.ms = new Float32Array(240); this.i = 0; this.n = 0; this.t = 0; this.fr = 0; this.gpu = null; this.q = null; this.gpuMs = -1;
    try { const gl = G.renderer.getContext(); this.gl = gl; this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2'); } catch (e) { this.ext = null; }
    const el = this.el = document.createElement('div'); el.id = 'perf110';
    el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;background:rgba(10,14,24,.82);color:#e8f0ff;font:12px/1.45 ui-monospace,Consolas,monospace;padding:8px 10px;border-radius:8px;display:none;pointer-events:auto;white-space:pre;min-width:250px';
    this.txt = document.createElement('div'); el.appendChild(this.txt);
    const riga = document.createElement('div'); riga.style.cssText = 'margin-top:6px;display:flex;flex-wrap:wrap;gap:4px'; el.appendChild(riga); this.btn = {};
    for (const [k, nome] of [['post', 'Post'], ['ao', 'AO'], ['bloom', 'Bloom'], ['aa', 'AA'], ['ombre', 'Ombre'], ['ora', 'Ora']]) {
      const b = document.createElement('button'); b.type = 'button'; b.style.cssText = 'font:11px ui-monospace,Consolas,monospace;padding:2px 6px;border-radius:4px;border:1px solid #567;background:#1c2638;color:#dfe8ff;cursor:pointer';
      b.onclick = (e) => { e.stopPropagation(); this.cambia(k); }; riga.appendChild(b); this.btn[k] = b; b.dataset.nome = nome;
    }
    if (document.body && document.body.appendChild) document.body.appendChild(el);
  }
  toggle() { this.on = !this.on; this.el.style.display = this.on ? 'block' : 'none'; this.t = 1; }
  cambia(k) {
    const G = this.G, P = G.post110;
    if (k === 'ombre') { this.ombreNo = !this.ombreNo; G.setQuality(G.quality); if (this.ombreNo) { G.renderer.shadowMap.enabled = false; G.sun.castShadow = false; } this.t = 1; return; }   /* setQuality segna i materiali da ricompilare: ripartono senza ombre */
    if (k === 'ora') { const g = G.giorno110; if (g) { g.fisso = null; g.u = (g.u + 1 / 8) % 1; } this.t = 1; return; }
    if (!P) return; const cur = P.eff(k);
    if (k === 'aa') P.forza.aa = cur === 'fxaa' ? 'smaa' : cur === 'smaa' ? false : 'fxaa'; else P.forza[k] = !cur;
    P.aggiorna(); this.t = 1;
  }
  inizio() { if (!this.on || !this.ext || this.q) return; const gl = this.gl; this.q = gl.createQuery(); gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.q); this.qAperta = true; }
  fine() {
    if (!this.ext) return; const gl = this.gl;
    if (this.qAperta) { gl.endQuery(this.ext.TIME_ELAPSED_EXT); this.qAperta = false; return; }
    if (this.q && gl.getQueryParameter(this.q, gl.QUERY_RESULT_AVAILABLE)) { if (!gl.getParameter(this.ext.GPU_DISJOINT_EXT)) { const v = gl.getQueryParameter(this.q, gl.QUERY_RESULT) / 1e6; this.gpuMs = this.gpuMs < 0 ? v : this.gpuMs * 0.9 + v * 0.1; } gl.deleteQuery(this.q); this.q = null; }
  }
  frame(rawMs) {
    this.ms[this.i] = rawMs; this.i = (this.i + 1) % this.ms.length; this.n = Math.min(this.n + 1, this.ms.length);
    if (!this.on) return; this.t += rawMs / 1000; this.fr++; if (this.t < 0.5) return; const fin = this.t, nfr = this.fr; this.t = 0; this.fr = 0;
    /* FPS e ms medi sull'ultimo mezzo secondo; 95° percentile sugli ultimi 240 fotogrammi */
    const a = Array.from(this.ms.subarray(0, this.n)).sort((x, y) => x - y), med = fin * 1000 / Math.max(1, nfr), p95 = a[Math.min(a.length - 1, Math.floor(a.length * 0.95))] || 0;
    const G = this.G, r = G.renderer, inf = r.info.render, P = G.post110, s = r.getDrawingBufferSize(new THREE.Vector2()), qn = (QUALITY[G.quality] || {}).label || G.quality;
    const gpu = this.ext ? (this.gpuMs >= 0 ? this.gpuMs.toFixed(1) + ' ms' : '...') : 'non disponibile in questo browser';
    this.txt.textContent = 'FPS ' + (1000 / Math.max(med, 0.01)).toFixed(0) + '   ' + med.toFixed(1) + ' ms   (95%: ' + p95.toFixed(1) + ' ms)\nGPU ' + gpu +
      '\ndraw call ' + inf.calls + '   triangoli ' + (inf.triangles / 1e6).toFixed(2) + ' M\nbuffer ' + s.x + '×' + s.y + '   qualità ' + qn +
      '\nora ' + (G.giorno110 ? ora110(G.giorno110.u) : '-') + '   (giro di ' + Math.round(GIORNO110.durata / 60) + ' min)';
    const on = (k) => (P && P.ok && P.eff('post') ? P.eff(k) : false);
    if (P) { this.btn.post.textContent = 'Post ' + (P.ok && P.eff('post') ? 'sì' : 'no'); this.btn.ao.textContent = 'AO ' + (on('ao') ? 'sì' : 'no'); this.btn.bloom.textContent = 'Bloom ' + (on('bloom') ? 'sì' : 'no'); const aa = on('aa'); this.btn.aa.textContent = 'AA ' + (aa ? String(aa).toUpperCase() + (aa === 'smaa' && !P.smaa ? '…' : '') : (P.ok && P.eff('post') ? 'no' : 'MSAA')); }
    this.btn.ombre.textContent = 'Ombre ' + (G.sun && G.sun.castShadow && G.renderer.shadowMap.enabled ? (QUALITY[G.quality] || {}).shadow : 'no'); this.btn.ora.textContent = 'Ora +3h';
  }
}
