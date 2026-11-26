/* Prova del server con client VERI (SDK Colyseus, WebSocket), niente finti.
   Uso: node test/stanza.mjs            -> avvia un server suo su una porta libera
        node test/stanza.mjs ws://host  -> prova un server gia' acceso (anche online; la fine partita aspetta 8 s) */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from '@colyseus/sdk';
import { validaStato, REGOLE, pulisciNome, nuovoCodice, secchiello } from '../src/regole.js';

const qui = path.dirname(fileURLToPath(import.meta.url));
let ok = 0, ko = 0;
const prova = (nome, cond, info = '') => { if (cond) { ok++; console.log('  PASS', nome); } else { ko++; console.log('  FAIL', nome, typeof info === 'string' ? info : JSON.stringify(info)); } };
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
async function finche(cond, ms = 3000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await aspetta(20); } return cond(); }
const zitto = (r) => { for (const t of ['benvenuto', 'sparo', 'eliminato', 'fine', 'pong', 'correggi', 'piccone', 'bots', 'pezzo', 'pezzi', 'dannoPezzo', 'modifica', 'rotto', 'errore']) r.onMessage(t, () => {}); return r; };

console.log('regole (senza rete)');
{
  const p = { x: 0, y: 5, z: 0, ts: 1000 };
  prova('passo di corsa accettato', validaStato({ x: 0.23, y: 5, z: 0, ts: 1050 }, p, 0).ok);
  prova('teletrasporto di 10 m rifiutato', !validaStato({ x: 10, y: 5, z: 0, ts: 1050 }, p, 0).ok);
  prova('salita di 5 m in 50 ms rifiutata', !validaStato({ x: 0, y: 10, z: 0, ts: 1050 }, p, 0).ok);
  prova('salto (0,4 m in 50 ms) accettato', validaStato({ x: 0, y: 5.4, z: 0, ts: 1050 }, p, 0).ok);
  prova('caduta di 3 m in 100 ms accettata', validaStato({ x: 0, y: 2, z: 0, ts: 1100 }, p, 0).ok);
  prova('pacchetto vecchio (ts non avanza) scartato', validaStato({ x: 0, y: 5, z: 0, ts: 1000 }, p, 0).motivo === 'vecchio');
  prova('senza ts rifiutato', !validaStato({ x: 0, y: 5, z: 0 }, p, 0).ok);
  prova('sul bus (in alto) si sta ovunque', validaStato({ x: 150, y: 108, z: -90, ts: 1050, aria: 'bus' }, p, 0).ok);
  prova('"sul bus" a 20 m d\'altezza rifiutato', !validaStato({ x: 150, y: 20, z: -90, ts: 1050, aria: 'bus' }, p, 0).ok);
  const pa = { x: 0, y: 80, z: 0, ts: 1000, aria: 'fall' };
  prova('in caduta 16 m/s accettati', validaStato({ x: 0.8, y: 79, z: 0, ts: 1050, aria: 'fall' }, pa, 0).ok);
  prova('a piedi 16 m/s rifiutati', !validaStato({ x: 1.6, y: 5, z: 0, ts: 1100 }, p, 0).ok);
  {
    const o = {}; validaStato({ x: 0, y: 5, z: 0, ts: 0 }, null, 10000, o); let q = { x: 0, y: 5, z: 0, ts: 0 }, tutti = true;
    for (let i = 1; i <= 20; i++) { const m = { x: i * 0.23, y: 5, z: 0, ts: i * 50 }; const r = validaStato(m, q, 11000, o); if (!r.ok) tutti = false; q = { x: m.x, y: 5, z: 0, ts: m.ts }; }
    prova('grappolo di pacchetti in ritardo accettato', tutti);
  }
  {
    const o = {}; validaStato({ x: 0, y: 5, z: 0, ts: 0 }, null, 1200, o); let q = { x: 0, y: 5, z: 0, ts: 0 }, tutti = true;
    for (let i = 1; i <= 40; i++) { const m = { x: i * 0.2, y: 5, z: 0, ts: i * 50 }; const r = validaStato(m, q, i * 50 + 10, o); if (!r.ok) tutti = false; q = { x: m.x, y: 5, z: 0, ts: m.ts }; }
    prova('primo pacchetto in ritardo all avvio: niente correzioni dopo', tutti);
  }
  {
    const o = {}; validaStato({ x: 0, y: 5, z: 0, ts: 0 }, null, 0, o); let q = { x: 0, y: 5, z: 0, ts: 0 }, arrivato = 0;
    for (let i = 1; i <= 10; i++) { const m = { x: q.x + 6, y: 5, z: 0, ts: i * 1000 }; const r = validaStato(m, q, i * 100, o); if (r.ok) { q = { x: m.x, y: 5, z: 0, ts: m.ts }; arrivato = m.x; } }
    prova('orologio truccato: al massimo ~3 s di corsa in piu (anticipo + credito)', arrivato <= 19, arrivato);
  }
  {
    const o = {}; validaStato({ x: 0, y: 5, z: 0, ts: 0 }, null, 0, o); let q = { x: 0, y: 5, z: 0, ts: 0 }, arrivato = 0;
    for (let i = 1; i <= 20; i++) { const m = { x: q.x + 6, y: 5, z: 0, ts: i * 1000 }; const r = validaStato(m, q, 20000, o); if (r.ok) { q = { x: m.x, y: 5, z: 0, ts: m.ts }; arrivato = m.x; } }
    prova('20 s di silenzio: in un colpo solo al massimo ~5 s di corsa', arrivato <= 31, arrivato);
  }
  {
    const sec = {}; let n = 0; for (let i = 0; i < 100; i++) if (secchiello(sec, 5000)) n++;
    let m = 0; for (let i = 0; i < 40; i++) if (secchiello(sec, 5000 + i * 25)) m++;
    prova('secchiello: grappolo limitato, poi ~30 al secondo', n === REGOLE.secchiello.capienza && m >= 20 && m <= 32, [n, m]);
  }
  prova('NaN rifiutato', !validaStato({ x: NaN, y: 0, z: 0, ts: 1 }, null, 0).ok);
  prova('fuori mappa rifiutato', !validaStato({ x: 900, y: 0, z: 0, ts: 1 }, null, 0).ok);
  prova('arma sconosciuta ripulita', validaStato({ x: 0, y: 0, z: 0, ts: 1, arma: 'bazooka', mira: true }, null, 0).stato.arma === '');
  prova('nome ripulito', pulisciNome('<script>alert(1)</script>xxxxxxxxxxxxxxxx').indexOf('<') < 0 && pulisciNome('').length > 0);
  const occ = new Set(); for (let i = 0; i < 200; i++) occ.add(nuovoCodice(occ));
  prova('200 codici tutti diversi, 4 caratteri', occ.size === 200 && [...occ].every((c) => /^[A-Z2-9]{4}$/.test(c)));
}

let url = process.argv[2], figlio = null, fineS = REGOLE.fineS;
if (!url) {
  const porta = 20000 + Math.floor(Math.random() * 20000);
  figlio = spawn(process.execPath, [path.join(qui, '..', 'src', 'index.js')], { env: { ...process.env, PORT: String(porta), BC_FINE_S: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; figlio.stdout.on('data', (d) => { log += d; }); figlio.stderr.on('data', (d) => { log += d; });
  await finche(() => log.includes('in ascolto'), 8000);
  url = `ws://127.0.0.1:${porta}`; fineS = 1;
  process.on('exit', () => figlio.kill());
}
console.log('rete:', url);

/* avvia una partita: l'host preme Avvia, tutti mandano "pronto", aspetto la fase "partita" */
async function partita(host, tutti, opz = {}) {
  host.send('avvia');
  await finche(() => host.state.fase === 'carico');
  for (const r of tutti) r.send('pronto', r === host ? { scudi: opz.scudi || [] } : {});
  await finche(() => host.state.fase === 'partita', 5000);
}
const st = (r, id) => r.state.giocatori.get(id);
const ts = () => performance.now();

try {
  // ---------- stanza, codice, 10 giocatori ----------
  const A = new Client(url), B = new Client(url), C = new Client(url);
  const ra = zitto(await A.create('battle', { nome: 'Lorenzo', prato: true }));
  const codice = ra.roomId;
  prova('stanza creata con codice di 4 caratteri, modo prato', /^[A-Z2-9]{4}$/.test(codice) && await finche(() => ra.state.modo === 'prato'), codice);
  prova('chi crea e\' l\'host, si parte in lobby', await finche(() => ra.state.host === ra.sessionId && ra.state.fase === 'lobby'));
  let errore = null; ra.onMessage('errore', (m) => { errore = m; });
  ra.send('avvia'); await finche(() => errore, 1500);
  prova('da solo e senza bot non si avvia', errore && ra.state.fase === 'lobby', errore);
  const rb = zitto(await B.joinById(codice, { nome: 'Amico' }));
  await finche(() => ra.state.giocatori.size === 2);
  prova('due giocatori nella stanza', ra.state.giocatori.size === 2 && rb.state.giocatori.size === 2);
  prova('nickname visibili all\'altro', st(rb, ra.sessionId)?.nome === 'Lorenzo' && st(ra, rb.sessionId)?.nome === 'Amico');
  const altri = []; for (let i = 0; i < REGOLE.maxGiocatori - 2; i++) altri.push(zitto(await new Client(url).joinById(codice, { nome: 'G' + (i + 3) })));
  await finche(() => ra.state.giocatori.size === REGOLE.maxGiocatori);
  prova('10 giocatori nella stanza', ra.state.giocatori.size === 10, ra.state.giocatori.size);
  let undicesimo = null; try { await C.joinById(codice, { nome: 'Undicesimo' }); undicesimo = 'entrato'; } catch (e) { undicesimo = 'rifiutato'; }
  prova('undicesimo giocatore rifiutato', undicesimo === 'rifiutato');
  for (const r of altri) await r.leave(true);
  await finche(() => ra.state.giocatori.size === 2);
  prova('gli altri 8 escono: restano in 2', ra.state.giocatori.size === 2);
  let inesistente = null; try { await C.joinById('ZZZZ', {}); inesistente = 'entrato'; } catch (e) { inesistente = 'rifiutato'; }
  prova('codice inesistente rifiutato', inesistente === 'rifiutato');
  rb.send('avvia'); await aspetta(300);
  prova('chi non e\' host non avvia', ra.state.fase === 'lobby');
  rb.send('impostaBot', 5); await aspetta(200);
  prova('chi non e\' host non sceglie i bot', ra.state.nBot === 0);

  // ---------- avvio: carico, pronti, stanza chiusa ----------
  ra.send('avvia'); await finche(() => ra.state.fase === 'carico');
  prova('avvio: fase "carico" con un seme', ra.state.fase === 'carico' && ra.state.seme > 0, [ra.state.fase, ra.state.seme]);
  ra.send('pronto', {}); await aspetta(300);
  prova('finche\' non sono tutti pronti il bus non parte', ra.state.fase === 'carico');
  rb.send('pronto', {}); await finche(() => ra.state.fase === 'partita');
  prova('tutti pronti: "partita" con l\'ora di partenza', ra.state.fase === 'partita' && ra.state.via > Date.now() - 2000, ra.state.via - Date.now());
  let chiusa = null; try { await C.joinById(codice, { nome: 'Ritardatario' }); chiusa = 'entrato'; } catch (e) { chiusa = 'rifiutato'; }
  prova('a partita iniziata la stanza e\' chiusa', chiusa === 'rifiutato');
  let pong = null; ra.onMessage('pong', (m) => { pong = m; }); ra.send('ping', 123); await finche(() => pong);
  prova('il ping riporta l\'ora del server', pong && pong.t === 123 && Math.abs(pong.s - Date.now()) < 5000, pong);

  // ---------- movimento ----------
  let corr0 = null; ra.onMessage('correggi', (m) => { corr0 = corr0 || m; });
  const t0 = ts(); ra.send('stato', { x: 100, y: 3, z: 100, aTerra: true, ts: t0 }); await finche(() => corr0);
  const sp = REGOLE.spawn[st(ra, ra.sessionId).spawn];
  prova('primo stato lontano dal posto di partenza rifiutato', corr0 && Math.abs(corr0.x - sp[0]) < 0.01, corr0);
  await aspetta(60);
  let x = sp[0], z = sp[1]; const y = 3.2;
  for (let i = 0; i < 20; i++) { x += 0.2; ra.send('stato', { ts: ts(), x, y, z, vx: 4, vy: 0, vz: 0, yaw: 1.2, pitch: -0.1, aTerra: true, accov: i > 15, mira: false, arma: 'ar', modo: 'weapon' }); await aspetta(50); }
  await finche(() => Math.abs(st(rb, ra.sessionId).x - x) < 0.01);
  const visto = st(rb, ra.sessionId);
  prova('B vede la posizione di A', Math.abs(visto.x - x) < 0.01 && Math.abs(visto.z - z) < 0.01, `${visto.x} vs ${x}`);
  prova('B riceve il tempo di invio di A', visto.ts > t0, visto.ts);
  prova('B vede rotazione, velocita\' e accovacciamento di A', Math.abs(visto.yaw - 1.2) < 1e-3 && Math.abs(visto.vx - 4) < 1e-3 && visto.accov === true && visto.arma === 'ar');
  let corr = null; ra.onMessage('correggi', (m) => { corr = m; });
  await aspetta(60); ra.send('stato', { x: x + 40, y, z, aTerra: true, ts: ts() });
  await finche(() => corr); await aspetta(150);
  prova('teletrasporto corretto dal server', corr && Math.abs(corr.x - x) < 0.01, corr);
  prova('B non vede il teletrasporto', Math.abs(st(rb, ra.sessionId).x - x) < 0.01);

  // ---------- colpi e danni ----------
  {
    const gA = () => st(rb, ra.sessionId), gB = () => st(ra, rb.sessionId);
    const pa = REGOLE.spawn[gA().spawn], pb = REGOLE.spawn[gB().spawn];
    const yawAB = Math.atan2(pb[0] - pa[0], pb[1] - pa[1]);
    // A torna a passi verso il suo posto (a 4 m), B fermo al suo
    for (let xx = x; xx > pa[0] + 0.01; xx = Math.max(pa[0], xx - 0.2)) { ra.send('stato', { ts: ts(), x: xx, y: 3, z: pa[1], yaw: yawAB, aTerra: true, arma: 'ar', modo: 'weapon' }); await aspetta(50); }
    ra.send('stato', { ts: ts(), x: pa[0], y: 3, z: pa[1], yaw: yawAB, aTerra: true, arma: 'ar', modo: 'weapon' });
    rb.send('stato', { ts: ts(), x: pb[0], y: 3, z: pb[1], yaw: -yawAB, aTerra: true, arma: 'ar', modo: 'weapon' });
    await finche(() => Math.abs(gB().x - pb[0]) < 0.01 && Math.abs(gA().x - pa[0]) < 0.01);
    prova('in partita: vita piena e vivo', gB().hp === 100 && gB().vivo === true, [gB().hp, gB().vivo]);
    let fx = null; rb.onMessage('sparo', (m) => { fx = m; });
    ra.send('sparo', { arma: 'ar', o: [pa[0], 4.4, pa[1]], p: [[pb[0], 4, pb[1]]], c: [{ a: rb.sessionId, d: 23, z: 'chest' }] });
    await finche(() => gB().hp < 100 && fx);
    prova('colpo valido: B perde 23 di vita', gB().hp === 77, gB().hp);
    prova('B riceve lo sparo di A (per fiammata, scia, suono)', fx && fx.da === ra.sessionId && fx.arma === 'ar' && fx.p.length === 1 && fx.c.length === 1, fx);
    await aspetta(150);
    ra.send('sparo', { arma: 'ar', o: [pa[0], 4.4, pa[1]], p: [], c: [{ a: rb.sessionId, d: 999, z: 'head' }] });
    await finche(() => gB().hp < 77);
    prova('danno gonfiato tagliato al massimo dell\'arma (23 x 1,6 x 1,16)', gB().hp === 77 - (Math.ceil(23 * 1.6 * 1.16) + 1), gB().hp);
    const hpPrima = gB().hp;
    for (let i = 0; i < 30; i++) ra.send('sparo', { arma: 'sn', o: [pa[0], 4.4, pa[1]], p: [], c: [{ a: rb.sessionId, d: 1, z: 'leg' }] });
    await aspetta(400);
    prova('ritmo di fuoco: 30 spari di precisione in un istante -> ne passano 3', hpPrima - gB().hp === 3, hpPrima - gB().hp);
    ra.send('stato', { ts: ts(), x: pa[0], y: 3, z: pa[1], yaw: yawAB + Math.PI, aTerra: true, arma: 'ar', modo: 'weapon' });
    await aspetta(300); const hpSpalle = gB().hp;
    ra.send('sparo', { arma: 'ar', o: [pa[0], 4.4, pa[1]], p: [], c: [{ a: rb.sessionId, d: 23, z: 'chest' }] });
    await aspetta(300);
    prova('colpo con le spalle al bersaglio scartato', gB().hp === hpSpalle, [hpSpalle, gB().hp]);
    ra.send('stato', { ts: ts(), x: pa[0], y: 3, z: pa[1], yaw: yawAB, aTerra: true, arma: 'ar', modo: 'weapon' });
    await aspetta(300);
    const hpP = gB().hp; ra.send('piccone', { a: rb.sessionId, d: 20 }); await aspetta(300);
    prova('piccone da 10 m scartato', gB().hp === hpP, gB().hp);
    const hpZ = gB().hp; rb.send('zona', { d: 500 }); await aspetta(300);
    prova('tempesta: danno gonfiato limitato (al massimo qualche dps)', gB().hp < hpZ && hpZ - gB().hp <= REGOLE.zonaDps * 2 + 1, [hpZ, gB().hp]);
    rb.send('cura', { hp: 1000, scudo: 1000 }); await aspetta(300);
    prova('cura: vita e scudo al massimo 100', gB().hp === 100 && gB().scudo === 100, [gB().hp, gB().scudo]);
    let elim = null, fine = null; ra.onMessage('eliminato', (m) => { elim = m; }); ra.onMessage('fine', (m) => { fine = m; });
    for (let i = 0; i < 25 && gB().vivo; i++) { ra.send('sparo', { arma: 'ar', o: [pa[0], 4.4, pa[1]], p: [], c: [{ a: rb.sessionId, d: 23, z: 'chest' }] }); await aspetta(130); }
    await finche(() => elim && fine);
    prova('B eliminato: vita 0, annuncio a tutti, uccisione ad A', gB().hp === 0 && gB().vivo === false && elim && elim.v === rb.sessionId && elim.k === ra.sessionId && gA().uccisioni === 1, [gB().hp, elim, gA().uccisioni]);
    prova('resta solo A: fine partita, vince A', fine && fine.id === ra.sessionId && fine.nome === 'Lorenzo' && ra.state.fase === 'fine', fine);
    const hpA = gA().hp; rb.send('sparo', { arma: 'ar', o: [pb[0], 4.4, pb[1]], p: [], c: [{ a: ra.sessionId, d: 23, z: 'chest' }] }); await aspetta(300);
    prova('un eliminato non fa piu\' danno', gA().hp === hpA);
    await finche(() => ra.state.fase === 'lobby', fineS * 1000 + 3000);
    prova('dopo la fine si torna in lobby e la stanza si riapre', ra.state.fase === 'lobby');
  }

  // ---------- bot (li fa ragionare l'host), costruzioni, riconnessione, cambio di host ----------
  {
    ra.send('impostaBot', 3); await finche(() => ra.state.nBot === 3);
    prova('l\'host sceglie 3 bot', ra.state.nBot === 3);
    await partita(ra, [ra, rb], { scudi: [50, 0, 0] });
    prova('partita coi bot: 3 bot vivi, il primo con lo scudo dell\'host', ra.state.fase === 'partita' && ra.state.bot.size === 3 && ra.state.bot.get('b0').scudo === 50 && [...ra.state.bot.values()].every((b) => b.vivo), [ra.state.bot.size]);
    prova('partita nuova: vita di nuovo piena', st(ra, rb.sessionId).vivo === true && st(ra, rb.sessionId).hp === 100);
    let rel = null; rb.onMessage('bots', (m) => { rel = m; });
    const pb = REGOLE.spawn[st(ra, rb.sessionId).spawn];
    rb.send('stato', { ts: ts(), x: pb[0], y: 3, z: pb[1], yaw: 0, aTerra: true, arma: 'ar', modo: 'weapon' });
    ra.send('bots', { ts: ts(), l: [[0, pb[0] + 5, 3, pb[1], 0, 0, 0, -Math.PI / 2, 0, 1, 1, 0, 0], [1, pb[0] + 8, 3, pb[1], 0, 0, 0, 0, 0, 1, 1, 0, 0], [2, 0, 3, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]] });
    await finche(() => rel);
    prova('le posizioni dei bot girano agli altri', rel && rel.l.length === 3);
    await aspetta(100);
    const hpB0 = st(ra, rb.sessionId).hp;
    rb.send('sparoBot', { b: 0, arma: 'ar', o: [0, 0, 0], p: [], c: [{ a: rb.sessionId, d: 23, z: 'chest' }] }); await aspetta(300);
    prova('chi non e\' host non spara per i bot', st(ra, rb.sessionId).hp === hpB0);
    ra.send('sparoBot', { b: 0, arma: 'ar', o: [pb[0] + 5, 4.4, pb[1]], p: [], c: [{ a: rb.sessionId, d: 23, z: 'chest' }] });
    await finche(() => st(ra, rb.sessionId).hp < hpB0);
    prova('un bot dell\'host colpisce B', st(ra, rb.sessionId).hp === hpB0 - 23, st(ra, rb.sessionId).hp);
    rb.send('stato', { ts: ts(), x: pb[0], y: 3, z: pb[1], yaw: Math.PI / 2, aTerra: true, arma: 'ar', modo: 'weapon' }); await aspetta(200);   // B guarda verso il bot 0 (+x)
    const morti = []; ra.onMessage('eliminato', (m) => morti.push(m.v));
    for (let i = 0; i < 12 && ra.state.bot.get('b0').vivo; i++) { rb.send('sparo', { arma: 'ar', o: [pb[0], 4.4, pb[1]], p: [], c: [{ a: 'b0', d: 23, z: 'chest' }] }); await aspetta(130); }
    await finche(() => !ra.state.bot.get('b0').vivo);
    prova('B elimina il bot 0 (scudo 50 + vita 100)', !ra.state.bot.get('b0').vivo && morti.includes('b0') && st(ra, rb.sessionId).uccisioni === 1, [ra.state.bot.get('b0').hp, morti]);
    let pz = null, dp = null; ra.onMessage('pezzo', (m) => { pz = m; }); ra.onMessage('dannoPezzo', (m) => { dp = m; });
    rb.send('pezzo', { k: '1,0,2,w0', t: 'wall', ix: 1, iy: 0, iz: 2, rot: 0, mat: 'wood', c: [pb[0] + 2, 4, pb[1]] });
    await finche(() => pz);
    prova('una parete di B arriva ad A', pz && pz.k === '1,0,2,w0' && pz.t === 'wall' && pz.da === rb.sessionId, pz);
    pz = null; rb.send('pezzo', { k: 'lontano', t: 'wall', ix: 0, iy: 0, iz: 0, rot: 0, mat: 'wood', c: [pb[0] + 80, 4, pb[1]] }); await aspetta(300);
    prova('parete a 80 m da chi costruisce scartata', pz === null);
    ra.send('pezzo', { k: 'bot1', t: 'floor', ix: 0, iy: 0, iz: 0, rot: 0, mat: 'stone', c: [pb[0] + 8, 3, pb[1] + 2], b: 1 });
    rb.send('dannoPezzo', { k: '1,0,2,w0', d: 40 }); await finche(() => dp);
    prova('il danno a un pezzo arriva agli altri', dp && dp.k === '1,0,2,w0' && dp.d === 40, dp);
    const token = rb.reconnectionToken, idB = rb.sessionId;
    rb.reconnection.enabled = false;
    rb.connection.transport.ws ? rb.connection.transport.ws.close() : rb.connection.close();
    await finche(() => st(ra, idB) && st(ra, idB).connesso === false, 20000);
    prova('A vede B disconnesso (posto tenuto)', st(ra, idB)?.connesso === false);
    let pezzi = null; const B2 = new Client(url); const rb2 = await B2.reconnect(token); rb2.onMessage('pezzi', (m) => { pezzi = m; }); zitto(rb2); rb2.onMessage('pezzi', (m) => { pezzi = m; });
    await finche(() => st(ra, idB)?.connesso === true && pezzi);
    prova('B rientra nello stesso posto', rb2.sessionId === idB && st(ra, idB)?.connesso === true && st(ra, idB)?.nome === 'Amico');
    prova('B rientrando ritrova le costruzioni (sua e del bot)', pezzi && pezzi.length === 2 && pezzi.some((p) => p.k === 'bot1' && p.da === 'b1'), pezzi && pezzi.map((p) => p.k));
    await ra.leave(true);
    await finche(() => rb2.state.host === idB);
    prova('l\'host esce: l\'host passa a B', rb2.state.host === idB);
    prova('A uscito: la partita va avanti (B + 2 bot)', rb2.state.fase === 'partita');
    let fine2 = null; rb2.onMessage('fine', (m) => { fine2 = m; });
    rb2.send('arrendo'); await finche(() => fine2 && rb2.state.fase === 'fine');   // l'annuncio arriva prima della patch dello stato
    prova('B torna in lobby a partita in corso: nessun umano vivo -> fine', fine2 && rb2.state.fase === 'fine', fine2);
    await rb2.leave(true);
  }
} catch (e) { ko++; console.log('  FAIL eccezione', e && e.stack || e); }

console.log(`\n${ok} PASS, ${ko} FAIL`);
if (figlio) figlio.kill();
process.exit(ko ? 1 : 0);
