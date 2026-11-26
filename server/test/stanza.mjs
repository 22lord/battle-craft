/* Prova del server con due client VERI (SDK Colyseus, WebSocket), niente finti.
   Uso: node test/stanza.mjs            -> avvia un server suo su una porta libera
        node test/stanza.mjs ws://host  -> prova un server gia' acceso (anche online) */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from '@colyseus/sdk';
import { validaStato, REGOLE, pulisciNome, nuovoCodice, secchiello } from '../src/regole.js';

const qui = path.dirname(fileURLToPath(import.meta.url));
let ok = 0, ko = 0;
const prova = (nome, cond, info = '') => { if (cond) { ok++; console.log('  PASS', nome); } else { ko++; console.log('  FAIL', nome, info); } };
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
async function finche(cond, ms = 3000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await aspetta(20); } return cond(); }

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
  {   // grappolo: 20 pacchetti (1 s di corsa) arrivati tutti nello stesso millisecondo, dopo una coda di rete
    const o = {}; validaStato({ x: 0, y: 5, z: 0, ts: 0 }, null, 10000, o); let q = { x: 0, y: 5, z: 0, ts: 0 }, tutti = true;
    for (let i = 1; i <= 20; i++) { const m = { x: i * 0.23, y: 5, z: 0, ts: i * 50 }; const r = validaStato(m, q, 11000, o); if (!r.ok) tutti = false; q = { x: m.x, y: 5, z: 0, ts: m.ts }; }
    prova('grappolo di pacchetti in ritardo accettato', tutti);
  }
  {   // il primo pacchetto arriva con 1,2 s di ritardo (avvio), poi tutto regolare: nessuna correzione
    const o = {}; validaStato({ x: 0, y: 5, z: 0, ts: 0 }, null, 1200, o); let q = { x: 0, y: 5, z: 0, ts: 0 }, tutti = true;
    for (let i = 1; i <= 40; i++) { const m = { x: i * 0.2, y: 5, z: 0, ts: i * 50 }; const r = validaStato(m, q, i * 50 + 10, o); if (!r.ok) tutti = false; q = { x: m.x, y: 5, z: 0, ts: m.ts }; }
    prova('primo pacchetto in ritardo all avvio: niente correzioni dopo', tutti);
  }
  {   // furbo: dichiara 10 s passati in 1 s vero, a passi "legali" da 1 s l'uno
    const o = {}; validaStato({ x: 0, y: 5, z: 0, ts: 0 }, null, 0, o); let q = { x: 0, y: 5, z: 0, ts: 0 }, arrivato = 0;
    for (let i = 1; i <= 10; i++) { const m = { x: q.x + 6, y: 5, z: 0, ts: i * 1000 }; const r = validaStato(m, q, i * 100, o); if (r.ok) { q = { x: m.x, y: 5, z: 0, ts: m.ts }; arrivato = m.x; } }
    prova('orologio truccato: al massimo ~2 s di corsa (1 s vero + credito)', arrivato <= 13, arrivato);
  }
  {   // furbo: sta zitto 20 s per accumulare tempo, poi lo spende tutto insieme
    const o = {}; validaStato({ x: 0, y: 5, z: 0, ts: 0 }, null, 0, o); let q = { x: 0, y: 5, z: 0, ts: 0 }, arrivato = 0;
    for (let i = 1; i <= 20; i++) { const m = { x: q.x + 6, y: 5, z: 0, ts: i * 1000 }; const r = validaStato(m, q, 20000, o); if (r.ok) { q = { x: m.x, y: 5, z: 0, ts: m.ts }; arrivato = m.x; } }
    prova('20 s di silenzio: in un colpo solo al massimo ~3 s di corsa', arrivato <= 19, arrivato);
  }
  {   // secchiello: 100 messaggi nello stesso istante -> ne passano solo la capienza
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

let url = process.argv[2], figlio = null;
if (!url) {
  const porta = 20000 + Math.floor(Math.random() * 20000);
  figlio = spawn(process.execPath, [path.join(qui, '..', 'src', 'index.js')], { env: { ...process.env, PORT: String(porta) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; figlio.stdout.on('data', (d) => { log += d; }); figlio.stderr.on('data', (d) => { log += d; });
  await finche(() => log.includes('in ascolto'), 8000);
  url = `ws://127.0.0.1:${porta}`;
  process.on('exit', () => figlio.kill());
}
console.log('rete:', url);

try {
  const A = new Client(url), B = new Client(url), C = new Client(url);
  const ra = await A.create('battle', { nome: 'Lorenzo' });
  const codice = ra.roomId;
  prova('stanza creata con codice di 4 caratteri', /^[A-Z2-9]{4}$/.test(codice), codice);
  let benvA = null, benvB = null; ra.onMessage('benvenuto', (m) => { benvA = m; });
  await finche(() => benvA);
  const rb = await B.joinById(codice, { nome: 'Amico' });
  rb.onMessage('benvenuto', (m) => { benvB = m; });
  await finche(() => benvB && ra.state.giocatori && ra.state.giocatori.size === 2);
  prova('due giocatori nella stanza', ra.state.giocatori.size === 2 && rb.state.giocatori.size === 2);
  prova('spawn diversi', benvA && benvB && benvA.spawn !== benvB.spawn && Math.hypot(benvA.x - benvB.x, benvA.z - benvB.z) > 5, JSON.stringify([benvA, benvB]));
  prova('nickname visibili all\'altro', rb.state.giocatori.get(ra.sessionId)?.nome === 'Lorenzo' && ra.state.giocatori.get(rb.sessionId)?.nome === 'Amico');

  // v117: fino a 10 giocatori; l'undicesimo e' rifiutato
  const altri = []; for (let i = 0; i < REGOLE.maxGiocatori - 2; i++) altri.push(await new Client(url).joinById(codice, { nome: 'G' + (i + 3) }));
  await finche(() => ra.state.giocatori.size === REGOLE.maxGiocatori);
  prova('10 giocatori nella stanza', ra.state.giocatori.size === 10, ra.state.giocatori.size);
  prova('10 posti di partenza tutti diversi', new Set([...ra.state.giocatori.values()].map((g) => g.spawn)).size === 10);
  let terzo = null; try { await C.joinById(codice, { nome: 'Undicesimo' }); terzo = 'entrato'; } catch (e) { terzo = 'rifiutato'; }
  prova('undicesimo giocatore rifiutato', terzo === 'rifiutato');
  for (const r of altri) await r.leave(true);
  await finche(() => ra.state.giocatori.size === 2);
  prova('gli altri 8 escono: restano in 2', ra.state.giocatori.size === 2);
  let codiceSbagliato = null; try { await C.joinById('ZZZZ', {}); codiceSbagliato = 'entrato'; } catch (e) { codiceSbagliato = 'rifiutato'; }
  prova('codice inesistente rifiutato', codiceSbagliato === 'rifiutato');

  let corr0 = null; ra.onMessage('correggi', (m) => { corr0 = corr0 || m; });
  const t0 = performance.now(); ra.send('stato', { x: 100, y: 3, z: 100, aTerra: true, ts: t0 }); await finche(() => corr0);
  prova('primo stato lontano dal posto di partenza rifiutato', corr0 && Math.abs(corr0.x - benvA.x) < 0.01, JSON.stringify(corr0));
  await aspetta(60);
  // A cammina: 20 stati in 1 s, a passo di corsa, e B deve vederlo
  let x = benvA.x, z = benvA.z; const y = 3.2;
  for (let i = 0; i < 20; i++) { x += 0.2; ra.send('stato', { ts: performance.now(), x, y, z, vx: 4, vy: 0, vz: 0, yaw: 1.2, pitch: -0.1, aTerra: true, accov: i > 15, mira: false, arma: 'ar', modo: 'weapon' }); await aspetta(50); }
  await finche(() => Math.abs(rb.state.giocatori.get(ra.sessionId).x - x) < 0.01);
  const visto = rb.state.giocatori.get(ra.sessionId);
  prova('B vede la posizione di A', Math.abs(visto.x - x) < 0.01 && Math.abs(visto.z - z) < 0.01, `${visto.x} vs ${x}`);
  prova('B riceve il tempo di invio di A', visto.ts > t0, visto.ts);
  prova('B vede rotazione, velocita\' e accovacciamento di A', Math.abs(visto.yaw - 1.2) < 1e-3 && Math.abs(visto.vx - 4) < 1e-3 && visto.accov === true && visto.arma === 'ar');

  // teletrasporto: il server rimanda indietro e non lo mostra a B
  let corr = null; ra.onMessage('correggi', (m) => { corr = m; });
  await aspetta(60); ra.send('stato', { x: x + 40, y, z, aTerra: true, ts: performance.now() });
  await finche(() => corr);
  await aspetta(150);
  prova('teletrasporto corretto dal server', corr && Math.abs(corr.x - x) < 0.01, JSON.stringify(corr));
  prova('B non vede il teletrasporto', Math.abs(rb.state.giocatori.get(ra.sessionId).x - x) < 0.01);

  // ---------- v117: colpi e danni (la vita sta sul server) ----------
  {
    ra.send('inGioco', true); rb.send('inGioco', true); await aspetta(150);
    const gA = () => rb.state.giocatori.get(ra.sessionId), gB = () => ra.state.giocatori.get(rb.sessionId);
    const pa = REGOLE.spawn[gA().spawn], pb = REGOLE.spawn[gB().spawn];
    const yawAB = Math.atan2(pb[0] - pa[0], pb[1] - pa[1]);
    ra.send('stato', { ts: performance.now(), x: pa[0], y: 3, z: pa[1], yaw: yawAB, aTerra: true, arma: 'ar', modo: 'weapon' });
    rb.send('stato', { ts: performance.now(), x: pb[0], y: 3, z: pb[1], yaw: -yawAB, aTerra: true, arma: 'ar', modo: 'weapon' });
    await finche(() => Math.abs(gB().x - pb[0]) < 0.01 && Math.abs(gA().yaw - yawAB) < 0.01);
    prova('in partita: vita piena e vivo', gB().hp === 100 && gB().vivo === true, [gB().hp, gB().vivo]);
    let fx = null; rb.onMessage('sparo', (m) => { fx = m; });
    ra.send('sparo', { arma: 'ar', o: [pa[0], 4.4, pa[1]], p: [[pb[0], 4, pb[1]]], c: [{ a: rb.sessionId, d: 23, z: 'chest' }] });
    await finche(() => gB().hp < 100 && fx);
    prova('colpo valido: B perde 23 di vita', gB().hp === 77, gB().hp);
    prova('B riceve lo sparo di A (per fiammata, scia, suono)', fx && fx.da === ra.sessionId && fx.arma === 'ar' && fx.p.length === 1 && fx.c.length === 1, fx);
    await aspetta(150);
    ra.send('sparo', { arma: 'ar', o: [pa[0], 4.4, pa[1]], p: [], c: [{ a: rb.sessionId, d: 999, z: 'head' }] });
    await finche(() => gB().hp < 77); const dopo = gB().hp;
    prova('danno gonfiato tagliato al massimo dell\'arma (23 x 1,6 x 1,16)', dopo === 77 - (Math.ceil(23 * 1.6 * 1.16) + 1), dopo);
    // raffica impossibile: 30 colpi di fucile di precisione in un istante -> passano solo i primi (raffica = 3)
    const hpPrima = gB().hp;
    for (let i = 0; i < 30; i++) ra.send('sparo', { arma: 'sn', o: [pa[0], 4.4, pa[1]], p: [], c: [{ a: rb.sessionId, d: 1, z: 'leg' }] });
    await aspetta(400);
    prova('ritmo di fuoco: 30 spari di precisione in un istante -> ne passano 3', hpPrima - gB().hp === 3, hpPrima - gB().hp);
    // di spalle: B non e' davanti ad A
    ra.send('stato', { ts: performance.now(), x: pa[0], y: 3, z: pa[1], yaw: yawAB + Math.PI, aTerra: true, arma: 'ar', modo: 'weapon' });
    await finche(() => Math.abs(Math.abs(gA().yaw - yawAB) - Math.PI) < 0.05 || Math.abs(Math.abs(gA().yaw - yawAB) - Math.PI) > 6);
    await aspetta(300); const hpSpalle = gB().hp;
    ra.send('sparo', { arma: 'ar', o: [pa[0], 4.4, pa[1]], p: [], c: [{ a: rb.sessionId, d: 23, z: 'chest' }] });
    await aspetta(300);
    prova('colpo con le spalle al bersaglio scartato', gB().hp === hpSpalle, [hpSpalle, gB().hp]);
    ra.send('stato', { ts: performance.now(), x: pa[0], y: 3, z: pa[1], yaw: yawAB, aTerra: true, arma: 'ar', modo: 'weapon' });
    await aspetta(300);
    // fino alla morte: 'eliminato' a tutti, uccisione contata, B non spara piu'
    let elim = null; ra.onMessage('eliminato', (m) => { elim = m; });
    for (let i = 0; i < 12 && gB().vivo; i++) { ra.send('sparo', { arma: 'ar', o: [pa[0], 4.4, pa[1]], p: [], c: [{ a: rb.sessionId, d: 23, z: 'chest' }] }); await aspetta(150); }
    await finche(() => elim);
    prova('B eliminato: vita 0, annuncio a tutti, uccisione ad A', gB().hp === 0 && gB().vivo === false && elim && elim.v === rb.sessionId && elim.k === ra.sessionId && gA().uccisioni === 1, [gB().hp, elim, gA().uccisioni]);
    const hpA = gA().hp; rb.send('sparo', { arma: 'ar', o: [pb[0], 4.4, pb[1]], p: [], c: [{ a: ra.sessionId, d: 23, z: 'chest' }] }); await aspetta(300);
    prova('un eliminato non fa piu\' danno', gA().hp === hpA);
    // nuova partita: B torna dalla lobby -> vita piena
    rb.send('inGioco', false); await aspetta(100); rb.send('inGioco', true);
    await finche(() => gB().vivo === true);
    prova('nuova partita: vita di nuovo piena', gB().vivo === true && gB().hp === 100, [gB().vivo, gB().hp]);
    // piccone: solo da vicino
    const hpP = gB().hp; ra.send('piccone', { a: rb.sessionId, d: 20 }); await aspetta(300);
    prova('piccone da 10 m scartato', gB().hp === hpP, gB().hp);
    ra.send('inGioco', false); rb.send('inGioco', false); await aspetta(100);
  }

  // disconnessione e riconnessione: il posto resta, poi torna "connesso"
  const token = rb.reconnectionToken, idB = rb.sessionId;
  rb.reconnection.enabled = false;
  rb.connection.transport.ws ? rb.connection.transport.ws.close() : rb.connection.close();
  // in locale e' immediato; dietro il proxy di Render (misurato) ~10 s: se ne accorge il ping di Colyseus
  await finche(() => ra.state.giocatori.get(idB) && ra.state.giocatori.get(idB).connesso === false, 20000);
  prova('A vede B disconnesso (posto tenuto)', ra.state.giocatori.get(idB)?.connesso === false);
  const B2 = new Client(url); const rb2 = await B2.reconnect(token);
  await finche(() => ra.state.giocatori.get(idB)?.connesso === true);
  prova('B rientra nello stesso posto', rb2.sessionId === idB && ra.state.giocatori.get(idB)?.connesso === true && ra.state.giocatori.get(idB)?.nome === 'Amico');

  // uscita volontaria: il posto si libera
  await rb2.leave(true);
  await finche(() => ra.state.giocatori.size === 1);
  prova('uscita volontaria libera il posto', ra.state.giocatori.size === 1);
  await ra.leave(true);
} catch (e) { ko++; console.log('  FAIL eccezione', e && e.stack || e); }

console.log(`\n${ok} PASS, ${ko} FAIL`);
if (figlio) figlio.kill();
process.exit(ko ? 1 : 0);
