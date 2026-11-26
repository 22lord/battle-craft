/* ============================================================
   v115: LE AUTO DI LORENZO
   ============================================================
   Il modello di Lorenzo (macchina_citycar_v4.obj) alleggerito da tools/macchina115/prepara.cjs: tre pezzi,
   carrozzeria e tetto (ritinti auto per auto) e il resto col colore nei vertici. Prende il posto del vecchio
   modello dentro World.car(), quindi porte libere, collisioni, piccone e test restano quelli; in piu' ci
   sono auto parcheggiate lungo i sentieri e accanto alle case (World.autoStrade115). Ogni auto ha un colore suo.
   Senza il modello (o nei test che non lo caricano) World.car() usa il vecchio. */

/* - strade: auto in piu' lungo i sentieri; passo: m fra un tentativo e l'altro lungo un tratto
   - citta: raggio (m) attorno al centro della citta' dove non se ne aggiungono (ha gia' le sue tre)
   - lato: distanza (m) del centro dell'auto dalla linea del sentiero (il sentiero e' largo ~3 m)
   - casa: spazio (m) fra il muro e il fianco di un'auto parcheggiata accanto a una casa
   - distanza: minima fra due auto; angoloMax: solo tratti entro tanti gradi da un asse (la collisione e' una
     scatola allineata agli assi: con l'auto storta di 45 gradi gli angoli vuoti bloccherebbero ~0,8 m)
   - lung / larg / alto: mezza lunghezza, mezza larghezza (senza specchietti) e altezza della collisione (m) */
const AUTO115 = { strade: 10, citta: 40, passo: 26, lato: 3.4, casa: 1.3, distanza: 18, angoloMax: 30, lung: 2.03, larg: 0.95, alto: 1.42 };
// colori della carrozzeria (sRGB), in ordine: le tre auto della citta' prendono i primi tre
const AUTO115_COLORI = [0xd24a3a, 0x3d7ac9, 0xf2c230, 0x4fb848, 0xf08a24, 0x8a5ad8, 0x2fb8b0, 0xe86aa8, 0xf4f4f4, 0x2a2d33, 0x7fc8f0, 0xb8e04a, 0xb9bec6, 0x8b5a2b];

let AUTO115_MOD = null;
async function caricaAuto115() {
  try {
    if (typeof AUTO115_B64 === 'undefined') { AUTO115_MOD = null; return null; }
    const g = parseGLB(await gunzip(b64bytes(AUTO115_B64))), s = buildGLBScene(g), prims = g.json.meshes[0].primitives;
    // il lettore non da' il nome ai materiali: lo prendo dal file (stesso ordine dei primitivi)
    s.meshes.forEach((o, i) => { o.material.name = g.json.materials[prims[i].material].name; if (o.geometry.attributes.color) { o.material.vertexColors = true; o.material.needsUpdate = true; } });
    AUTO115_MOD = s.root;
  } catch (e) { AUTO115_MOD = null; if (typeof assetError85 === 'function') assetError85('Auto', e); }
  return AUTO115_MOD;
}
const AUTO115_MAT = new Map();
// un'auto del colore hex: geometrie condivise, materiali per colore (uno per colore, non per auto)
function auto115(hex) {
  if (!AUTO115_MOD) return null;
  let m = AUTO115_MAT.get(hex);
  if (!m) {
    let corpo = null, tetto = null; AUTO115_MOD.traverse((o) => { if (o.isMesh && o.material.name === 'carrozzeria') corpo = o.material; if (o.isMesh && o.material.name === 'tetto') tetto = o.material; });
    const c = new THREE.Color(hex), chiara = c.r * 0.3 + c.g * 0.59 + c.b * 0.11 > 0.7;
    m = { corpo: corpo.clone(), tetto: chiara ? tetto.clone() : null };
    m.corpo.color.setHex(hex);
    if (m.tetto) m.tetto.color.setHex(0x2b2e34);   // su un'auto bianca il tetto bianco sparirebbe: scuro
    AUTO115_MAT.set(hex, m);
  }
  const root = AUTO115_MOD.clone(true);
  root.traverse((o) => { if (!o.isMesh) return; if (o.material.name === 'carrozzeria') o.material = m.corpo; else if (o.material.name === 'tetto' && m.tetto) o.material = m.tetto; });
  return root;
}
