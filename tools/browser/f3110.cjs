// Uso: node tools/browser/f3110.cjs <uscita-dir> — partita, F3, pannello, clic su AO e Post (v110)
const { chromium } = require('playwright-core'); const path = require('path');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  await page.goto('http://localhost:8123/index.html', { timeout: 180000 });
  await page.waitForFunction(() => window.__game && window.__game.world && window.__game.lobbyCam, null, { timeout: 180000 });
  await page.evaluate(() => { const G = window.__game; G._skipLock102 = true; G.startMatch(); G._skipLock102 = false; });
  await page.waitForTimeout(3000);
  await page.keyboard.press('F3'); await page.waitForTimeout(1500);
  const leggi = () => page.evaluate(() => { const G = window.__game; return { on: G.perf110.on, testo: G.perf110.txt.textContent, ext: !!G.perf110.ext, ao: G.post110.eff('ao'), post: G.post110.eff('post'), attivo: G.post110.attivo() }; });
  console.log(JSON.stringify(await leggi()));
  await page.screenshot({ path: path.join(out, 'f3_aperto.png') });
  await page.click('#perf110 button:nth-child(2)'); await page.waitForTimeout(800); console.log('dopo clic AO', JSON.stringify(await leggi()));
  await page.click('#perf110 button:nth-child(1)'); await page.waitForTimeout(800); console.log('dopo clic Post', JSON.stringify(await leggi()));
  await page.screenshot({ path: path.join(out, 'f3_senza_post.png') });
  await page.keyboard.press('F3'); await page.waitForTimeout(300); console.log('chiuso', (await leggi()).on === false);
  console.log(errs.slice(0, 20).join('\n') || 'nessun errore');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
