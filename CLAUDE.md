# Battlecraft — istruzioni per Claude

Battle royale in terza persona con costruzioni, nel browser (Three.js r160), di Lorenzo Deda
(GitHub: 22lord). Repo: https://github.com/22lord/battle-craft

## Prima di toccare qualsiasi cosa

Leggi **`docs/CONTESTO.md`** per intero: storia del progetto, vincoli, metodo, trappole già
pagate, stato attuale. È la memoria del progetto.

## Regole fisse

- Il gioco è **un solo file**: `index.html` (~17 MB, modelli/suoni incorporati). Il sorgente
  è l'HTML stesso: non esistono sorgenti divisi né build.
- Dalla v116 c'è anche il **server multiplayer** in `server/` (Colyseus, Node; `cd server && npm test`).
  Come funziona e come si pubblica (Vercel + Render): `docs/ONLINE.md`.
- La versione attuale sta in `VERSIONE`: aggiornala a ogni versione nuova.
- Test: `node test/run-all.cjs` (circa 10 minuti, solo Node, niente `npm install`).
  I test non vedono la grafica: luci, colori e movimenti si verificano giocando.
- Si parla in italiano.

## A fine sessione

Aggiorna `docs/CONTESTO.md` (stato, cosa è cambiato, nuove trappole) prima di fare commit,
così la prossima chat riparte da lì.
