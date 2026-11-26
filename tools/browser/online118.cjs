// v118: partita vera online con DUE browser Edge separati + 5 bot (li fa ragionare l'host A).
// Uso: node tools/browser/online118.cjs <cartella-uscita> [url-gioco] [url-server]
//   di serie: gioco su http://localhost:8123/index.html (tools/browser/statico.cjs), server ws://localhost:2567 (server/)
// Misura: solo l'host avvia; tutti caricano senza cliccare; il bus parte insieme ed e' nello stesso punto sui due
// schermi; stessi bot; A salta e B lo vede cadere e planare col deltaplano; i bot sugli schermi di B si muovono coi
// pacchetti di A; una parete di A compare da B; uscendo tutti la partita finisce e si torna in lobby.
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const out = process.argv[2] || 'screen/online118'; const urlGioco = process.argv[3] || 'http://localhost:8123/index.html'; const urlServer = process.argv[4] || '';
fs.mkdirSync(out, { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
let fase = 'inizio', ok = 0, ko = 0; const prova = (n, c, i) => { fase = n; if (c) { ok++; console.log('PASS', n); } else { ko++; console.log('FAIL', n, i !== undefined ? JSON.stringify(i) : ''); } };

async function apri(nome, query) {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript((n) => { try { localStorage.setItem('battlecraft_benvenuto111', '1'); localStorage.setItem('baia_nome', n); } catch (e) { } }, nome);
  const errori = []; page.on('pageerror', (e) => errori.push('PAGEERROR [dopo: ' + fase + '] ' + (e.stack || e.message).split(String.fromCharCode(10)).slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error' || /rete116/.test(m.text())) errori.push('console ' + m.text()); });
  const q = new URLSearchParams(query || ''); if (urlServer) q.set('server', urlServer);
  await page.goto(urlGioco + (q.toString() ? '?' + q : ''), { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.rete116, null, { timeout: 180000 });
  await page.waitForTimeout(1200);
  return { browser, page, errori, nome };
}
const stato = (pg) => pg.evaluate(() => {
  const G = window.__game, R = G.rete116, r = R.room, S = r && r.state, p = G.player;
  const altri = [...R.remoti.values()].filter((x) => x.ch).map((x) => ({ nome: x.info.nome, pos: [x.ch.pos.x, x.ch.pos.y, x.ch.pos.z], aria: x.ch.air88 ? x.ch.air88.phase : '', vela: !!(x.ch.air88 && x.ch.air88.glider && x.ch.air88.glider.visible), visibile: x.ch.model.group.visible, alive: x.ch.alive }));
  return { state: G.state, fase: S && S.fase, host: S && S.host === r.sessionId, gioca: document.getElementById('btnPlay').textContent, giocaOff: document.getElementById('btnPlay').disabled,
    bus: G.drop88 && G.drop88.bus ? [G.drop88.bus.position.x, G.drop88.bus.position.y, G.drop88.bus.position.z] : null, rotta: G.drop88 && G.drop88.from ? [G.drop88.from.x, G.drop88.from.z, G.drop88.to.x, G.drop88.to.z] : null, elapsed: G.drop88 && G.drop88.elapsed, srvEl: S && S.via ? (R.srvOra() - S.via) / 1000 : null,
    io: p ? { pos: [p.pos.x, p.pos.y, p.pos.z], aria: p.air88 ? p.air88.phase : '', alive: p.alive } : null, altri,
    bot: R.bots.map((b) => ({ nome: b.name, pos: [b.pos.x, b.pos.y, b.pos.z], aria: b.air88 ? b.air88.phase : '', remoto: !!b.remoto116, brain: !!b.brain, alive: b.alive })),
    pezzi: G.build ? [...G.build.pieces].map((q) => q.key) : [], zona: G.zone ? [G.zone.radius, G.zone.phase, G.zone.state] : null, fine: (document.getElementById('endTitle') || {}).textContent || '' };
});
const scatta = (c, nome) => c.page.screenshot({ path: path.join(out, nome + '_' + c.nome + '.png') });

(async () => {
  const A = await apri('Lorenzo');
  await A.page.click('#o116crea');
  await A.page.waitForFunction(() => window.__game.rete116.room && window.__game.rete116.room.state.host, null, { timeout: 30000 });
  await A.page.selectOption('#o116bot', '5'); await aspetta(500);
  const codice = await A.page.evaluate(() => window.__game.rete116.room.roomId);
  const B = await apri('Amico', 'stanza=' + codice);
  await B.page.click('#o116entra'); await B.page.waitForFunction(() => window.__game.rete116.room, null, { timeout: 30000 });
  await aspetta(1000);
  let sa = await stato(A.page), sb = await stato(B.page);
  prova('host: pulsante "Avvia"; l\'altro: "Attendi" disattivato', /Avvia/.test(sa.gioca) && !sa.giocaOff && /Attendi/.test(sb.gioca) && sb.giocaOff, [sa.gioca, sb.gioca, sb.giocaOff]);
  prova('5 bot scelti dall\'host, visti anche da B', await B.page.evaluate(() => window.__game.rete116.room.state.nBot) === 5);
  await scatta(A, '01_lobby'); await scatta(B, '01_lobby');
  await B.page.evaluate(() => window.__game.avvia102()); await aspetta(500);
  prova('se preme Gioca chi non e\' host non parte niente', (await stato(B.page)).fase === 'lobby');

  const t0 = Date.now(); await A.page.click('#btnPlay');
  await A.page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 90000 });
  await B.page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 90000 });
  console.log('caricamento e partenza:', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await aspetta(1500);
  sa = await stato(A.page); sb = await stato(B.page);
  prova('partita in corso per tutti e due (B partito senza cliccare)', sa.fase === 'partita' && sa.state === 'playing' && sb.state === 'playing');
  const dBus = sa.bus && sb.bus ? Math.hypot(sa.bus[0] - sb.bus[0], sa.bus[2] - sb.bus[2]) : 1e9;
  console.log('bus A', sa.bus, 'el', sa.elapsed, 'srv', sa.srvEl, '| bus B', sb.bus, 'el', sb.elapsed, 'srv', sb.srvEl);
  // le due misure sono prese in momenti diversi (il bus fa ~14 m/s): confronto il percorso e l'orario rispetto al server
  const dRotta = sa.rotta && sb.rotta ? Math.max(...sa.rotta.map((v, i) => Math.abs(v - sb.rotta[i]))) : 1e9;
  prova('stesso percorso del bus sui due schermi', dRotta < 0.01, [sa.rotta, sb.rotta]);
  prova('il bus di tutti e due segue l\'ora del server (< 0,35 s)', Math.abs(sa.elapsed - sa.srvEl) < 0.35 && Math.abs(sb.elapsed - sb.srvEl) < 0.35, [sa.elapsed - sa.srvEl, sb.elapsed - sb.srvEl]);
  console.log('distanza fra i due bus nelle due misure:', dBus.toFixed(1), 'm');
  prova('tutti e due sul bus', sa.io.aria === 'bus' && sb.io.aria === 'bus');
  prova('stessi 5 bot con gli stessi nomi; li guida solo A', sa.bot.length === 5 && sb.bot.length === 5 && sa.bot.every((b, i) => b.nome === sb.bot[i].nome && b.brain && !b.remoto) && sb.bot.every((b) => b.remoto && !b.brain), [sa.bot.map((b) => b.nome), sb.bot.map((b) => b.nome)]);
  await scatta(A, '02_bus'); await scatta(B, '02_bus');

  // A salta dal bus: B lo vede cadere, poi planare col deltaplano
  await A.page.waitForFunction(() => window.__game.drop88.elapsed > 3.5, null, { timeout: 20000 });
  await A.page.evaluate(() => window.__game.drop88.action());
  let vistoCadere = false, vistoPlanare = false, velaVista = false, scattato = false;
  for (let i = 0; i < 160 && !(vistoPlanare && velaVista); i++) {
    await aspetta(250); const s = await stato(B.page); const a = s.altri.find((x) => x.nome === 'Lorenzo');
    if (a && a.aria === 'fall' && a.visibile) vistoCadere = true;
    if (a && a.aria === 'glide') { vistoPlanare = true; if (a.vela) velaVista = true; if (!scattato && a.vela) { scattato = true; await scatta(B, '03_A_deltaplano'); } }
  }
  prova('B vede A cadere dal bus', vistoCadere);
  prova('B vede A planare col deltaplano (vela visibile)', vistoPlanare && velaVista, [vistoPlanare, velaVista]);
  sb = await stato(B.page);
  prova('i bot sullo schermo di B lasciano il bus anche loro (pacchetti di A)', sb.bot.some((b) => b.aria !== 'bus'), sb.bot.map((b) => b.aria));

  // tutti a terra: anche B salta, poi aspetto l'atterraggio di A
  await B.page.evaluate(() => window.__game.drop88.action());
  await A.page.waitForFunction(() => { const p = window.__game.player; return p && !p.air88 && p.onGround; }, null, { timeout: 90000 });
  await aspetta(1500);
  sa = await stato(A.page); sb = await stato(B.page);
  const aDaB = sb.altri.find((x) => x.nome === 'Lorenzo');
  const dA = aDaB ? Math.hypot(aDaB.pos[0] - sa.io.pos[0], aDaB.pos[2] - sa.io.pos[2]) : 1e9;
  prova('A atterrato: B lo vede a terra dov\'e\' (< 1 m)', aDaB && aDaB.aria === '' && dA < 1, [dA, aDaB && aDaB.aria]);
  const botA = sa.bot[0], botB = sb.bot[0];
  const dBot = Math.hypot(botA.pos[0] - botB.pos[0], botA.pos[2] - botB.pos[2]);
  prova('un bot e\' nello stesso punto sui due schermi (< 3 m)', dBot < 3, [dBot, botA.aria, botB.aria]);

  // A costruisce una parete davanti a se': compare anche da B
  const k = await A.page.evaluate(() => {
    const G = window.__game, p = G.player, Bs = G.build; p.res.wood = 200;
    for (let k = 0; k < 8; k++) {   // dove e' atterrato puo' esserci una pendenza o una casa: provo 8 direzioni
      const a = p.yaw + k * Math.PI / 4, dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      for (const tipo of ['wall', 'floor']) {
        const t = Bs.computeTarget(p, dir, tipo, 0); const def = { type: tipo, ix: t.ix, iy: t.iy, iz: t.iz, rot: t.rot, key: t.key, center: t.center.clone(), pattern: 0 };
        const pz = Bs.tryPlace(p, def, 'wood', true); if (pz) return pz.key;
      }
    }
    return null;
  }).catch((e) => 'errore ' + e.message);
  await aspetta(1500);
  sb = await stato(B.page);
  prova('un pezzo costruito da A compare da B', typeof k === 'string' && sb.pezzi.includes(k), [k, sb.pezzi]);
  await scatta(A, '04_parete'); await scatta(B, '04_parete');

  // fine: B esce dalla partita, poi A: nessun umano vivo -> fine -> lobby
  await B.page.evaluate(() => window.__game.quitToMenu()); await aspetta(800);
  sa = await stato(A.page);
  prova('B torna in lobby: per A sparisce, la partita continua', sa.fase === 'partita' && !sa.altri.some((x) => x.nome === 'Amico' && x.alive), sa.altri);
  await A.page.evaluate(() => window.__game.quitToMenu());
  await A.page.waitForFunction(() => window.__game.rete116.room.state.fase === 'lobby', null, { timeout: 20000 });
  await aspetta(800);
  sa = await stato(A.page); sb = await stato(B.page);
  prova('nessuno in vita: fine partita e si torna in lobby (stanza riaperta)', sa.fase === 'lobby' && sb.fase === 'lobby' && /Avvia/.test(sa.gioca), [sa.fase, sb.fase, sa.gioca]);

  const err = [A, B].flatMap((X) => X.errori.map((e) => X.nome + ' ' + e));
  console.log(err.slice(0, 15).join('\n') || 'nessun errore nella pagina');
  prova('nessun errore nelle pagine', !err.some((e) => /PAGEERROR/.test(e)));
  console.log(`\n${ok} PASS, ${ko} FAIL`);
  for (const X of [A, B]) await X.browser.close();
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
