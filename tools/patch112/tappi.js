  /* v112: TAPPI DEL CASTELLO SPENTI FINCHE' NON SERVONO. I tappi (v107/v109) chiudono il taglio dei muri cavi
     sui confini dei blocchi da 4 m. Nascono dai voxel da 20 cm, quindi sporgono fino a ~20 cm fuori dalla
     parete vera: col muro intero si vedevano di taglio come strisce dritte lungo ogni confine (le "divisioni",
     visto nel render b_muro, e su fondo magenta senza luci non erano buchi). Ora un tappo e' un triangolo
     del materiale di pietra steso su un piano di confine con la normale lungo l'asse: lo tolgo dall'indice
     (degenere) e lo rimetto solo quando si rompe il blocco verso cui guarda. Si tocca l'indice, non le
     posizioni: removeHarvestable azzera le posizioni dei blocchi e resta com'era. */
  tappi112(meshes, rec106, BL, C, y0) {
    const L = BL.lato, perId = new Map(); for (const [id, r] of rec106) perId.set(BL.elenco[id * 3] + ',' + BL.elenco[id * 3 + 1] + ',' + BL.elenco[id * 3 + 2], r);
    const sulPiano = (v, o) => { const t = (v - o) / L; return Math.abs(t - Math.round(t)) * L < 0.003; };
    const o3 = [C.x + BL.origine, y0 + BL.zoccolo, C.z + BL.origine], V = new THREE.Vector3(), P = [[], [], []];
    const cand = new Map();   // mesh -> [tappo, vicino]: i tappi stanno tutti nel materiale della pietra (CAP_MAT del convertitore), quindi tengo solo la mesh che ne ha di piu'
    meshes.forEach((me, pi) => {
      const g = me.geometry, ix = g.index; if (!ix) return; const pa = g.attributes.position, na = g.attributes.normal; if (!na) return;
      // normali lette dall'array: Int8 normalizzate (/127); getX nel banco Node le rifiuta (trappola 24)
      const kn = na.normalized && !(na.array instanceof Float32Array) ? 1 / 127 : 1;
      me.updateMatrixWorld(true); const a = ix.array;
      for (let t = 0; t < a.length; t += 3) {
        for (let k = 0; k < 3; k++) { V.fromBufferAttribute(pa, a[t + k]).applyMatrix4(me.matrixWorld); P[k][0] = V.x; P[k][1] = V.y; P[k][2] = V.z; }
        for (let ax = 0; ax < 3; ax++) {
          if (Math.abs(P[0][ax] - P[1][ax]) > 0.003 || Math.abs(P[0][ax] - P[2][ax]) > 0.003 || !sulPiano(P[0][ax], o3[ax])) continue;
          const j = a[t] * na.itemSize, nn = [na.array[j] * kn, na.array[j + 1] * kn, na.array[j + 2] * kn]; if (Math.abs(nn[ax]) < 0.999) break;   // i tappi hanno la normale esatta sull'asse; un pezzo di muro che giace sul piano (normale morbida) resta
          // il blocco verso cui guarda il tappo, dalla posizione (il proprietario puo' essere il piede fisso, -1).
          // Se non c'e' o e' il piede fisso, il tappo non serve mai.
          const q = [0, 1, 2].map((k) => (P[0][k] + P[1][k] + P[2][k]) / 3 + (k === ax ? (nn[ax] > 0 ? 0.1 : -0.1) : 0));
          const vic = q[1] - o3[1] < 0 ? null : perId.get([0, 1, 2].map((k) => Math.floor((q[k] - o3[k]) / L)).join(','));
          let c = cand.get(me); if (!c) cand.set(me, c = []); c.push([{ mesh: me, t, i: [a[t], a[t + 1], a[t + 2]] }, vic]); break;
        }
      }
    });
    let best = []; for (const c of cand.values()) if (c.length > best.length) best = c;
    this.tappiTutti112 = best.map((c) => c[0]);
    for (const [tp, vic] of best) if (vic) (vic.tappi112 || (vic.tappi112 = [])).push(tp);
    this.nascondiTappi112();
    return best.length;
  }
  nascondiTappi112() {
    const toccate = new Set();
    for (const tp of this.tappiTutti112 || []) { const a = tp.mesh.geometry.index.array; a[tp.t] = a[tp.t + 1] = a[tp.t + 2] = tp.i[0]; toccate.add(tp.mesh); }
    for (const me of toccate) me.geometry.index.needsUpdate = true;
  }
  mostraTappi112(rec) {
    if (!rec.tappi112) return; const toccate = new Set();
    for (const tp of rec.tappi112) { const a = tp.mesh.geometry.index.array; a[tp.t] = tp.i[0]; a[tp.t + 1] = tp.i[1]; a[tp.t + 2] = tp.i[2]; toccate.add(tp.mesh); }
    for (const me of toccate) me.geometry.index.needsUpdate = true;
  }
