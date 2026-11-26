// v113: mette il logo di Lorenzo (assets/logo/logo.webp, fatto da scontorna.cjs) al posto della scritta
// BATTLECRAFT nella barra della lobby e nelle due schermate di caricamento.
// Uso: node tools/logo113/applica.cjs   (parte dalla v112 del repo)
const fs = require('fs'), path = require('path');
const radice = path.join(__dirname, '..', '..');
const file = path.join(radice, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const b64 = fs.readFileSync(path.join(radice, 'assets', 'logo', 'logo.webp')).toString('base64');

function sost(cerca, metti) {
  const n = html.split(cerca).length - 1;
  if (n !== 1) throw new Error('trovato ' + n + ' volte: ' + cerca.slice(0, 80));
  html = html.replace(cerca, () => metti);
}

// 1) CSS: il logo una volta sola, come variabile; .logoImg lo disegna mantenendo le proporzioni (3:1)
sost('.logo{font-size:30px;line-height:.9;color:#fff;text-shadow:0 3px 0 #0b3a78;white-space:nowrap}',
  ':root{--logo113:url(data:image/webp;base64,' + b64 + ')}\n' +
  '/* v113: logo disegnato (martello + BATTLECRAFT in pietra), sfondo trasparente, proporzioni 3:1 */\n' +
  '.logoImg{display:block;aspect-ratio:3/1;background:var(--logo113) center/contain no-repeat;margin:0 auto}\n' +
  '.logo{flex:none}.logo .logoImg{height:54px;margin-top:4px;filter:drop-shadow(0 2px 0 rgba(5,20,44,.55))}\n' +
  '#loading91 h1 .logoImg,#matchLoad102 h1 .logoImg{width:100%;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}');
sost('@media (max-width:860px){.logo{font-size:22px}.logo small{font-size:9px;letter-spacing:2px}}',
  '@media (max-width:860px){.logo .logoImg{height:40px}}');
sost('body.touchMode84 .logo{font-size:22px}body.touchMode84 .logo small{font-size:7px;letter-spacing:2px}',
  'body.touchMode84 .logo .logoImg{height:40px;margin-top:2px}');

// 2) i tre punti dove c'era la scritta
const img = '<span class="logoImg" role="img" aria-label="Battlecraft"></span>';
sost('<div class="logo x">BATTLECRAFT</div>', '<div class="logo">' + img + '</div>');
sost('<div class="box"><h1>BATTLECRAFT</h1>', '<div class="box"><h1>' + img + '</h1>');
sost('<div class="loadBox"><h1>BATTLECRAFT</h1>', '<div class="loadBox"><h1>' + img + '</h1>');

// 3) versione
sost('<div id="ver">v112</div>', '<div id="ver">v113</div>');

fs.writeFileSync(file, html);
fs.writeFileSync(path.join(radice, 'VERSIONE'), '113\n');
console.log('ok: logo', b64.length, 'caratteri di base64');
