// v103: scivolamento dei piedi in appoggio, accovacciati, alle velocita' VERE del gioco
// (2,6 e 4,6 m/s x 0,28). Uso: node test/scivolamento.cjs index.html [check]
// Banco piatto e vuoto, dt = 1/60 fisso e velocita' costante: niente ostacoli che falsano.
// Appoggio = caviglia entro 2 cm dal suo punto piu' basso nella prova. Per ogni appoggio
// misuro quanto si sposta la caviglia in orizzontale nel mondo (dovrebbe essere ~0).
const { load, THREE: T } = require('./harness-lite.cjs'); const assert = require('assert');
(async () => {
  const c = load(process.argv[2]); await c.init(); const A = c.API;
  const misura = (v, accovacciato) => {
    const G = { scene: new T.Scene(), physics: new A.Physics(), time: 0, chars: [], world: {} }; G.physics.supportHeight = () => 0;
    const p = new A.Character(G, { isPlayer: true, colors: A.PALETTES[0] }); G.player = p; G.chars = [p]; p.onGround = true; p.pos.set(0, 0, 0); p.giveWeapon('ar');
    for (let i = 0; i < 60; i++) { G.time += 1 / 60; p.animate(1 / 60); }
    p.crouch90 = accovacciato; const piedi = [p.model.legL.ft, p.model.legR.ft], tr = [[], []];
    for (let i = 0; i < 600; i++) {
      p.yaw = 0; p.vel.set(0, 0, v); p.pos.addScaledVector(p.vel, 1 / 60); G.time += 1 / 60;
      if (A.updateCrouch90) A.updateCrouch90(G, p, 1 / 60); p.animate(1 / 60);
      if (i >= 120) piedi.forEach((b, k) => tr[k].push(b.getWorldPosition(new T.Vector3())));
    }
    let peggio = 0, somma = 0, n = 0, velMax = 0;
    for (const t of tr) {
      const ymin = Math.min(...t.map((q) => q.y)); let start = null;
      for (let i = 0; i <= t.length; i++) {
        const giu = i < t.length && t[i].y < ymin + 0.02;
        if (giu && i > 0) velMax = Math.max(velMax, Math.hypot(t[i].x - t[i - 1].x, t[i].z - t[i - 1].z) * 60);
        if (giu && start === null) start = i;
        if (!giu && start !== null) { const a = t[start], b = t[i - 1]; if (i - start >= 6) { const d = Math.hypot(b.x - a.x, b.z - a.z); peggio = Math.max(peggio, d); somma += d; n++; } start = null; }
      }
    }
    return { v, appoggi: n, scivolamentoMedio_cm: +(somma / Math.max(1, n) * 100).toFixed(1), scivolamentoMax_cm: +(peggio * 100).toFixed(1) };   // tolta la velocita' massima in appoggio: conta i fotogrammi di contatto e stacco, dava >100% anche in piedi
  };
  const r = { accovacciatoCammina: misura(2.6 * 0.28, true), accovacciatoCorre: misura(4.6 * 0.28, true), inPiediCammina: misura(2.6, false), inPiediCorre: misura(4.6, false) };
  console.log(JSON.stringify(r, null, 1));
  if (process.argv[3] === 'check') { for (const k of ['accovacciatoCammina', 'accovacciatoCorre']) assert(r[k].scivolamentoMax_cm < 3, k + ': il piede in appoggio scivola'); console.log('SCIVOLAMENTO PASS'); }
})().catch((e) => { console.error(e.stack); process.exit(1); });
