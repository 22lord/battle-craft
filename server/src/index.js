import { defineServer, defineRoom, matchMaker } from 'colyseus';
import { StanzaBattle } from './StanzaBattle.js';

/* Server multiplayer di Battlecraft.
   Variabili d'ambiente:
     PORT                la da' il servizio che lo ospita (Render, Railway, Fly...); in locale 2567
     ORIGINI_CONSENTITE  facoltativa: indirizzi del gioco separati da virgola
                         (es. https://battlecraft.vercel.app). Se c'e', solo quelle pagine possono
                         entrare nelle stanze; se manca, chiunque (comodo per le prove). */
const porta = Number(process.env.PORT) || 2567;
const origini = String(process.env.ORIGINI_CONSENTITE || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);

if (origini.length) {
  matchMaker.controller.getCorsHeaders = function (headers) {
    const o = headers.get('origin') || '';
    return { 'Access-Control-Allow-Origin': origini.includes(o) ? o : origini[0], Vary: 'Origin' };
  };
}

const server = defineServer({
  rooms: { battle: defineRoom(StanzaBattle) },
  greet: false,
});

await server.listen(porta);
console.log(`Battlecraft server in ascolto sulla porta ${porta}` + (origini.length ? ` (origini: ${origini.join(', ')})` : ' (tutte le origini)'));
