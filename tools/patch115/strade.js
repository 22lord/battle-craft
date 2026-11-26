  /* v115: auto in piu' fuori citta' (la citta' ha le sue tre): prima lungo i sentieri (parallele al tratto, a
     AUTO115.lato m dalla linea, solo tratti quasi allineati agli assi), poi parcheggiate di fianco alle case
     (parallele al muro, mai davanti alla porta). Ogni posto deve essere in piano, fuori dall'acqua, lontano da
     altre auto, porte, alberi, rocce, cespugli e da qualunque collisione.
     Si chiama DOPO la vegetazione e col caso a seme proprio: il resto della mappa resta identico alla v114
     (testato in v110.cjs). Prima della vegetazione, gli alberi scartati facevano slittare WRNG e 80 alberi e
     rocce cambiavano posto in tutta l'isola. */
  autoStrade115() {
    if (typeof AUTO115_MOD === 'undefined' || !AUTO115_MOD) return 0;
    const A = AUTO115; let seme = 115; const rng = () => { seme = (seme * 1664525 + 1013904223) >>> 0; return seme / 4294967296; };
    const gia = this.harvestables.filter((h) => h.col && h.col.tag === 'car').map((h) => [h.x, h.z]);
    let n = 0, ci = 3; this.autoDove115 = [];
    // controlla il posto (x, z, rotazione) e ci mette l'auto; vicinoCasa: la casa accanto e' voluta
    const metti = (x, z, rot, dove) => {
      if (n >= A.strade) return false;
      if (gia.some(([ax, az]) => Math.hypot(ax - x, az - z) < A.distanza)) return false;
      if (Math.hypot(x - CITTA.x, z - CITTA.z) < A.citta) return false;
      if (Math.hypot(x - CASTELLO105_POS.x, z - CASTELLO105_POS.z) < 40) return false;
      const cr = Math.cos(rot), sr = Math.sin(rot); let hmin = 1e9, hmax = -1e9;
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) { const lx = a * A.lung, lz = b * A.larg, hh = this.h(x + lx * cr + lz * sr, z - lx * sr + lz * cr); hmin = Math.min(hmin, hh); hmax = Math.max(hmax, hh); }
      if (hmax - hmin > 0.45 || hmin < MARE + 0.5) return false;
      const ca = Math.abs(cr), sa = Math.abs(sr), hx = ca * A.lung + sa * A.larg + 0.4, hz = sa * A.lung + ca * A.larg + 0.4;
      if (dove === 'sentiero' && this.nearHouse92(x, z, 3)) return false;
      if (this.occupato106(x, z, hx, hz, hmin - 0.3, hmax + 1.8)) return false;
      // i cespugli non hanno collisione: si controllano a parte (alberi e rocce li vede gia' occupato106)
      if (this.veg && this.veg.slot.some((q) => q.tipo === 'cespuglio' && Math.abs(q.x - x) < hx + 0.6 * q.sc && Math.abs(q.z - z) < hz + 0.6 * q.sc)) return false;
      if ((this.porte102 || []).some((q) => Math.abs(x - q.x) < q.hx + hx + 1.5 && Math.abs(z - q.z) < q.hz + hz + 1.5)) return false;
      const prima = this.harvestables.length;
      this.car(x, z, rot, { color: new THREE.Color(AUTO115_COLORI[ci % AUTO115_COLORI.length]) });
      if (this.harvestables.length === prima) return false;
      const r = this.harvestables[prima]; gia.push([r.x, r.z]); this.autoDove115.push({ x: r.x, z: r.z, dove }); n++; ci++; return true;
    };
    // 1. lungo i sentieri: ogni 5 m, tutti e due i lati (il primo a caso); trovato un posto si salta avanti di A.passo
    for (const p of PATHS) for (let i = 0; i + 1 < p.length && n < A.strade; i++) {
      const [x0, z0] = p[i], [x1, z1] = p[i + 1], dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz); if (L < 12) continue;
      const gradi = ((Math.atan2(dz, dx) * 180 / Math.PI) % 90 + 90) % 90; if (Math.min(gradi, 90 - gradi) > A.angoloMax) continue;
      const ux = dx / L, uz = dz / L;
      for (let t = 8 + rng() * 4; t < L - 8 && n < A.strade; t += 5) {
        let fatto = false;
        for (const s of rng() < 0.5 ? [1, -1] : [-1, 1]) {
          const x = x0 + ux * t - uz * A.lato * s, z = z0 + uz * t + ux * A.lato * s;
          if (distToPaths(x, z) < A.lato - 0.5) continue;   // un altro sentiero ci passa sopra
          if (metti(x, z, Math.atan2(-dz, dx) + (rng() < 0.5 ? Math.PI : 0), 'sentiero')) { fatto = true; break; }
        }
        if (fatto) t += A.passo - 5;
      }
    }
    // 2. di fianco alle case fuori citta': parallele a uno dei muri, a A.casa m dal muro (porte escluse da metti)
    for (const h of this.houses92 || []) {
      if (n >= A.strade) break;
      const lati = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => rng() - 0.5);
      for (const [sx, sz] of lati) {
        const x = h.x + sx * (h.w / 2 + A.casa + A.larg), z = h.z + sz * (h.d / 2 + A.casa + A.larg);
        const rot = (sx ? Math.PI / 2 : 0) + (rng() < 0.5 ? Math.PI : 0);   // lungo il muro
        if (metti(x, z, rot, 'casa')) break;
      }
    }
    this.autoStrade115N = n; return n;
  }
