
/* ============================================================
   v112 — FASE GRAFICA 2: MATERIALI E TEXTURE
   Ogni superficie ha la sua texture, generata SULLA GPU al caricamento (uno shader per materiale, poi
   readPixels in una DataTexture con le mipmap): da una sola mappa di altezza a forme grandi e arrotondate
   escono il colore (con occlusione e spigoli gia' dipinti), la normal e la rugosita' (canale G, metallo nel
   B: la convenzione ORM di Three). Niente micro-dettaglio: solo pietre, tavole, crepe e cuciture grandi.
   - colore 1024 px (512 in Bassa: ma in Bassa i materiali nuovi non ci sono), normal e rugosita' 512 px
   - densita' fissa: una ripetizione ogni MAT112.lato[...] metri, con UV in coordinate del mondo sulle
     scatole (World.batch): niente piu' una texture intera stirata su ogni faccia, grande o piccola
   - Bassa resta come la v111 (Lambert senza normal): i materiali nuovi stanno in un secondo insieme e
     setQuality li scambia su tutte le mesh (scambia112)
   - rocce e scogliere: proiezione triplanare (coordinate del mondo), nessuna UV da stirare
   - sporco alla base dei muri e schiuma sulle rive dalla mappa d'altezza del terreno (la mesh vera)
   - variazione di tinta a bassa frequenza nel mondo (spezza la ripetizione delle piastrelle)
   - castello: tiene le texture dipinte di Lorenzo; normal e rugosita' ricavate dal loro disegno
   ============================================================ */
const MAT112 = {
  lato: { conci: 2.0, lastricato: 2.0, grezza: 3.0, legno: 2.0, mattoni: 1.6, tegole: 2.0, lamiera: 2.0, perlinato: 2.0, zolle: 2.5 },
  normale: { conci: 1.0, lastricato: 1.0, grezza: 1.2, legno: 0.9, mattoni: 1.0, tegole: 1.0, lamiera: 0.8, perlinato: 0.9, zolle: 0.55, castello: 0.9 },
  latoColore: 1024, latoNormale: 512,
  pronto: false, tex: {}, coppie: [], ms: 0,
  tempo: { value: 0 }, terreno: { value: null }, terrInfo: { value: null },
};
window.MAT112 = MAT112;

const GEN112_FRAG = `precision highp float;
uniform vec2 res; uniform int modo; uniform int tipo; uniform float forza; uniform sampler2D src;
const float TAU = 6.2831853;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p) { float n = h21(p); return vec2(n, h21(p + n + 17.17)); }
float vn(vec2 p, vec2 per) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = h21(mod(i, per)), b = h21(mod(i + vec2(1, 0), per)), c = h21(mod(i + vec2(0, 1), per)), d = h21(mod(i + vec2(1, 1), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
float fbm(vec2 p, vec2 per) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p, per); p *= 2.0; per *= 2.0; a *= 0.5; } return s / 0.9375; }
// voronoi periodico: x = distanza dal centro, y = distanza dal bordo della cella, z = id della cella
vec3 voro(vec2 p, vec2 per, float jit) {
  vec2 i = floor(p), f = fract(p); float d1 = 8.0; vec2 mr = vec2(0), mc = vec2(0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y); vec2 o = mix(vec2(0.5), h22(mod(i + g, per)), jit); vec2 r = g + o - f; float d = dot(r, r); if (d < d1) { d1 = d; mr = r; mc = mod(i + g, per); } }
  float md = 8.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) { vec2 g = vec2(x, y); vec2 o = mix(vec2(0.5), h22(mod(i + g, per)), jit); vec2 r = g + o - f; vec2 dd = r - mr; if (dot(dd, dd) > 1e-6) md = min(md, dot(0.5 * (mr + r), normalize(dd))); }
  return vec3(sqrt(d1), md, h21(mc + 0.37)); }
// profilo "gonfio": sale in fretta e resta tondo in cima
float gonfio(float d, float w) { float t = clamp(d / w, 0.0, 1.0); return sqrt(1.0 - (1.0 - t) * (1.0 - t)); }
vec3 hsv(float h, float s, float v) { vec3 k = clamp(abs(fract(h + vec3(0.0, 2.0, 1.0) / 3.0) * 6.0 - 3.0) - 1.0, 0.0, 1.0); return v * mix(vec3(1.0), k, s); }

// ---- blocchi in file (conci, mattoni, tegole): cella, distanza dal bordo in unita' della cella ----
// n = celle per tile (x, y), sfalsate di mezza cella a righe alterne; restituisce id e bordo in metri-tile
void file(vec2 uv, vec2 n, float war, out vec2 f, out vec2 id, out float bordo) {
  vec2 w = vec2(fbm(uv * 6.0, vec2(6.0)), fbm(uv * 6.0 + 7.3, vec2(6.0))) - 0.5;
  vec2 p = uv * n + w * war; float r = floor(p.y); p.x += mod(r, 2.0) * 0.5;
  id = vec2(mod(floor(p.x), n.x), mod(r, n.y)); f = fract(p);
  vec2 e = min(f, 1.0 - f) / n; bordo = min(e.x, e.y);
}

// ================== I MATERIALI: altezza h (0..1), colore c (sRGB), rugosita' r, metallo m ==================
void conci(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  vec2 f, id; float b; file(uv, vec2(3.0, 6.0), 0.18, f, id, b);
  float k = h21(id + 3.1);
  h = gonfio(b - 0.010, 0.040) * (0.82 + 0.18 * k);
  h *= 0.9 + 0.1 * fbm(uv * 5.0 + k * 9.0, vec2(5.0));
  // crepe larghe su qualche concio
  vec3 v = voro(uv * 4.0, vec2(4.0), 1.0); float crepa = (k > 0.7) ? 1.0 - gonfio(v.y, 0.06) : 0.0; h -= crepa * 0.45 * h;
  c = mix(vec3(0.66, 0.62, 0.56), vec3(0.56, 0.58, 0.62), k) * (0.88 + 0.22 * h21(id + 8.2));
  c = mix(vec3(0.46, 0.40, 0.36), c, smoothstep(0.0, 0.25, h));   // malta calda, mai nera
  r = mix(0.95, 0.78, h); m = 0.0;
}
void lastricato(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  vec2 w = vec2(fbm(uv * 4.0, vec2(4.0)), fbm(uv * 4.0 + 5.1, vec2(4.0))) - 0.5;
  vec3 v = voro(uv * 6.0 + w * 0.5, vec2(6.0), 0.85);
  h = gonfio(v.y - 0.03, 0.22) * (1.0 - 0.25 * v.x * v.x) * (0.85 + 0.15 * v.z);
  float k = v.z;
  c = k < 0.33 ? vec3(0.72, 0.68, 0.60) : k < 0.66 ? vec3(0.62, 0.62, 0.64) : vec3(0.70, 0.62, 0.55);
  c *= 0.9 + 0.2 * h21(vec2(k * 13.0, 2.0));
  c = mix(vec3(0.46, 0.41, 0.36), c, smoothstep(0.0, 0.2, h));
  r = mix(0.95, 0.72, h); m = 0.0;
}
void grezza(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  vec3 v = voro(uv * 3.0, vec2(3.0), 1.0);
  vec3 v2 = voro(uv * 7.0 + 0.3, vec2(7.0), 1.0);
  float big = gonfio(v.y - 0.02, 0.18), small = gonfio(v2.y - 0.01, 0.10);
  h = big * (0.88 + 0.12 * small) * (0.85 + 0.15 * fbm(uv * 4.0, vec2(4.0)));
  // strati orizzontali larghi
  h *= 0.9 + 0.1 * smoothstep(0.3, 0.7, sin((uv.y * 5.0 + fbm(uv * 3.0, vec2(3.0)) * 0.6) * TAU) * 0.5 + 0.5);
  c = mix(vec3(0.60, 0.58, 0.56), vec3(0.66, 0.60, 0.52), v.z) * (0.9 + 0.15 * v2.z);
  c = mix(vec3(0.44, 0.40, 0.38), c, smoothstep(0.0, 0.3, h));
  r = mix(0.97, 0.82, h); m = 0.0;
}
void legno(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  float n = 5.0; float py = uv.y * n; float pi = floor(py); float fy = fract(py);
  float k = h21(vec2(pi, 4.2));
  float jx = fract(uv.x + k);   // una giunta per tavola, in un punto diverso
  float b = min(min(fy, 1.0 - fy) / n, min(jx, 1.0 - jx) * 1.0);
  h = gonfio(b - 0.004, 0.022);
  // venature spesse e ondulate (lungo x), qualche nodo
  float war = fbm(vec2(uv.x * 2.0, uv.y * 10.0) + k * 5.0, vec2(2.0, 10.0));
  vec2 nodo = vec2(fract(k * 7.0), (pi + 0.5) / n); vec2 dn = uv - nodo; dn.x = dn.x - floor(dn.x + 0.5); float rn = length(dn * vec2(1.0, 2.2));
  float ven = sin((fy * 3.0 + war * 2.5 + 0.35 / (rn * 18.0 + 0.6)) * TAU) * 0.5 + 0.5;
  ven = smoothstep(0.55, 0.8, ven);
  h -= ven * 0.12 * h;
  c = mix(vec3(0.74, 0.50, 0.29), vec3(0.62, 0.40, 0.22), k) * (0.92 + 0.12 * h21(vec2(pi, 9.1)));
  c = mix(c, c * vec3(0.72, 0.62, 0.55), ven);
  c = mix(vec3(0.38, 0.25, 0.15), c, smoothstep(0.0, 0.25, h));
  r = mix(0.95, 0.7, h) + ven * 0.08; m = 0.0;
}
void mattoni(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  vec2 f, id; float b; file(uv, vec2(4.0, 8.0), 0.10, f, id, b);
  float k = h21(id + 1.7);
  h = gonfio(b - 0.012, 0.045) * (0.8 + 0.2 * k);
  // sbeccature tonde sugli angoli
  vec2 ang = abs(f - 0.5); float sb = (h21(id + 5.5) > 0.65) ? smoothstep(0.38, 0.47, min(ang.x * 0.8, ang.y) + 0.0) * step(0.42, ang.x) : 0.0; h *= 1.0 - sb * 0.6;
  c = mix(vec3(0.78, 0.40, 0.28), vec3(0.66, 0.30, 0.22), k);
  c = mix(c, vec3(0.80, 0.52, 0.36), step(0.85, h21(id + 9.9)) * 0.7);
  c *= 0.92 + 0.12 * fbm(uv * 8.0 + k, vec2(8.0));
  c = mix(vec3(0.66, 0.60, 0.52), c, smoothstep(0.0, 0.2, h));   // malta chiara e spessa
  r = mix(0.92, 0.8, h); m = 0.0;
}
void tegole(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  vec2 f, id; float b; file(uv, vec2(6.0, 8.0), 0.06, f, id, b);
  float k = h21(id + 2.3);
  // tegola: piu' spessa in basso (sporge sulla fila sotto), angoli in basso arrotondati, ombra netta sotto
  float lato = min(f.x, 1.0 - f.x);
  float tondo = length(max(vec2(0.18 - lato, 0.18 - f.y), 0.0)) / 0.18;
  h = (0.55 + 0.45 * (1.0 - f.y)) * (1.0 - smoothstep(0.75, 1.0, tondo)) * gonfio(lato / 6.0, 0.012) * smoothstep(0.0, 0.06, f.y);
  h *= 0.85 + 0.15 * k;
  c = vec3(0.86, 0.86, 0.88) * (0.85 + 0.2 * k);
  c = mix(vec3(0.42, 0.40, 0.42), c, smoothstep(0.0, 0.3, h));
  r = mix(0.9, 0.6, h); m = 0.0;
}
void lamiera(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  float ond = 0.5 + 0.5 * sin(uv.x * 10.0 * TAU);
  float pann = min(fract(uv.y), 1.0 - fract(uv.y));
  h = mix(0.25, 1.0, smoothstep(0.0, 1.0, ond)) * smoothstep(0.0, 0.02, pann);
  // ruggine semplificata e calda: macchie grandi, piu' frequenti in basso e sulle cuciture
  float ru = fbm(uv * 3.0 + 11.0, vec2(3.0)) + 0.25 * (1.0 - smoothstep(0.0, 0.12, pann));
  float rust = smoothstep(0.62, 0.68, ru);
  float usura = smoothstep(0.92, 1.0, ond);   // creste lucide e consumate
  vec3 vern = vec3(0.62, 0.72, 0.80);
  c = mix(vern, vec3(0.86, 0.90, 0.94), usura * 0.6);
  c = mix(c, mix(vec3(0.74, 0.40, 0.18), vec3(0.58, 0.28, 0.14), fbm(uv * 9.0, vec2(9.0))), rust);
  c *= mix(0.8, 1.0, h);
  // rivetti sulla cucitura
  vec2 rv = vec2(fract(uv.x * 10.0 + 0.25) - 0.5, (pann - 0.04) * 10.0); float riv = 1.0 - smoothstep(0.10, 0.16, length(rv)); h = max(h, riv); c = mix(c, vec3(0.85, 0.88, 0.9), riv * (1.0 - rust));
  r = mix(mix(0.42, 0.28, usura), 0.92, rust); m = mix(mix(0.35, 0.85, usura), 0.0, rust);
}
void perlinato(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  float n = 9.0; float py = uv.y * n; float pi = floor(py); float fy = fract(py);
  float k = h21(vec2(pi, 6.6)); float jx = fract(uv.x + k);
  // listello sovrapposto: sporge in basso, ombra netta sotto
  h = (0.35 + 0.65 * (1.0 - fy)) * smoothstep(0.0, 0.08, fy) * smoothstep(0.0, 0.01, min(jx, 1.0 - jx));
  // vernice scrostata qua e la' (legno sotto)
  float sc = smoothstep(0.80, 0.83, fbm(uv * vec2(2.0, 4.0) + 3.0, vec2(2.0, 4.0)));
  c = vec3(0.95, 0.94, 0.91) * (0.95 + 0.06 * k);
  c = mix(c, vec3(0.55, 0.42, 0.30), sc);
  c *= mix(0.78, 1.0, h);
  h -= sc * 0.15;
  r = mix(0.85, 0.62, h) + sc * 0.2; m = 0.0;
}
void zolle(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  vec3 v = voro(uv * 8.0, vec2(8.0), 1.0);
  h = gonfio(v.y, 0.30) * (1.0 - 0.4 * v.x) * (0.7 + 0.3 * v.z);
  h = mix(h, fbm(uv * 3.0, vec2(3.0)), 0.3);
  c = vec3(1.0) * (0.86 + 0.14 * h);
  r = 0.95; m = 0.0;
}
// castello: altezza dal disegno di Lorenzo (la malta scura e' bassa)
void castello(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  vec3 s = vec3(0.0); float tot = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { float w = (x == 0 && y == 0) ? 2.0 : 1.0; s += textureLod(src, uv + vec2(x, y) * 1.5 / res, 0.0).rgb * w; tot += w; }
  s /= tot; float l = dot(s, vec3(0.299, 0.587, 0.114));
  h = smoothstep(0.12, 0.55, l); c = s; r = mix(0.95, 0.72, h); m = 0.0;
}

void mat(vec2 uv, out float h, out vec3 c, out float r, out float m) {
  uv = fract(uv);
#if TIPO == 0
  conci(uv, h, c, r, m);
#elif TIPO == 1
  lastricato(uv, h, c, r, m);
#elif TIPO == 2
  grezza(uv, h, c, r, m);
#elif TIPO == 3
  legno(uv, h, c, r, m);
#elif TIPO == 4
  mattoni(uv, h, c, r, m);
#elif TIPO == 5
  tegole(uv, h, c, r, m);
#elif TIPO == 6
  lamiera(uv, h, c, r, m);
#elif TIPO == 7
  perlinato(uv, h, c, r, m);
#elif TIPO == 8
  zolle(uv, h, c, r, m);
#else
  castello(uv, h, c, r, m);
#endif
}
// passata 0: altezza, rugosita' e metallo (in una texture HalfFloat); passata 1: colore, con occlusione e
// curvatura lette dalla texture d'altezza (niente ricalcolo del materiale 13 volte per pixel)
uniform sampler2D hTex;
float H(vec2 uv) { return textureLod(hTex, uv, 0.0).r; }
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  if (modo == 0) { float h, r, m; vec3 c; mat(uv, h, c, r, m); gl_FragColor = vec4(h, r, m, 1.0); return; }
  float h = H(uv), med = 0.0, rr = 0.012;
  for (int i = 0; i < 8; i++) { float a = float(i) * TAU / 8.0; med += H(uv + vec2(cos(a), sin(a)) * rr); }
  med /= 8.0; float curv = h - med;
  float e = 1.5 / 512.0;
  float dx = (H(uv + vec2(e, 0.0)) - H(uv - vec2(e, 0.0))) / (2.0 * e), dy = (H(uv + vec2(0.0, e)) - H(uv - vec2(0.0, e))) / (2.0 * e);
  if (modo == 1) {
    float hh, r, m; vec3 c; mat(uv, hh, c, r, m);
    float ao = clamp(1.0 + min(curv, 0.0) * 2.2, 0.72, 1.0) * mix(0.86, 1.0, h);   // mai nero: il fondo degli incavi resta al 62% del colore
    vec3 col = c * ao * vec3(1.0, 0.97, 0.95) + vec3(1.0, 0.95, 0.85) * clamp(curv * 1.6, 0.0, 0.16);   // incavi un po' caldi, spigoli piu' chiari
    vec3 n = normalize(vec3(-dx * 0.02, -dy * 0.02, 1.0)); col *= 0.92 + 0.16 * clamp(dot(n, normalize(vec3(-0.25, 0.6, 0.75))), 0.0, 1.0);   // finto gradiente dipinto
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  } else if (modo == 2) {
    vec3 n = normalize(vec3(-dx * forza * 0.015, -dy * forza * 0.015, 1.0));
    gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
  } else {
    vec4 t = textureLod(hTex, uv, 0.0);
    float rough = clamp(t.g - clamp(curv * 1.2, 0.0, 0.25), 0.05, 1.0);   // spigoli piu' lucidi
    gl_FragColor = vec4(1.0, rough, clamp(t.b, 0.0, 1.0), 1.0);
  }
}`;
const TIPI112 = ['conci', 'lastricato', 'grezza', 'legno', 'mattoni', 'tegole', 'lamiera', 'perlinato', 'zolle', 'castello'];

/* Genera le mappe di un materiale: { a: colore sRGB (latoColore), n: normal, o: ORM (latoNormale) }. Un programma per
   materiale (#define TIPO, compilato una volta); l'altezza vive in una texture HalfFloat che le passate leggono. */
function genMat112(renderer, tipo, quali, src, latoA, latoN) {
  const r = renderer, t = TIPI112.indexOf(tipo);
  if (!MAT112._sc) { MAT112._sc = new THREE.Scene(); MAT112._cam = new THREE.Camera(); MAT112._q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); MAT112._q.frustumCulled = false; MAT112._sc.add(MAT112._q); MAT112._prog = {};
    MAT112._half = !!(r.extensions.has('EXT_color_buffer_float') || r.extensions.has('EXT_color_buffer_half_float')); }
  let mat = MAT112._prog[t];
  if (!mat) mat = MAT112._prog[t] = new THREE.ShaderMaterial({ vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: '#define TIPO ' + t + '\n' + GEN112_FRAG, depthTest: false, depthWrite: false,
    uniforms: { res: { value: new THREE.Vector2() }, modo: { value: 0 }, forza: { value: 1 }, src: { value: null }, hTex: { value: null } } });
  MAT112._q.material = mat; const u = mat.uniforms; u.src.value = src || null; u.forza.value = tipo === 'castello' ? 0.22 : 1;
  const prev = r.getRenderTarget(), at = r.autoClear; r.autoClear = true;
  const lH = Math.max(latoA || 0, latoN || 0);
  const hRT = new THREE.WebGLRenderTarget(lH, lH, { type: MAT112._half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  hRT.texture.wrapS = hRT.texture.wrapT = THREE.RepeatWrapping;
  u.res.value.set(lH, lH); u.modo.value = 0; r.setRenderTarget(hRT); r.render(MAT112._sc, MAT112._cam);
  u.hTex.value = hRT.texture;
  const passa = (modo, lato) => {
    const rt = new THREE.WebGLRenderTarget(lato, lato, { type: THREE.UnsignedByteType, depthBuffer: false });
    u.res.value.set(lato, lato); u.modo.value = modo; r.setRenderTarget(rt); r.render(MAT112._sc, MAT112._cam);
    const buf = new Uint8Array(lato * lato * 4); r.readRenderTargetPixels(rt, 0, 0, lato, lato, buf); rt.dispose();
    const tex = new THREE.DataTexture(buf, lato, lato, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    tex.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy ? r.capabilities.getMaxAnisotropy() : 4);
    tex.colorSpace = modo === 1 ? THREE.SRGBColorSpace : THREE.NoColorSpace; tex.needsUpdate = true; return tex;
  };
  const out = { a: quali.includes('a') ? passa(1, latoA) : null, n: quali.includes('n') ? passa(2, latoN) : null, o: quali.includes('o') ? passa(3, latoN) : null };
  r.setRenderTarget(prev); r.autoClear = at; hRT.dispose(); u.hTex.value = null;
  return out;
}

/* Iniezione comune negli shader dei materiali nuovi: posizione e normale nel mondo, variazione di tinta a bassa
   frequenza, sporco alla base dei muri (mappa d'altezza del terreno), triplanare (rocce), schiuma (acqua). */
const GLSL112_V = `
vec4 wp112 = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wp112 = instanceMatrix * wp112;
#endif
wp112 = modelMatrix * wp112; vWp112 = wp112.xyz;
vec3 wn112 = objectNormal;
#ifdef USE_INSTANCING
  wn112 = mat3(instanceMatrix) * wn112;
#endif
vWn112 = normalize(mat3(modelMatrix) * wn112);`;
const GLSL112_F = `
varying vec3 vWp112; varying vec3 vWn112;
uniform sampler2D terr112; uniform vec4 terrInfo112; uniform float tempo112;
float h112(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn112(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h112(i), h112(i + vec2(1, 0)), u.x), mix(h112(i + vec2(0, 1)), h112(i + vec2(1, 1)), u.x), u.y); }
float terreno112(vec2 xz) { vec2 uv = (xz - terrInfo112.xy) / terrInfo112.z; uv = (uv * (terrInfo112.w - 1.0) + 0.5) / terrInfo112.w; return texture2D(terr112, uv).r; }`;
function inietta112(m, o) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.terr112 = MAT112.terreno; sh.uniforms.terrInfo112 = MAT112.terrInfo; sh.uniforms.tempo112 = MAT112.tempo;
    if (o.tri) { sh.uniforms.triA112 = { value: MAT112.tex.grezza.a }; sh.uniforms.triN112 = { value: MAT112.tex.grezza.n }; }
    sh.vertexShader = 'varying vec3 vWp112; varying vec3 vWn112;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + GLSL112_V);
    let f = sh.fragmentShader.replace('void main() {', GLSL112_F + (o.tri ? '\nuniform sampler2D triA112; uniform sampler2D triN112;\n' : '') + '\nvoid main() {');
    let dopoMappa = '';
    if (o.var) dopoMappa += `{ float v = vn112(vWp112.xz * 0.22) * 0.6 + vn112(vWp112.xz * 0.9 + 7.0) * 0.4; diffuseColor.rgb *= ${o.var.toFixed(3)} * (v - 0.5) * 2.0 + 1.0; }\n`;
    if (o.sporco) dopoMappa += `if (terrInfo112.z > 0.0) { float s = 1.0 - smoothstep(0.0, ${o.sporco.toFixed(2)}, vWp112.y - terreno112(vWp112.xz)); s *= 1.0 - smoothstep(0.55, 0.8, abs(vWn112.y)); s *= 0.7 + 0.3 * vn112(vWp112.xz * 1.7 + vWp112.y); diffuseColor.rgb *= mix(vec3(1.0), vec3(0.62, 0.55, 0.47), s * 0.85); }\n`;
    if (o.tri) dopoMappa += `{ vec3 bw = pow(abs(normalize(vWn112)), vec3(4.0)); bw /= dot(bw, vec3(1.0)); vec3 q = vWp112 / ${MAT112.lato.grezza.toFixed(1)};
      vec3 a = texture2D(triA112, q.zy).rgb * bw.x + texture2D(triA112, q.xz).rgb * bw.y + texture2D(triA112, q.xy).rgb * bw.z;
      diffuseColor.rgb *= mix(1.0, dot(a, vec3(0.299, 0.587, 0.114)) / 0.58, 0.85); }\n`;
    if (o.schiuma) dopoMappa += `if (terrInfo112.z > 0.0) { float prof = -terreno112(vWp112.xz);
      float onda = 0.5 + 0.5 * sin(prof * 9.0 - tempo112 * 1.6 + vn112(vWp112.xz * 0.5) * 6.0);
      float sch = (1.0 - smoothstep(0.0, 0.30, prof)) * smoothstep(-0.05, 0.02, prof);
      sch = max(sch * smoothstep(0.55, 0.75, onda + 0.25 * vn112(vWp112.xz * 2.0 + tempo112 * 0.3)) * 0.8, (1.0 - smoothstep(0.0, 0.05, prof)) * smoothstep(-0.05, 0.0, prof) * 0.9);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97, 0.99, 1.0), sch); diffuseColor.a = max(diffuseColor.a, sch * 0.95); vSch112 = sch; }\n`;
    f = f.replace('#include <map_fragment>', '#include <map_fragment>\n' + dopoMappa);
    if (o.schiuma) { f = f.replace('void main() {', 'float vSch112 = 0.0;\nvoid main() {'); f = f.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.9, vSch112);'); }
    if (o.tri) f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 wn = normalize(vWn112); vec3 bw = pow(abs(wn), vec3(4.0)); bw /= dot(bw, vec3(1.0)); vec3 q = vWp112 / ${MAT112.lato.grezza.toFixed(1)}; float k = ${MAT112.normale.grezza.toFixed(2)};
        vec3 tx = texture2D(triN112, q.zy).xyz * 2.0 - 1.0, ty = texture2D(triN112, q.xz).xyz * 2.0 - 1.0, tz = texture2D(triN112, q.xy).xyz * 2.0 - 1.0;
        tx.xy *= k; ty.xy *= k; tz.xy *= k;
        // whiteout: ogni proiezione porta la sua perturbazione sul piano giusto
        vec3 nx = vec3(0.0, tx.y, tx.x) * sign(wn.x), ny = vec3(ty.x, 0.0, ty.y) * sign(wn.y), nz = vec3(tz.x, tz.y, 0.0) * sign(wn.z);
        vec3 wN = normalize(wn + nx * bw.x + ny * bw.y + nz * bw.z);
        normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz); }`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'm112' + JSON.stringify(o);
  return m;
}

/* Prima del mondo: genera le texture e prepara il secondo insieme di materiali (Media/Alta). Se la GPU non
   c'e' (banco di prova in Node) o qualcosa va storto, non cambia niente: resta la v111. */
function materiali112(G) {
  const r = G.renderer; if (!r || !r.capabilities || !r.capabilities.isWebGL2 || !r.readRenderTargetPixels) return false;
  const t0 = performance.now();
  try {
    for (const k of ['conci', 'lastricato', 'grezza', 'legno', 'mattoni', 'tegole', 'lamiera', 'perlinato', 'zolle']) {
      const T = genMat112(r, k, k === 'zolle' ? 'n' : 'ano', null, MAT112.latoColore, MAT112.latoNormale);
      MAT112.tex[k] = T;
    }
  } catch (e) { console.warn('materiali112: texture non generate', e); MAT112.tex = {}; return false; }
  const T = MAT112.tex, N = {};
  const std = (k, extra = {}) => { const t = T[k]; const m = new THREE.MeshStandardMaterial(Object.assign({ map: t.a, normalMap: t.n, roughnessMap: t.o, roughness: 1, metalness: 0 }, extra));
    const s = MAT112.normale[k]; m.normalScale = new THREE.Vector2(s, s); return m; };
  // muri, legno, metallo delle case e della citta' (UV nel mondo: una tile = MAT112.lato metri)
  N.wood = inietta112(std('legno'), { var: 0.10, sporco: 0.6 });
  N.stone = inietta112(std('conci'), { var: 0.08, sporco: 0.7 });
  N.metal = inietta112(std('lamiera', { metalnessMap: T.lamiera.o, metalness: 1 }), { var: 0.06, sporco: 0.5 });
  N.woodRoof = inietta112(std('legno', { side: THREE.DoubleSide }), { var: 0.10 });
  N.stoneRoof = inietta112(std('conci', { side: THREE.DoubleSide }), { var: 0.08 });
  N.metalRoof = inietta112(std('lamiera', { metalnessMap: T.lamiera.o, metalness: 1, side: THREE.DoubleSide }), { var: 0.06 });
  N.plank = inietta112(std('legno', { color: 0xd8c0a0 }), { var: 0.10, sporco: 0.5 });
  for (const [k, c] of [['sidingBlue', '#6f9fd4'], ['sidingGrey', '#b8b4a8'], ['sidingCream', '#e2d6b4'], ['sidingTeal103', '#4fb0a6'], ['sidingCoral103', '#e0705c'], ['sidingYellow103', '#efc45a']])
    N[k] = inietta112(std('perlinato', { color: new THREE.Color(c) }), { var: 0.07, sporco: 0.6 });
  N.brick = inietta112(std('mattoni'), { var: 0.08, sporco: 0.6 });
  N.shingle = inietta112(std('tegole', { color: 0x5d6878 }), { var: 0.10 });
  N.shingleRed = inietta112(std('tegole', { color: 0xc4553c }), { var: 0.10 });
  // terreno: resta Lambert coi colori ai vertici, in piu' le zolle nella normal
  N.grass = M.grass.clone(); N.grass.normalMap = T.zolle.n; N.grass.normalScale = new THREE.Vector2(MAT112.normale.zolle, MAT112.normale.zolle); T.zolle.n.repeat.set(MAPPA / MAT112.lato.zolle, MAPPA / MAT112.lato.zolle);
  // rocce e scogliere: triplanare (niente UV)
  N.rock = inietta112(M.rock.clone(), { tri: true, var: 0.08 }); N.cliff = inietta112(M.cliff.clone(), { tri: true, var: 0.08 });
  // acqua: schiuma sulle rive
  N.water = inietta112(M.water.clone(), { schiuma: true }); N.water.map = M.water.map;
  for (const k in N) MAT112.coppie.push([M, k, M[k], N[k]]);
  MAT112.N = N; MAT112.ms = Math.round(performance.now() - t0); MAT112.pronto = true;
  return true;
}
/* Dopo il mondo: i materiali della mappa (MX), il castello e la mappa d'altezza del terreno. */
function materiali112Mondo(G) {
  if (!MAT112.pronto) return; const W = G.world, T = MAT112.tex, r = G.renderer;
  const t0 = performance.now();
  // mappa d'altezza della mesh vera del terreno (181x181 vertici): sporco e schiuma la leggono
  try {
    const g = W.terrainMesh.geometry, p = g.attributes.position, seg = Math.round(Math.sqrt(p.count)), size = MAPPA;
    const d = new Float32Array(seg * seg);
    for (let i = 0; i < p.count; i++) { const ix = Math.round((p.getX(i) + size / 2) / size * (seg - 1)), iz = Math.round((p.getZ(i) + size / 2) / size * (seg - 1)); d[iz * seg + ix] = p.getY(i); }
    const tx = new THREE.DataTexture(d, seg, seg, THREE.RedFormat, THREE.FloatType); tx.magFilter = tx.minFilter = THREE.LinearFilter; tx.needsUpdate = true;
    // FloatType lineare vuole OES_texture_float_linear: senza, uso il piu' vicino (bande da 2,4 m, si vede appena)
    if (!r.extensions.has('OES_texture_float_linear')) tx.magFilter = tx.minFilter = THREE.NearestFilter;
    MAT112.terreno.value = tx; MAT112.terrInfo.value = new THREE.Vector4(-size / 2, -size / 2, size, seg);
  } catch (e) { MAT112.terrInfo.value = new THREE.Vector4(0, 0, 0, 1); }
  const N = MAT112.N, std = (k, extra = {}) => { const t = T[k]; const m = new THREE.MeshStandardMaterial(Object.assign({ map: t.a, normalMap: t.n, roughnessMap: t.o, roughness: 1, metalness: 0 }, extra)); const s = MAT112.normale[k]; m.normalScale = new THREE.Vector2(s, s); return m; };
  if (MX.pronti) {
    const nx = { selciato: inietta112(std('lastricato', { color: 0xe6e0d4 }), { var: 0.08 }), selciato2: inietta112(std('lastricato', { color: 0xc4beb0 }), { var: 0.08 }),
      sasso: inietta112(std('grezza', { color: 0xcfc8b6 }), { var: 0.08, sporco: 0.4 }), tronco: inietta112(std('legno', { color: 0xb08460 }), { var: 0.08 }) };
    for (const k in nx) MAT112.coppie.push([MX, k, MX[k], nx[k]]);
  }
  // castello: normal e rugosita' dal disegno, una volta per texture; il colore resta il suo
  if (W.castelloMesh105) {
    const fatte = new Map();
    W.castelloMesh105.traverse((o) => {
      if (!o.isMesh || !o.material.map || !o.material.map.image) return; const m = o.material, mp = m.map;
      let d = fatte.get(mp);
      if (!d) { try { const lato = Math.min(1024, mp.image.width || 512); d = genMat112(r, 'castello', 'no', mp, 0, lato); } catch (e) { d = null; } fatte.set(mp, d); }
      if (!d) return;
      const nm = m.clone(); nm.normalMap = d.n; nm.roughnessMap = d.o; nm.roughness = 1; const s = MAT112.normale.castello; nm.normalScale = new THREE.Vector2(s, s);
      d.n.repeat.copy(mp.repeat); d.o.repeat.copy(mp.repeat);
      MAT112.coppie.push([o, 'material', m, nm]);
    });
  }
  MAT112.msMondo = Math.round(performance.now() - t0);
}
/* Scambio dei materiali secondo la qualita': in Bassa i vecchi, in Media/Alta i nuovi. Vale per le mesh della
   scena e per i riferimenti (M.wood, MX.selciato...) cosi' anche quello che nasce dopo usa l'insieme giusto. */
function scambia112(G, q) {
  const nuovi = q !== 'low';
  // le texture si generano la prima volta che servono (Media/Alta): in Bassa (telefono) non si paga il tempo di generazione
  if (!MAT112.pronto) { if (!nuovi || MAT112.provato || !G.world || !G.renderer) return; MAT112.provato = true; if (!materiali112(G)) return; materiali112Mondo(G); }
  MAT112.attivo = nuovi;
  const mappa = new Map();
  for (const [obj, k, vec, nuo] of MAT112.coppie) { mappa.set(nuovi ? vec : nuo, nuovi ? nuo : vec); if (!obj.isMesh) obj[k] = nuovi ? nuo : vec; }
  // anche i blocchi della mappa staccati dalla scena perche' lontani (RenderChunks78): rientrano col materiale giusto
  const radici = [G.scene, G.lobbyScene]; if (G.world && G.world.chunks && G.world.chunks.cells) for (const c of G.world.chunks.cells.values()) if (c.root) radici.push(c.root);
  for (const sc of radici) if (sc) sc.traverse((o) => {
    if (!o.material) return;
    if (Array.isArray(o.material)) o.material = o.material.map((m) => mappa.get(m) || m); else { const m = mappa.get(o.material); if (m) o.material = m; }
  });
}
/* UV nel mondo per le scatole dei materiali con la texture nuova (World.batch). Proiezione per faccia: ogni faccia
   della scatola ha i suoi 4 vertici con la stessa normale, quindi niente stiramenti. Vale anche in Bassa (le texture
   vecchie con la stessa densita'): costo zero al fotogramma, si fa una volta costruendo il mondo. */
function uvMondo112(geo, mat) {
  if (!geo || geo.type !== 'BoxGeometry' || !MAT112.uvLato) return;
  const lato = MAT112.uvLato.get(mat); if (!lato) return;
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv; if (!p || !n || !uv) return;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) uv.setXY(i, x / lato, z / lato);
    else if (ax >= az) uv.setXY(i, (n.getX(i) > 0 ? -z : z) / lato, y / lato);
    else uv.setXY(i, (n.getZ(i) > 0 ? x : -x) / lato, y / lato);
  }
  uv.needsUpdate = true;
}
function registraUv112() {
  const L = MAT112.lato, m = new Map();
  const metti = (mat, lato) => { if (mat) m.set(mat, lato); };
  for (const [k, l] of [['wood', L.legno], ['stone', L.conci], ['metal', L.lamiera], ['woodRoof', L.legno], ['stoneRoof', L.conci], ['metalRoof', L.lamiera], ['plank', L.legno], ['brick', L.mattoni], ['shingle', L.tegole], ['shingleRed', L.tegole],
    ['sidingBlue', L.perlinato], ['sidingGrey', L.perlinato], ['sidingCream', L.perlinato], ['sidingTeal103', L.perlinato], ['sidingCoral103', L.perlinato], ['sidingYellow103', L.perlinato]]) {
    metti(M[k], l); if (MAT112.N) metti(MAT112.N[k], l);
  }
  MAT112.uvLato = m;
}

Object.assign(window, { uvMondo112, registraUv112, scambia112, materiali112 });   // per i test
