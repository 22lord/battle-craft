// Server statico minimo per provare il gioco in locale. Uso: node tools/browser/statico.cjs [porta] [cartella]
// (npx http-server a volte e' bloccato dai permessi: questo non scarica niente)
const http = require('http'), fs = require('fs'), path = require('path');
const porta = Number(process.argv[2]) || 8123, radice = path.resolve(process.argv[3] || path.join(__dirname, '..', '..'));
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.cjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(radice, p); if (!f.startsWith(radice)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': TIPI[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
}).listen(porta, '127.0.0.1', () => console.log(`statico su http://localhost:${porta}/ da ${radice}`));
