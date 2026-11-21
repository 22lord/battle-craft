// Lancia tutti i test sul gioco. Uso:  node test/run-all.cjs [file.html]
// Senza argomenti prova index.html nella cartella principale.
// Serve solo Node (verificato con Node 22 e 24): niente npm install, niente rete.
const { spawnSync } = require('child_process');
const path = require('path');

const gioco = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const test = [
  ['accovacciamento.cjs', []],
  ['ombre.cjs', []],
  ['mappe-alternative.cjs', []],
  ['integrazione.cjs', []],
  ['mondo.cjs', ['90210', 'check']],
  ['mondo.cjs', ['123456', 'check']],
  ['mondo.cjs', ['999', 'check']],
  ['tregua-bot.cjs', []],
  ['suoni-lancio.cjs', []],
  ['mira-assistita.cjs', []],
  ['caricamento.cjs', []],
  ['pavimenti.cjs', []],
  ['villaggio.cjs', []],
  ['villaggio.cjs', ['123456']],
  ['scivolamento.cjs', ['check']],
];

let falliti = 0;
for (const [file, extra] of test) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, file), gioco, ...extra], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const ok = r.status === 0;
  if (!ok) falliti++;
  const nome = (file + ' ' + extra.join(' ')).trim().padEnd(32);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nome} ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (!ok) console.log((r.stdout + r.stderr).split('\n').filter((l) => !l.includes('deprecated')).slice(-12).join('\n'));
}
console.log(falliti ? `\n${falliti} test falliti` : '\nTutti i test passano');
console.log('Rapporto facoltativo (lento, nessun controllo): node test/partita-simulata.cjs index.html');
process.exit(falliti ? 1 : 0);
