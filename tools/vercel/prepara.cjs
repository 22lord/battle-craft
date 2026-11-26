// Pubblicazione su Vercel: prepara dist/ con il solo index.html e l'indirizzo del server multiplayer
// dentro <meta name="battlecraft-server">. Lo lancia Vercel (vercel.json -> buildCommand).
// Variabile d'ambiente richiesta: BATTLECRAFT_SERVER_URL, es. wss://battlecraft-server.onrender.com
// In locale: BATTLECRAFT_SERVER_URL=wss://... node tools/vercel/prepara.cjs
const fs = require('fs'), path = require('path');
const RAD = path.join(__dirname, '..', '..'), DIST = path.join(RAD, 'dist');
let url = String(process.env.BATTLECRAFT_SERVER_URL || '').trim().replace(/\/+$/, '');
if (!url) { console.error('ERRORE: manca la variabile BATTLECRAFT_SERVER_URL (es. wss://battlecraft-server.onrender.com).'); process.exit(1); }
if (/^https?:\/\//i.test(url)) url = url.replace(/^http/i, 'ws');   // https://x -> wss://x
if (!/^wss?:\/\/[^\s"'<>]+$/i.test(url)) { console.error('ERRORE: BATTLECRAFT_SERVER_URL non valida: ' + url); process.exit(1); }
if (/localhost|127\.0\.0\.1/i.test(url)) { console.error('ERRORE: nella versione pubblicata il server non puo\' essere localhost.'); process.exit(1); }
if (url.startsWith('ws://')) console.warn('ATTENZIONE: ws:// senza TLS. Da una pagina https il browser lo blocca: usa wss://');

let s = fs.readFileSync(path.join(RAD, 'index.html'), 'utf8');
const da = '<meta name="battlecraft-server" content="">';
if (s.split(da).length !== 2) { console.error('ERRORE: index.html senza <meta name="battlecraft-server"> (serve la v116 o successiva).'); process.exit(1); }
s = s.replace(da, `<meta name="battlecraft-server" content="${url}">`);
fs.rmSync(DIST, { recursive: true, force: true }); fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), s);
console.log(`dist/index.html pronto (${(s.length / 1e6).toFixed(1)} MB), server: ${url}`);
