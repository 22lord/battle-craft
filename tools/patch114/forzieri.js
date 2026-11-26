/* ============================================================
   v114: FORZIERI CON BOTTINO E MEDIKIT DA PORTARE
   ============================================================
   Due sistemi, separati, che si appoggiano a quelli che c'erano gia':
   - Forzieri114: forzieri sparsi sulla mappa. Si aprono col tasto Raccogli guardandoli (raggio dalla
     telecamera) o standoci davanti; ognuno si apre UNA volta sola; il coperchio ruota sulla cerniera e
     ne esce un'arma estratta a caso, pesata per rarita'. L'arma cade a terra come le altre (Items) e
     porta con se' la sua rarita', che cambia il danno.
   - Medikit114: i kit medici non si consumano piu' raccogliendoli: vanno nello zaino (fino a
     MEDIKIT114.max) e si usano col loro tasto. La cura richiede un tempo e non supera mai la vita massima.
   Il modello del forziere e' quello di Lorenzo (forziere_v3.glb), alleggerito e diviso in cassa +
   coperchio da tools/forziere114/prepara.cjs: FORZIERE114_B64. Se manca si usa un forziere di scatole. */

/* RARITA' DEL BOTTINO. Le chiavi sono quelle di RARITY (colori del gioco).
   - peso: probabilita' relativa (50/30/15/5 = 50%, 30%, 15%, 5%)
   - danno: moltiplicatore del danno dell'arma rispetto alla sua scheda in WEAPONS   [stimato, da provare giocando]
   Le armi gia' presenti (quella iniziale, quelle a terra, quelle dei bot) NON hanno rarita' e restano come prima. */
const RARITA114 = {
  common: { nome: 'Comune', peso: 50, danno: 0.90 },
  rare: { nome: 'Rara', peso: 30, danno: 1.00 },
  epic: { nome: 'Epica', peso: 15, danno: 1.08 },
  leg: { nome: 'Leggendaria', peso: 5, danno: 1.16 },
};
/* QUALI ARMI ESCONO DAI FORZIERI: peso relativo fra le armi possibili, e in quali rarita' puo' uscire.
   Il fucile di precisione esce solo epico o leggendario. Prima si estrae la rarita', poi l'arma fra
   quelle che la ammettono. */
const BOTTINO114 = {
  ar: { peso: 5, rarita: ['common', 'rare', 'epic', 'leg'] },
  sg: { peso: 4, rarita: ['common', 'rare', 'epic', 'leg'] },
  sn: { peso: 1.5, rarita: ['epic', 'leg'] },
};
/* IL FORZIERE.
   - quanti: forzieri per partita; distanza: minima fra due forzieri (m)
   - scala: il modello originale e' largo 1,38 m e alto 1,02: 0,8 lo porta a 1,1 x 0,82
   - portata: fino a che distanza (m, dal bordo del forziere) il tasto lo apre
   - vicino: senza mirarlo, si apre se sei entro questa distanza e gli stai di fronte
   - angolo / durata: apertura del coperchio (gradi, secondi); il bottino esce a 'esce' secondi
   - lancio / lancioSu: spinta (m/s) dell'arma che salta fuori verso chi apre */
const FORZIERE114 = { quanti: 18, distanza: 28, scala: 0.8, portata: 2.4, vicino: 1.4, angolo: 108, durata: 0.55, esce: 0.22, lancio: 2.0, lancioSu: 4.6, bagliore: 1.3 };
// misure del modello (prima della scala), lette da prepara.cjs: mezza larghezza, mezza profondita', altezza
const FORZIERE114_DIM = { hx: 0.69, hz: 0.49, h: 1.02 };
/* MEDIKIT DA PORTARE.
   - max: quanti se ne portano; cura: vita restituita da uno; tempo: secondi per usarlo
   La cura si interrompe sparando, cambiando modalita' (costruzione, piccone) o morendo; il kit resta. */
const MEDIKIT114 = { max: 3, cura: 50, tempo: 2.0 };

// scelta pesata: voci = [{ k, peso }], rng in [0,1)
function sceltaPesata114(voci, rng) {
  let tot = 0; for (const v of voci) tot += Math.max(0, v.peso);
  let r = rng() * tot; for (const v of voci) { r -= Math.max(0, v.peso); if (r < 0) return v.k; }
  return voci[voci.length - 1].k;
}
/* Estrae l'arma di un forziere e restituisce i suoi dati. rng = generatore in [0,1) (di serie Math.random,
   i test ne passano uno con seme). */
function estraiArma114(rng = Math.random) {
  const possibili = Object.keys(RARITA114).filter((r) => Object.values(BOTTINO114).some((a) => a.rarita.includes(r)));
  const rarita = sceltaPesata114(possibili.map((k) => ({ k, peso: RARITA114[k].peso })), rng);
  const arma = sceltaPesata114(Object.keys(BOTTINO114).filter((w) => BOTTINO114[w].rarita.includes(rarita)).map((k) => ({ k, peso: BOTTINO114[k].peso })), rng);
  const def = WEAPONS[arma], R = RARITA114[rarita];
  return {
    arma, nome: def.name, rarita, nomeRarita: R.nome, colore: RARITY[rarita].col, css: RARITY[rarita].css,
    moltDanno: R.danno, danno: Math.max(1, Math.round(def.dmg * R.danno)), caricatore: def.mag,
    munizioni: ITEM_DEFS[arma].ammo, tipoMunizioni: def.ammo,
  };
}
// moltiplicatore del danno di una casella dell'inventario ({ w, mag, rar }): 1 se l'arma non ha rarita'
function moltRarita114(s) { return s && s.rar && RARITA114[s.rar] ? RARITA114[s.rar].danno : 1; }
// rarita' da mostrare (colore della casella): quella dell'arma se c'e', se no quella del tipo
function raritaDi114(s) { return s ? (s.rar || WEAPONS[s.w].rarity) : ''; }

let FORZIERE114_MOD = null;   // { root } dal GLB, o null (si usa il forziere di scatole)
async function caricaForziere114() {
  try { FORZIERE114_MOD = typeof FORZIERE114_B64 === 'undefined' ? null : buildGLBScene(parseGLB(await gunzip(b64bytes(FORZIERE114_B64)))).root; }
  catch (e) { FORZIERE114_MOD = null; if (typeof assetError85 === 'function') assetError85('Forziere', e); }
  return FORZIERE114_MOD;
}

class Forzieri114 {
  constructor(G) {
    this.G = G; this.lista = []; this.group = new THREE.Group(); this.group.name = 'forzieri114'; G.scene.add(this.group);
    this._ray = new THREE.Ray(); this._box = new THREE.Box3(); this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._su = new THREE.Vector3(0, 1, 0); this._tmp = [];
    this.ultimo = null;   // dati dell'ultima arma uscita (per test e interfaccia)
  }
  static get cfg() { return { FORZIERE114, RARITA114, BOTTINO114, MEDIKIT114, estraiArma114, moltRarita114, caricaForziere114, modello: () => FORZIERE114_MOD }; }

  // --- modello: il GLB clonato (geometrie e materiali condivisi) o due scatole ---
  _modello() {
    if (FORZIERE114_MOD) {
      const root = FORZIERE114_MOD.clone(true); const lid = root.getObjectByName('Coperchio');
      if (lid) return { root, lid };
    }
    if (!this._riserva) {
      const legno = new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 0.8 }), ferro = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.5, metalness: 0.6 });
      const D = FORZIERE114_DIM, corpo = new THREE.BoxGeometry(D.hx * 2, 0.64, D.hz * 1.7); corpo.translate(0, 0.32, 0);
      const cop = new THREE.BoxGeometry(D.hx * 2, 0.34, D.hz * 1.7); cop.translate(0, 0.17, D.hz * 0.85);
      const fascia = new THREE.BoxGeometry(D.hx * 2.04, 0.08, D.hz * 1.74); fascia.translate(0, 0.62, 0);
      this._riserva = { corpo, cop, fascia, legno, ferro };
    }
    const R = this._riserva, root = new THREE.Group();
    const m = (g, mat, parent) => { const me = new THREE.Mesh(g, mat); me.castShadow = me.receiveShadow = true; parent.add(me); return me; };
    m(R.corpo, R.legno, root); m(R.fascia, R.ferro, root);
    const lid = new THREE.Group(); lid.name = 'Coperchio'; lid.position.set(0, 0.66, -FORZIERE114_DIM.hz * 0.85); root.add(lid); m(R.cop, R.legno, lid);
    return { root, lid };
  }
  _bagliore() {
    if (!this._bagMat) {
      let tex = null;
      try {
        const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
        const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 64, 64); tex = new THREE.CanvasTexture(c);
      } catch (e) { tex = null; }
      this._bagTex = tex;
    }
    const mat = new THREE.SpriteMaterial({ map: this._bagTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const s = new THREE.Sprite(mat); s.visible = false; return s;
  }

  // --- piazzamento: vicino ai punti del bottino della mappa, su terreno piano, senza toccare niente ---
  piazza(rng = Math.random) {
    this.reset();
    const G = this.G, W = G.world, P = G.physics, S = FORZIERE114.scala, D = FORZIERE114_DIM;
    const cand = (W.itemSpawns || []).map(([, x, z, yo]) => [x, z, yo || 0]);
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    for (const [x0, z0, yo] of cand) {
      if (this.lista.length >= FORZIERE114.quanti) break;
      if (this.lista.some((f) => Math.hypot(f.x - x0, f.z - z0) < FORZIERE114.distanza)) continue;
      const yRef = terrainHeight(x0, z0) + yo + 1.5;
      for (let k = 0; k < 8; k++) {
        const a = (k + rng()) * Math.PI / 4, x = x0 + Math.sin(a) * 1.8, z = z0 + Math.cos(a) * 1.8;
        if (this.lista.some((f) => Math.hypot(f.x - x, f.z - z) < FORZIERE114.distanza)) continue;
        const rot = Math.floor(rng() * 4) * Math.PI / 2, lungoX = Math.abs(Math.sin(rot)) < 0.5;
        const hx = (lungoX ? D.hx : D.hz) * S, hz = (lungoX ? D.hz : D.hx) * S;
        const y = P.supportHeight(x, z, yRef);
        if (y < MARE + 0.15 || Math.abs(y - (yRef - 1.5)) > 1.2) continue;
        let piano = true; for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (Math.abs(P.supportHeight(x + sx * hx, z + sz * hz, y + 0.6) - y) > 0.12) piano = false;
        if (!piano) continue;
        const min = new THREE.Vector3(x - hx, y + 0.05, z - hz), max = new THREE.Vector3(x + hx, y + D.h * S, z + hz);
        if (P.query(min, max, this._tmp).length) continue;
        /* appoggio solo su terreno o pavimenti ('static'): sopra una roccia o un'auto la collisione e'
           piu' grande e piu' piatta di quello che si vede, e il forziere sembrerebbe sospeso */
        min.y = y - 0.1; max.y = y + 0.02;
        if (P.query(min, max, this._tmp).some((o) => o.tag !== 'static' && o.max.y <= y + 0.02)) continue;
        if (G.items && G.items.list.some((it) => Math.abs(it.x - x) < hx + 0.5 && Math.abs(it.z - z) < hz + 0.5)) continue;
        this.aggiungi(x, y, z, rot); break;
      }
    }
    return this.lista.length;
  }
  aggiungi(x, y, z, rot = 0) {
    const S = FORZIERE114.scala, D = FORZIERE114_DIM, { root, lid } = this._modello();
    root.position.set(x, y, z); root.rotation.y = rot; root.scale.setScalar(S); this.group.add(root);
    const lungoX = Math.abs(Math.sin(rot)) < 0.5, hx = (lungoX ? D.hx : D.hz) * S, hz = (lungoX ? D.hz : D.hx) * S;
    const col = this.G.physics.add({ type: 'box', tag: 'forziere', min: new THREE.Vector3(x - hx, y, z - hz), max: new THREE.Vector3(x + hx, y + 0.66 * S, z + hz) });
    const bag = this._bagliore(); bag.position.set(0, 0.75, 0); root.add(bag);
    const f = { x, y, z, rot, root, lid, col, bag, aperto: false, t: -1, uscito: false, chi: null, bottino: null,
      box: new THREE.Box3(new THREE.Vector3(x - hx, y, z - hz), new THREE.Vector3(x + hx, y + D.h * S, z + hz)) };
    col.forziere114 = f; this.lista.push(f); return f;
  }
  reset() {
    for (const f of this.lista) { this.G.physics.remove(f.col); this.group.remove(f.root); f.bag.material.dispose(); }
    this.lista.length = 0; this.ultimo = null;
  }

  /* Quale forziere apre il tasto adesso: quello colpito dal raggio della telecamera (se nessun muro e' in
     mezzo e sei a portata), se no quello chiuso a meno di 'vicino' metri davanti a te. */
  bersaglio(ch) {
    if (!ch || !ch.alive || ch.air88 || !this.lista.length) return null;
    const G = this.G, cam = G.cam; let best = null, bt = Infinity;
    if (cam && cam.pos && cam.dir) {
      this._ray.set(cam.pos, cam.dir);
      for (const f of this.lista) {
        if (f.aperto || f.box.distanceToPoint(this._v.set(ch.pos.x, ch.pos.y + 0.9, ch.pos.z)) > FORZIERE114.portata) continue;
        const hit = this._ray.intersectBox(f.box, this._w); if (!hit) continue;
        const t = hit.distanceTo(cam.pos); if (t >= bt) continue;
        const r = G.physics.raycast(cam.pos, cam.dir, t + 0.05, { chars: false });
        if (r.hit && r.col !== f.col && r.dist < t - 0.05) continue;   // un muro in mezzo
        best = f; bt = t;
      }
      if (best) return best;
    }
    const fw = ch.forward(); let bd = FORZIERE114.vicino;
    for (const f of this.lista) {
      if (f.aperto) continue;
      const d = f.box.distanceToPoint(this._v.set(ch.pos.x, ch.pos.y + 0.5, ch.pos.z)); if (d > bd) continue;
      const dx = f.x - ch.pos.x, dz = f.z - ch.pos.z, l = Math.hypot(dx, dz) || 1;
      if ((dx * fw.x + dz * fw.z) / l < 0.3) continue;
      best = f; bd = d;
    }
    return best;
  }
  /* Apre il forziere f per ch. Torna i dati dell'arma estratta, o null se era gia' aperto.
     Il segno 'aperto' si mette SUBITO: un secondo tasto (o un secondo giocatore) nello stesso istante non
     estrae un'altra arma. L'arma esce dopo FORZIERE114.esce secondi, quando il coperchio e' su. */
  apri(f, ch, rng = Math.random) {
    if (!f || f.aperto) return null;
    f.aperto = true; f.t = 0; f.chi = ch || null; f.bottino = estraiArma114(rng); this.ultimo = f.bottino;
    const G = this.G, A = G.audio;
    try { if (A && A.ok && A.ok()) { A._noise(0.22, 700, 1.5, 0.16); A._tone(330, 0.18, 0.16, 'triangle', 520); A._tone(660, 0.22, 0.12, 'triangle', 990, 0.18); } } catch (e) { }
    if (ch && ch.isPlayer && G.hud) G.hud.toast('Forziere aperto!', true);
    return f.bottino;
  }
  _esce(f) {
    f.uscito = true; const G = this.G, b = f.bottino, S = FORZIERE114.scala;
    const it = G.items.spawn(b.arma, f.x, f.z, 0); if (!it) return;
    let dx = 0, dz = 1; if (f.chi) { dx = f.chi.pos.x - f.x; dz = f.chi.pos.z - f.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    it.y = f.y + FORZIERE114_DIM.h * S + 0.15; it.g.position.set(it.x, it.y, it.z);
    it.v = new THREE.Vector3(dx * FORZIERE114.lancio, FORZIERE114.lancioSu, dz * FORZIERE114.lancio); it.volo = 0;
    it.mag109 = b.caricatore; it.res109 = b.munizioni; G.items.rarita114(it, b.rarita);
    if (G.fx && G.fx.burst) G.fx.burst(this._v.set(f.x, f.y + 0.7 * S, f.z), 22, b.colore, 3.2, 0.9, 0, this._su);
    f.bag.material.color.setHex(b.colore); f.bag.visible = true;
    if (f.chi && f.chi.isPlayer && G.hud) G.hud.toast(`${b.nome} · ${b.nomeRarita}`, true);
  }
  update(dt) {
    const F = FORZIERE114;
    for (const f of this.lista) {
      if (f.t < 0) continue;
      f.t += dt;
      // ritorno elastico (easeOutBack): il coperchio sbatte un filo oltre e torna
      const u = Math.min(1, f.t / F.durata), c1 = 1.4, e = 1 + (c1 + 1) * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
      f.lid.rotation.x = -F.angolo * DEG * e;
      if (!f.uscito && f.t >= F.esce) this._esce(f);
      if (f.uscito) { const k = Math.max(0, 1 - (f.t - F.esce) / F.bagliore); f.bag.material.opacity = 0.9 * k; f.bag.scale.setScalar(0.6 + (1 - k) * 1.6); if (k <= 0) f.bag.visible = false; }
      if (f.t > F.esce + F.bagliore && u >= 1) f.t = -1;   // animazione finita: il forziere resta aperto
    }
  }
  // al telefono: toccare il forziere sullo schermo lo apre (come gli oggetti, TOUCH105)
  tocco(x, y, ch) {
    const G = this.G, cam = G.camera; if (!cam || !ch) return false;
    const W = innerWidth, H = innerHeight; let best = null, bd = TOUCH105.raggioPx * TOUCH105.raggioPx * 2;
    for (const f of this.lista) {
      if (f.aperto) continue;
      const dist = f.box.distanceToPoint(this._v.set(ch.pos.x, ch.pos.y + 0.9, ch.pos.z)); if (dist > TOUCH105.vista) continue;
      this._w.set(f.x, f.y + 0.4, f.z).project(cam); if (this._w.z > 1) continue;
      const sx = (this._w.x + 1) / 2 * W, sy = (1 - this._w.y) / 2 * H, d = (sx - x) ** 2 + (sy - y) ** 2;
      if (d < bd) { bd = d; best = { f, dist }; }
    }
    if (!best) return false;
    if (best.dist > FORZIERE114.portata) { G.hud.toast('Avvicinati per aprirlo'); return true; }
    this.apri(best.f, ch); return true;
  }
}

class Medikit114 {
  constructor(G) { this.G = G; this.t = -1; this.ch = null; this.modo = ''; }
  attivo() { return this.t >= 0; }
  progresso() { return this.t < 0 ? 0 : Math.min(1, this.t / MEDIKIT114.tempo); }
  // prova a cominciare la cura; torna il motivo se non si puo' ('' = cominciata)
  inizia(ch) {
    const G = this.G; let no = '';
    if (!ch || !ch.alive) no = 'Sei a terra';
    else if (ch.air88) no = 'Non in volo';
    else if (this.attivo()) no = 'Ti stai già curando';
    else if (!(ch.medikit114 > 0)) no = 'Nessun medikit';
    else if (ch.hp >= ch.maxHp) no = 'Vita già piena';
    if (no) { if (G.hud) G.hud.toast(no); return no; }
    this.ch = ch; this.t = 0; this.modo = ch.mode; ch.reloading = false; ch.ads = false;
    if (G.hud) G.hud.toast('Medikit: ti stai curando…', true);
    return '';
  }
  annulla(motivo) { if (!this.attivo()) return; this.t = -1; this.ch = null; if (motivo && this.G.hud) this.G.hud.toast(motivo); }
  update(dt) {
    if (!this.attivo()) return;
    const ch = this.ch, G = this.G;
    if (!ch.alive || ch.air88) return this.annulla();
    if (ch.mode !== this.modo) return this.annulla('Cura interrotta');
    this.t += dt;
    if (this.t < MEDIKIT114.tempo) return;
    const prima = ch.hp; ch.medikit114--; ch.heal(MEDIKIT114.cura); this.t = -1; this.ch = null;
    if (ch.isPlayer && G.hud) { G.hud.toast(`+${Math.round(ch.hp - prima)} vita`, true); G.hud.refreshHotbar(); G.hud.dirty = true; }
    if (G.audio && G.audio.pickup) G.audio.pickup();
    if (G.fx && G.fx.burst) G.fx.burst(new THREE.Vector3(ch.pos.x, ch.pos.y + 1, ch.pos.z), 12, 0x7dff8a, 2, 0.6, 0, new THREE.Vector3(0, 1, 0));
  }
  reset() { this.t = -1; this.ch = null; }
}

// v114: il kit medico c'era in ITEM_DEFS ma non usciva mai sulla mappa. Adesso si porta (vedi RACCOLTA109.medikit)
ITEM_DEFS.medkit.label = 'Medikit (+' + MEDIKIT114.cura + ' vita)';
MEDIKIT114.aTerra = 12;   // medikit sparsi a terra per partita, accanto ai punti delle pozioni e delle bende
function spargiMedikit114(G, rng = Math.random) {
  const W = G.world, P = G.physics, sp = (W.itemSpawns || []).filter((s) => s[0] === 'shieldS' || s[0] === 'bandage');
  const passo = Math.max(1, Math.floor(sp.length / MEDIKIT114.aTerra)), tmp = []; let n = 0;
  for (let i = Math.floor(rng() * passo); i < sp.length && n < MEDIKIT114.aTerra; i += passo) {
    const [, x0, z0, yo] = sp[i], x = x0 + 0.9, z = z0 - 0.7, y = P.supportHeight(x, z, terrainHeight(x0, z0) + (yo || 0) + 1.5);
    if (y < MARE + 0.1 || P.query(new THREE.Vector3(x - 0.3, y + 0.1, z - 0.3), new THREE.Vector3(x + 0.3, y + 0.6, z + 0.3), tmp).length) continue;
    if (G.items.spawn('medkit', x, z, yo || 0)) n++;
  }
  return n;
}
