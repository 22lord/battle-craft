// v116: due browser Edge SEPARATI (due processi, due localStorage, due WebSocket) nella stessa stanza.
// Uso: node tools/browser/online116.cjs <cartella-uscita> [url-gioco] [url-server]
//   di serie: gioco su http://localhost:8123/index.html (tools/browser/statico.cjs), server ws://localhost:2567 (server/)
// A crea la stanza, B entra col link; A cammina, corre, salta, si accovaccia, cambia arma; si misura
// cosa vede B. Poi B perde la connessione e rientra da solo. Scatti da tutti e due.
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const out = process.argv[2] || 'screen/online116'; const urlGioco = process.argv[3] || 'http://localhost:8123/index.html'; const urlServer = process.argv[4] || '';
fs.mkdirSync(out, { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
let fase = 'inizio'; let ok = 0, ko = 0; const prova = (n, c, i) => { fase = n; if (c) { ok++; console.log('PASS', n); } else { ko++; console.log('FAIL', n, i !== undefined ? JSON.stringify(i) : ''); } };

async function apri(nome, query) {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript((n) => { try { localStorage.setItem('battlecraft_benvenuto111', '1'); localStorage.setItem('baia_nome', n); } catch (e) { } }, nome);
  const errori = []; page.on('pageerror', (e) => errori.push('PAGEERROR [dopo: ' + fase + '] ' + (e.stack || e.message).split(String.fromCharCode(10)).slice(0, 4).join(' | '))); page.on('console', (m) => { if (m.type() === 'error' || /rete116/.test(m.text())) errori.push('console ' + m.text()); });
  const q = new URLSearchParams(query || ''); if (urlServer) q.set('server', urlServer);
  await page.goto(urlGioco + (q.toString() ? '?' + q : ''), { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.rete116, null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  return { browser, page, errori, nome };
}
const stato = (pg) => pg.evaluate(() => {
  const G = window.__game, R = G.rete116, p = G.player, r = R.room;
  const altri = [...R.remoti.values()].filter((x) => x.ch).map((x) => ({ nome: x.info.nome, pos: [x.ch.pos.x, x.ch.pos.y, x.ch.pos.z], yaw: x.ch.yaw, aTerra: x.ch.onGround, accov: !!x.ch.crouch90, k: x.ch.crouchK90, arma: x.ch.weapon, modo: x.ch.mode, vel: Math.hypot(x.ch.vel.x, x.ch.vel.z), tag: x.tag && x.tag.userData.testo116, nelMondo: G.chars.includes(x.ch) }));
  return { state: G.state, online: !!G.online116, stanza: r && r.roomId, n: r && r.state.giocatori ? r.state.giocatori.size : 0, io: p ? { pos: [p.pos.x, p.pos.y, p.pos.z], yaw: p.yaw, aTerra: p.onGround, accov: !!p.crouch90, arma: p.weapon, modo: p.mode } : null, altri, rtt: R.rtt, corrette: R.corrette, badge: document.getElementById('rete116').textContent, bot: G.bots.length, chars: G.chars.length };
});
const scatta = async (c, nome) => { await c.page.screenshot({ path: path.join(out, nome + '_' + c.nome + '.png') }); };

(async () => {
  const A = await apri('Lorenzo');
  await A.page.click('#o116crea');
  await A.page.waitForFunction(() => window.__game.rete116.room, null, { timeout: 20000 });
  const codice = await A.page.evaluate(() => window.__game.rete116.room.roomId);
  prova('A ha creato la stanza', /^[A-Z2-9]{4}$/.test(codice), codice);
  await scatta(A, '01_lobby_stanza');
  const link = await A.page.evaluate(() => window.__game.rete116.linkStanza());
  prova('il link contiene il codice', link.includes('stanza=' + codice), link);

  const B = await apri('Amico', 'stanza=' + codice);
  prova('B vede il codice gia\' scritto dal link', (await B.page.inputValue('#o116codice')) === codice);
  await B.page.click('#o116entra');
  await B.page.waitForFunction(() => window.__game.rete116.room, null, { timeout: 20000 });
  await aspetta(600);
  await scatta(B, '02_lobby_entrato');
  prova('stanza con 2 giocatori su A', (await stato(A.page)).n === 2);

  await A.page.click('#btnPlay'); await B.page.click('#btnPlay');
  await A.page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 60000 });
  await B.page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 60000 });
  await aspetta(2500);
  let sa = await stato(A.page), sb = await stato(B.page);
  console.log('A', JSON.stringify(sa)); console.log('B', JSON.stringify(sb));
  prova('partita online senza bot', sa.online && sb.online && sa.bot === 0 && sb.bot === 0);
  prova('A vede B e B vede A, coi nomi', sa.altri.length === 1 && sb.altri.length === 1 && sa.altri[0].nome === 'Amico' && sb.altri[0].nome === 'Lorenzo');
  const dSpawn = Math.hypot(sa.io.pos[0] - sb.io.pos[0], sa.io.pos[2] - sb.io.pos[2]);
  prova('spawn diversi (> 5 m)', dSpawn > 5, dSpawn);
  const scarto = (s1, s2) => Math.hypot(s1.io.pos[0] - s2.altri[0].pos[0], s1.io.pos[1] - s2.altri[0].pos[1], s1.io.pos[2] - s2.altri[0].pos[2]);
  prova('da fermo B vede A dov\'e\' (< 5 cm)', scarto(sa, sb) < 0.05, scarto(sa, sb));
  await scatta(A, '03_inizio'); await scatta(B, '03_inizio');

  // A corre in avanti per 2 s, guardando verso B: misuro durante la corsa
  await A.page.keyboard.down('KeyW'); await A.page.keyboard.down('ShiftLeft');
  await aspetta(1200);
  sa = await stato(A.page); sb = await stato(B.page);
  const ritardoM = scarto(sa, sb);
  prova('B vede A correre (velocita\' > 3 m/s)', sb.altri[0].vel > 3, sb.altri[0].vel);
  // atteso: corsa x (meta' andata/ritorno + 120 ms di ritardo voluto + fino a 50 ms d'invio + 50 di patch), + 0,3 m di margine
  const attesoM = 4.6 * (sb.rtt / 2000 + 0.12 + 0.1) + 0.3;
  prova('in corsa lo scarto e\' quello della latenza + ritardo voluto', ritardoM < attesoM, [ritardoM, attesoM, sb.rtt]);
  await scatta(B, '04_A_corre');
  await A.page.keyboard.up('ShiftLeft'); await aspetta(500);
  sb = await stato(B.page); prova('B vede A camminare (1,5-3,2 m/s)', sb.altri[0].vel > 1.5 && sb.altri[0].vel < 3.2, sb.altri[0].vel);
  await scatta(B, '05_A_cammina');
  await A.page.keyboard.up('KeyW'); await aspetta(900);
  sa = await stato(A.page); sb = await stato(B.page);
  prova('A fermo: B lo vede fermo dove e\' (< 5 cm, vel < 0,3)', scarto(sa, sb) < 0.05 && sb.altri[0].vel < 0.3, [scarto(sa, sb), sb.altri[0].vel]);
  prova('rotazione di A uguale su B', Math.abs(Math.atan2(Math.sin(sa.io.yaw - sb.altri[0].yaw), Math.cos(sa.io.yaw - sb.altri[0].yaw))) < 0.02, [sa.io.yaw, sb.altri[0].yaw]);

  // salto: B deve vederlo staccarsi da terra
  await A.page.keyboard.press('Space');
  let vistoInAria = false, quotaMax = 0; const y0 = sb.altri[0].pos[1];
  for (let i = 0; i < 25; i++) { await aspetta(40); const s = await stato(B.page); if (!s.altri[0].aTerra) vistoInAria = true; quotaMax = Math.max(quotaMax, s.altri[0].pos[1] - y0); if (i === 8) await scatta(B, '06_A_salta'); }
  prova('B vede A saltare (in aria, > 0,8 m)', vistoInAria && quotaMax > 0.8, [vistoInAria, quotaMax]);
  await aspetta(600);

  // accovacciamento
  await A.page.keyboard.press('ControlLeft'); await aspetta(700);
  sb = await stato(B.page); prova('B vede A accovacciato', sb.altri[0].accov && sb.altri[0].k > 0.8, sb.altri[0]);
  await scatta(B, '07_A_accovacciato');
  await A.page.keyboard.press('ControlLeft'); await aspetta(700);
  sb = await stato(B.page); prova('B vede A rialzarsi', !sb.altri[0].accov && sb.altri[0].k < 0.2, sb.altri[0]);

  // arma -> piccone (modo raccolta) e ritorno
  await A.page.evaluate(() => window.__game.enterMode('harvest')); await aspetta(500);
  sb = await stato(B.page); prova('B vede A col piccone', sb.altri[0].modo === 'harvest', sb.altri[0]);
  await scatta(B, '08_A_piccone');
  await A.page.evaluate(() => window.__game.enterMode('weapon')); await aspetta(500);
  sb = await stato(B.page); prova('B vede A di nuovo col fucile', sb.altri[0].modo === 'weapon' && sb.altri[0].arma === 'ar', sb.altri[0]);

  // anche B si muove: A lo vede (sincronizzazione nei due sensi)
  await B.page.keyboard.down('KeyD'); await aspetta(900); await B.page.keyboard.up('KeyD'); await aspetta(800);
  sa = await stato(A.page); sb = await stato(B.page);
  prova('A vede dove e\' andato B (< 5 cm)', scarto(sb, sa) < 0.05, scarto(sb, sa));
  await scatta(A, '09_vede_B'); await scatta(B, '09_vede_A');
  prova('etichetta della stanza in alto', /ONLINE · STANZA [A-Z2-9]{4} · 2\/10/.test(sa.badge), sa.badge);

  // B perde la connessione (WebSocket chiuso di colpo): A lo vede "in riconnessione", poi B rientra da solo
  await B.page.evaluate(() => { const c = window.__game.rete116.room.connection; (c.transport && c.transport.ws ? c.transport.ws : c).close(); });
  let vistoGiu = false;
  for (let i = 0; i < 40 && !vistoGiu; i++) { await aspetta(100); const s = await stato(A.page); vistoGiu = s.altri[0] && /\(…\)/.test(s.altri[0].tag); }
  prova('A vede B in riconnessione', vistoGiu);
  if (vistoGiu) await scatta(A, '10_B_riconnessione');
  let tornato = false;
  for (let i = 0; i < 100 && !tornato; i++) { await aspetta(100); const s = await stato(A.page); tornato = s.altri[0] && !/\(…\)/.test(s.altri[0].tag); }
  prova('B rientra da solo (riconnessione automatica)', tornato);
  await aspetta(800); sa = await stato(A.page); sb = await stato(B.page);
  prova('dopo la riconnessione si vedono ancora', sa.altri.length === 1 && sb.altri.length === 1, [sa.altri.length, sb.altri.length]);

  // B torna in lobby: sparisce per A, la stanza resta
  await B.page.evaluate(() => window.__game.quitToMenu()); await aspetta(800);
  sa = await stato(A.page); prova('B in lobby: A non lo vede piu\' in mappa', sa.altri.length === 0 && sa.n === 2, sa);
  // B esce dalla stanza
  await B.page.evaluate(() => window.__game.rete116.esci()); await aspetta(800);
  sa = await stato(A.page); prova('B uscito: stanza con 1 giocatore', sa.n === 1, sa.n);

  console.log('\nRTT A:', Math.round(sa.rtt), 'ms; correzioni del server A:', sa.corrette, 'B:', sb.corrette);
  prova('nessuna correzione del server durante il gioco normale', sa.corrette === 0 && sb.corrette === 0, [sa.corrette, sb.corrette]);
  const err = [...A.errori.map((e) => 'A ' + e), ...B.errori.map((e) => 'B ' + e)];
  console.log(err.slice(0, 20).join('\n') || 'nessun errore nella pagina');
  prova('nessun errore nelle pagine', !err.some((e) => /PAGEERROR/.test(e)));
  console.log(`\n${ok} PASS, ${ko} FAIL`);
  await A.browser.close(); await B.browser.close();
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
