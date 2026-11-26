// v117: TRE browser Edge separati nella stessa stanza: A spara a B fino a eliminarlo, C guarda.
// Uso: node tools/browser/online117.cjs <cartella-uscita> [url-gioco] [url-server]
//   di serie: gioco su http://localhost:8123/index.html (tools/browser/statico.cjs), server ws://localhost:2567 (server/)
// Misura: vita di B che scende sul server e su tutti e tre, scie dello sparo di A viste da B e C, fiammata,
// hitmarker per A, eliminazione (feed, B "Eliminato"), un eliminato non spara, nessun errore.
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const out = process.argv[2] || 'screen/online117'; const urlGioco = process.argv[3] || 'http://localhost:8123/index.html'; const urlServer = process.argv[4] || '';
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
  // conto le scie e le fiammate disegnate in questa pagina
  await page.evaluate(() => { const fx = window.__game.fx; window.__scie = 0; window.__fiamme = 0; const t = fx.tracer.bind(fx), f = fx.muzzleFlash.bind(fx); fx.tracer = (a, b) => { window.__scie++; return t(a, b); }; fx.muzzleFlash = (c) => { window.__fiamme++; return f(c); }; });
  return { browser, page, errori, nome };
}
const stato = (pg) => pg.evaluate(() => {
  const G = window.__game, R = G.rete116, p = G.player, r = R.room;
  const sv = (id) => { const g = r && r.state.giocatori.get(id); return g ? { nome: g.nome, hp: g.hp, scudo: g.scudo, vivo: g.vivo, uccisioni: g.uccisioni } : null; };
  const altri = [...R.remoti.values()].filter((x) => x.ch).map((x) => ({ id: x.id, nome: x.info.nome, pos: [x.ch.pos.x, x.ch.pos.y, x.ch.pos.z], hp: x.ch.hp, alive: x.ch.alive }));
  return { state: G.state, n: r && r.state.giocatori ? r.state.giocatori.size : 0, id: r && r.sessionId, io: p ? { pos: [p.pos.x, p.pos.y, p.pos.z], hp: p.hp, alive: p.alive } : null, server: r ? [...r.state.giocatori.keys()].map(sv) : [], altri,
    scie: window.__scie, fiamme: window.__fiamme, feed: (document.getElementById('killfeed') || {}).textContent || '', fine: (document.getElementById('endTitle') || {}).textContent || '', badge: document.getElementById('rete116').textContent };
});
const scatta = (c, nome) => c.page.screenshot({ path: path.join(out, nome + '_' + c.nome + '.png') });
// A mira al petto di chi si chiama "nome" (yaw e pitch della telecamera), poi spara per "ms"
async function miraESpara(A, nome, ms) {
  return A.page.evaluate(async ([nome, ms]) => {
    const G = window.__game, R = G.rete116; const r = [...R.remoti.values()].find((x) => x.ch && x.info.nome === nome); if (!r) return 'non lo vedo';
    const mira = () => { const c = G.cam.pos, t = r.ch.pos; const dx = t.x - c.x, dz = t.z - c.z, dy = t.y + 1.15 - c.y; G.cam.yaw = Math.atan2(dx, dz); G.cam.pitch = Math.atan2(dy, Math.hypot(dx, dz)); };
    const fr = () => new Promise((ok) => requestAnimationFrame(ok));
    for (let i = 0; i < 6; i++) { mira(); await fr(); }
    const t0 = performance.now(); G.input.mouseL = true;
    while (performance.now() - t0 < ms && r.ch && r.ch.alive) { mira(); G.input.dy = 0; await fr(); }
    G.input.mouseL = false; return 'ok';
  }, [nome, ms]);
}

(async () => {
  const A = await apri('Lorenzo');
  await A.page.click('#o116crea');
  await A.page.waitForFunction(() => window.__game.rete116.room, null, { timeout: 30000 });
  const codice = await A.page.evaluate(() => window.__game.rete116.room.roomId);
  const B = await apri('Amico', 'stanza=' + codice), C = await apri('Terzo', 'stanza=' + codice);
  for (const X of [B, C]) { await X.page.click('#o116entra'); await X.page.waitForFunction(() => window.__game.rete116.room, null, { timeout: 30000 }); }
  await aspetta(800);
  prova('tre giocatori nella stanza (3/10)', (await stato(A.page)).n === 3 && /3\/10/.test(await A.page.textContent('#modoNome116')), await A.page.textContent('#modoNome116'));
  for (const X of [A, B, C]) await X.page.click('#btnPlay');
  for (const X of [A, B, C]) await X.page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 60000 });
  await aspetta(2500);
  let sa = await stato(A.page), sb = await stato(B.page), sc = await stato(C.page);
  prova('ognuno vede gli altri due', sa.altri.length === 2 && sb.altri.length === 2 && sc.altri.length === 2, [sa.altri.length, sb.altri.length, sc.altri.length]);
  prova('vita piena per tutti, letta dal server', sa.server.every((g) => g.hp === 100 && g.vivo), sa.server);
  await scatta(A, '01_inizio'); await scatta(C, '01_inizio');

  // A spara a B per 0,6 s: B deve perdere vita (su tutti e tre) e vedere le scie di A
  const scieB0 = sb.scie, scieC0 = sc.scie, fiammeB0 = sb.fiamme;
  console.log('mira:', await miraESpara(A, 'Amico', 600));
  await aspetta(700);
  sa = await stato(A.page); sb = await stato(B.page); sc = await stato(C.page);
  const hpB = (s) => (s.server.find((g) => g.nome === 'Amico') || {}).hp;
  console.log('vita di B: server visto da A', hpB(sa), '| B stesso', sb.io.hp, '| visto da C', (sc.altri.find((x) => x.nome === 'Amico') || {}).hp);
  prova('A colpisce B: la vita di B scende (server)', hpB(sa) < 100 && hpB(sa) > 0, hpB(sa));
  prova('B vede la sua vita scesa', Math.abs(sb.io.hp - hpB(sa)) < 0.5, [sb.io.hp, hpB(sa)]);
  prova('C vede la vita di B scesa', Math.abs((sc.altri.find((x) => x.nome === 'Amico') || {}).hp - hpB(sa)) < 0.5);
  prova('B vede gli spari di A (scie e fiammate)', sb.scie > scieB0 && sb.fiamme > fiammeB0, [sb.scie - scieB0, sb.fiamme - fiammeB0]);
  prova('anche C vede gli spari di A', sc.scie > scieC0, sc.scie - scieC0);
  await scatta(B, '02_colpito'); await scatta(C, '02_A_spara');

  // A continua fino all'eliminazione di B
  console.log('mira:', await miraESpara(A, 'Amico', 6000));
  await aspetta(2500);
  sa = await stato(A.page); sb = await stato(B.page); sc = await stato(C.page);
  const B_srv = sa.server.find((g) => g.nome === 'Amico'), A_srv = sa.server.find((g) => g.nome === 'Lorenzo');
  prova('B eliminato sul server, uccisione ad A', B_srv && B_srv.vivo === false && B_srv.hp === 0 && A_srv.uccisioni === 1, [B_srv, A_srv]);
  prova('B vede la schermata "Eliminato"', sb.state === 'ended' && /Eliminato/i.test(sb.fine), [sb.state, sb.fine]);
  prova('A e C vedono B a terra', !(sa.altri.find((x) => x.nome === 'Amico') || {}).alive && !(sc.altri.find((x) => x.nome === 'Amico') || {}).alive);
  prova('l\'eliminazione compare nel feed di tutti', [sa, sb, sc].every((s) => /Lorenzo.*Amico/.test(s.feed)), [sa.feed, sb.feed, sc.feed]);
  prova('A e C ancora in partita (restano in due)', sa.state === 'playing' && sc.state === 'playing', [sa.state, sc.state]);
  await scatta(A, '03_B_eliminato'); await scatta(B, '03_eliminato'); await scatta(C, '03_B_eliminato');

  // B torna in lobby e rientra: vita piena, di nuovo in piedi per gli altri
  await B.page.evaluate(() => window.__game.quitToMenu()); await aspetta(500);
  await B.page.click('#btnPlay'); await B.page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 60000 }); await aspetta(2500);
  sa = await stato(A.page); sb = await stato(B.page);
  prova('B rientra: vita piena e A lo vede in piedi', sb.io.hp === 100 && sb.io.alive && (sa.altri.find((x) => x.nome === 'Amico') || {}).alive === true, [sb.io, sa.altri]);

  const err = [A, B, C].flatMap((X) => X.errori.map((e) => X.nome + ' ' + e));
  console.log(err.slice(0, 15).join('\n') || 'nessun errore nella pagina');
  prova('nessun errore nelle pagine', !err.some((e) => /PAGEERROR/.test(e)));
  console.log(`\n${ok} PASS, ${ko} FAIL`);
  for (const X of [A, B, C]) await X.browser.close();
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
