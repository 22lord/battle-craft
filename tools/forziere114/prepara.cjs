/* v114: prepara il forziere di Lorenzo per il gioco.
   Il file originale (forziere_v3.glb, 22 MB) e' UN solo pezzo da ~650.000 triangoli con texture 2048 e 1024:
   dentro l'HTML raddoppierebbe il peso del gioco, e il coperchio non si puo' aprire perche' non e' separato.
   Qui:
     1. ogni pezzo connesso (componente) va alla CASSA o al COPERCHIO (regole sotto, verificate a occhio
        con un render esploso: tools/forziere114/guarda.cjs)
     2. semplificazione con meshoptimizer (contrazione di spigoli, rispetta cuciture UV e bordi dei pezzi)
     3. il coperchio e' spostato in modo che il suo nodo stia sulla CERNIERA (spigolo dietro, in alto):
        nel gioco basta ruotare il nodo attorno a X
     4. texture rimpicciolite con Edge (canvas) e ricodificate in JPEG
   Uso:  node tools/forziere114/prepara.cjs [ingresso.glb] [uscita.glb]
   Serve meshoptimizer (npm i --no-save meshoptimizer@0.22.0 nella radice della repo, insieme a playwright-core:
   ATTENZIONE, npm senza l'altro pacchetto nella stessa riga toglie quello gia' installato). */
const path = require('path'), fs = require('fs');
const { leggi, scrivi } = require('./glb.cjs');
const RAD = path.join(__dirname, '..', '..');
const IN = process.argv[2] || path.join(RAD, 'forziere_v3.glb');
const OUT = process.argv[3] || path.join(RAD, 'assets', 'forziere114', 'forziere114.glb');

const CFG = {
  giunto: 0.660,        // m: tra il bordo della cassa (finisce a 0,657) e quello del coperchio (comincia a 0,663)
  // errore della semplificazione, relativo alla grandezza del modello (1 = 1,38 m): 0,0015 = ~2 mm
  errore: 0.003,
  texLegno: 512, texFerro: 256, qualita: 0.86,
};

/* A chi va un componente. Regola generale: il centro in altezza sopra o sotto il giunto.
   Eccezioni (numeri letti dall'elenco dei componenti, vedi CONTESTO 9.14):
   - la PIASTRA DELLA SERRATURA (davanti, |x| < 0,14, z > 0,42) pende dal coperchio, anche se scende a 0,49
   - le serrature scure (materiale Scuro) stanno sulla piastra: coperchio
   - i tappini in basso degli archi laterali del coperchio (alti 1 cm, a 0,630) vanno col coperchio
   - i tappini in cima alle staffe d'angolo della cassa (a 0,666) restano sulla cassa */
function coperchio(c, mat) {
  const cy = (c.mn[1] + c.mx[1]) / 2, h = c.mx[1] - c.mn[1];
  if (mat === 'Scuro') return true;
  if (c.mn[2] > 0.42 && Math.abs(c.mn[0]) < 0.14 && Math.abs(c.mx[0]) < 0.14 && c.mx[1] > 0.66) return true;
  if (h < 0.015 && c.mn[1] > 0.625 && c.mx[1] < 0.642 && Math.abs(c.mn[0]) > 0.6) return true;
  if (h < 0.015 && c.mn[1] > 0.664 && c.mx[1] < 0.68 && Math.abs(c.mn[0]) > 0.63 && Math.abs(c.mn[2]) > 0.38) return false;
  return cy > CFG.giunto;
}

function componenti(P, I) {
  const nv = P.length / 3, par = new Int32Array(nv); for (let i = 0; i < nv; i++) par[i] = i;
  const f = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < I.length; t += 3) { const a = f(I[t]); par[f(I[t + 1])] = a; par[f(I[t + 2])] = a; }
  const comp = new Map(), di = new Int32Array(nv);
  for (let v = 0; v < nv; v++) {
    const r = f(v); let c = comp.get(r);
    if (!c) { c = { id: comp.size, mn: [1e9, 1e9, 1e9], mx: [-1e9, -1e9, -1e9] }; comp.set(r, c); }
    di[v] = c.id; for (let k = 0; k < 3; k++) { c.mn[k] = Math.min(c.mn[k], P[v * 3 + k]); c.mx[k] = Math.max(c.mx[k], P[v * 3 + k]); }
  }
  return { lista: [...comp.values()], di };
}

// tiene solo i vertici usati e li rinumera
function compatta(P, N, U, I, sposta) {
  const map = new Int32Array(P.length / 3).fill(-1); let n = 0;
  for (const v of I) if (map[v] < 0) map[v] = n++;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = new Uint32Array(I.length);
  for (let v = 0; v < map.length; v++) {
    const k = map[v]; if (k < 0) continue;
    for (let j = 0; j < 3; j++) { pos[k * 3 + j] = P[v * 3 + j] - sposta[j]; nor[k * 3 + j] = N[v * 3 + j]; }
    uv[k * 2] = U[v * 2]; uv[k * 2 + 1] = U[v * 2 + 1];
  }
  for (let i = 0; i < I.length; i++) idx[i] = map[I[i]];
  return { pos, nor, uv, idx };
}

async function rimpicciolisci(jpgs) {
  const { chromium } = require(path.join(RAD, 'node_modules', 'playwright-core'));
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const p = await b.newPage();
  const out = [];
  for (const { buf, lato } of jpgs) {
    const url = await p.evaluate(async ([b64, lato, q]) => {
      const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = lato;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, lato, lato);
      return c.toDataURL('image/jpeg', q);
    }, [buf.toString('base64'), lato, CFG.qualita]);
    out.push(Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close(); return out;
}

(async () => {
  const { MeshoptSimplifier } = require(path.join(RAD, 'node_modules', 'meshoptimizer'));
  await MeshoptSimplifier.ready;
  const g = leggi(IN);
  const parti = { cassa: [], coperchio: [] };
  let triPrima = 0, triDopo = 0;
  const matIdx = {};   // nome materiale originale -> indice nuovo
  const materiali = [];
  for (const prim of g.json.meshes[0].primitives) {
    const nome = g.json.materials[prim.material].name;
    const P = g.acc(prim.attributes.POSITION), N = g.acc(prim.attributes.NORMAL), U = g.acc(prim.attributes.TEXCOORD_0), I = g.acc(prim.indices);
    triPrima += I.length / 3;
    const { lista, di } = componenti(P, I);
    const lato = lista.map((c) => coperchio(c, nome));
    const sel = { cassa: [], coperchio: [] };
    for (let t = 0; t < I.length; t += 3) sel[lato[di[I[t]]] ? 'coperchio' : 'cassa'].push(I[t], I[t + 1], I[t + 2]);
    if (matIdx[nome] === undefined) {
      const m = JSON.parse(JSON.stringify(g.json.materials[prim.material]));
      if (m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture) m.pbrMetallicRoughness.baseColorTexture.index = nome === 'Legno' ? 0 : 1;
      matIdx[nome] = materiali.length; materiali.push(m);
    }
    for (const lato2 of ['cassa', 'coperchio']) {
      const idx = new Uint32Array(sel[lato2]); if (!idx.length) continue;
      let s = idx;
      if (idx.length > 300) {
        // le cuciture UV sono vertici doppi nella stessa posizione: meshoptimizer le riconosce e non le sposta
        const [r] = MeshoptSimplifier.simplify(idx, P, 3, 0, CFG.errore, ['LockBorder']);
        s = r;
      }
      triDopo += s.length / 3;
      parti[lato2].push({ P, N, U, I: s, material: matIdx[nome], nome });
    }
  }
  // cerniera: spigolo dietro (z minima) del coperchio, all'altezza del giunto
  let zMin = 1e9; for (const p of parti.coperchio) for (const v of p.I) zMin = Math.min(zMin, p.P[v * 3 + 2]);
  const cerniera = [0, CFG.giunto, Number(zMin.toFixed(4))];
  const nodi = [
    { name: 'Cassa', mesh: parti.cassa.map((p) => ({ ...compatta(p.P, p.N, p.U, p.I, [0, 0, 0]), material: p.material })) },
    { name: 'Coperchio', translation: cerniera, mesh: parti.coperchio.map((p) => ({ ...compatta(p.P, p.N, p.U, p.I, cerniera), material: p.material })) },
  ];
  const tex = await rimpicciolisci([{ buf: g.img(0), lato: CFG.texLegno }, { buf: g.img(1), lato: CFG.texFerro }]);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  scrivi(OUT, nodi, materiali, tex);
  const zlib = require('zlib'), dim = fs.statSync(OUT).size, gz = zlib.gzipSync(fs.readFileSync(OUT), { level: 9 }).length;
  console.log(JSON.stringify({ triPrima, triDopo, cerniera, triCassa: nodi[0].mesh.reduce((a, m) => a + m.idx.length / 3, 0), triCoperchio: nodi[1].mesh.reduce((a, m) => a + m.idx.length / 3, 0), kbGlb: Math.round(dim / 1024), kbGzip: Math.round(gz / 1024), kbBase64: Math.round(gz * 4 / 3 / 1024) }));
})().catch((e) => { console.error(e); process.exit(1); });
