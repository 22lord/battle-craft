// Modello analitico delle luci (sezione 3 di docs/CONTESTO.md), v110.
// Formule di Three r160 (luci fisiche, BRDF di Lambert) + curve di tone mapping + grading del gioco.
// Uso:  node tools/luce110.cjs          stampa la previsione per pelle e superfici tipo
// Esporta anche le funzioni per i test (test/v110.cjs).
const srgb2lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lin2srgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map((v) => srgb2lin(v / 255));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
// ACES di Three r160 (tonemapping_pars_fragment)
function aces(c, exp) {
  const v = c.map((x) => x * exp / 0.6);
  const a = [0.59719 * v[0] + 0.35458 * v[1] + 0.04823 * v[2], 0.07600 * v[0] + 0.90834 * v[1] + 0.01566 * v[2], 0.02840 * v[0] + 0.13383 * v[1] + 0.83777 * v[2]];
  const f = a.map((x) => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.4329510) + 0.238081));
  return [1.60475 * f[0] - 0.53108 * f[1] - 0.07367 * f[2], -0.10208 * f[0] + 1.10813 * f[1] - 0.00605 * f[2], -0.00327 * f[0] - 0.07276 * f[1] + 1.07602 * f[2]].map(clamp01);
}
// grading del gioco: stessi numeri di GRADING110 nell'HTML (va tenuto allineato: lo controlla test/v110.cjs)
const GR = { sat: 1.12, contrasto: 1.05, ombra: [-0.006, 0.0, 0.03], luce: [0.03, 0.012, -0.025] };
function grade(c, g = GR) {
  let p = c.map((x) => Math.sqrt(Math.max(x, 0)));
  const l = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  p = p.map((x) => l + (x - l) * g.sat);
  p = p.map((x) => (x - 0.5) * g.contrasto + 0.5);
  const so = Math.pow(1 - clamp01(l / 0.55), 2), hi = clamp01((l - 0.55) / 0.45);
  p = p.map((x, i) => x + g.ombra[i] * so + g.luce[i] * hi);
  return p.map((x) => clamp01(x) * clamp01(x));
}
const tono = (c, exp) => grade(aces(c, exp));
// irradianza su una normale n da sole (dir L verso la luce), emisferica, ambiente, mappa d'ambiente
function irradianza(n, luci) {
  const { sole, emi, amb, env } = luci; const dot = Math.max(0, n[0] * sole.dir[0] + n[1] * sole.dir[1] + n[2] * sole.dir[2]) * (sole.ombra ? 0 : 1);
  const w = 0.5 * n[1] + 0.5;
  return [0, 1, 2].map((i) => sole.col[i] * sole.i * dot + (emi.terra[i] + (emi.cielo[i] - emi.terra[i]) * w) * emi.i + amb.col[i] * amb.i + Math.PI * env[i]);
}
function pixel(albedo, n, luci, exp) {
  const E = irradianza(n, luci); const lin = albedo.map((a, i) => a * E[i] / Math.PI);
  return tono(lin, exp).map((x) => Math.round(255 * lin2srgb(x)));
}
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
module.exports = { aces, grade, tono, pixel, irradianza, hex, srgb2lin, lin2srgb, GR, norm };

if (require.main === module) {
  const PELLE = [0.700, 0.502, 0.475];
  const prova = (nome, luci, exp, toneFn) => {
    const sd = luci.sole.dir; const lato = norm([-sd[2], 0, sd[0]]); const verso = norm([sd[0], 0, sd[2]]);
    const casi = [['pelle verso il sole', PELLE, verso, false], ['pelle di lato', PELLE, lato, false], ['pelle in ombra', PELLE, verso, true], ['pelle in ombra, lato opposto', PELLE, verso.map((x) => -x), true],
      ['erba (0.10,0.30,0.04) al sole', [0.10, 0.30, 0.04], [0, 1, 0], false], ['erba in ombra', [0.10, 0.30, 0.04], [0, 1, 0], true], ['pietra 0.35 parete al sole', [0.35, 0.33, 0.30], verso, false], ['pietra 0.35 parete in ombra', [0.35, 0.33, 0.30], verso.map((x) => -x), true]];
    console.log('\n== ' + nome + ' (esposizione ' + exp + ')');
    for (const [n, a, nn, om] of casi) { const l2 = { ...luci, sole: { ...luci.sole, ombra: om } }; const px = toneFn ? toneFn(a, nn, l2, exp) : pixel(a, nn, l2, exp); console.log('  ' + n.padEnd(30) + px.join(' ')); }
  };
  // PRIMA (v109): lineare x 0.86, filtro CSS saturate(1.14) contrast(1.05) ignorato
  const lineare = (a, n, l, exp) => { const E = irradianza(n, l); return a.map((x, i) => Math.round(255 * lin2srgb(clamp01(x * E[i] / Math.PI * exp)))); };
  const v109 = { sole: { dir: norm([92, 56, 52]), col: hex(0xffc489), i: 4.6 }, emi: { cielo: hex(0xffd2a2), terra: hex(0x9fb382), i: 1.55 }, amb: { col: hex(0x5a8fd6), i: 0.22 }, env: [0.089, 0.174, 0.179] };
  prova('v109 tramonto, lineare', v109, 0.86, lineare);
  const K = require('./luce110-chiavi.json');
  for (const k of K) prova('v110 ' + k.nome, { sole: { dir: norm(k.dir), col: hex(parseInt(k.sole, 16)), i: k.soleI }, emi: { cielo: hex(parseInt(k.cielo, 16)), terra: hex(parseInt(k.terra, 16)), i: k.emiI }, amb: { col: hex(parseInt(k.amb, 16)), i: k.ambI }, env: k.env }, k.exp);
}
