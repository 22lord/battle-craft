# Battlecraft online — come funziona e come si pubblica

Dalla **v116** si gioca in due via Internet: uno crea la stanza, l'altro apre il link. Nessuna LAN,
nessun download, nessuna configurazione per i giocatori.

```
Browser A ──WebSocket──┐
                       ├── server Colyseus (cartella server/, Node) — stanza da 2, codice di 4 caratteri
Browser B ──WebSocket──┘
       ▲
       └── la pagina (index.html) sta su Vercel
```

## Come si gioca

1. **Crea stanza** (pannello sopra "Gioca"). Esce un codice, es. `K7Q2`.
2. **Copia link** e mandalo all'amico (`https://…/?stanza=K7Q2`): aprendolo trova il codice già scritto e preme **Entra**.
   In alternativa scrive il codice a mano.
3. Tutti e due premono **Gioca**. Si parte in due punti diversi di un prato a ovest della città, 10 m l'uno dall'altro.
4. Tornando alla lobby si resta nella stanza (si può rigiocare); **Esci** la lascia.

Se cade la connessione il gioco si riconnette da solo; il server tiene il posto per **30 secondi**.
Anche ricaricando la pagina, Entra con lo stesso codice rientra nello stesso posto.

## Cosa c'è nella prima versione (v116)

- stanze con codice, massimo 2 giocatori, il terzo è rifiutato
- posizione, rotazione, velocità sincronizzate; camminata, corsa, salto, accovacciamento e idle li calcola
  l'animazione del gioco già esistente dai dati ricevuti (nessun sistema di movimento nuovo)
- arma in mano, piccone, mira
- nome sopra la testa (grigio con "(…)" mentre l'altro si riconnette)
- il server controlla ogni movimento: velocità oltre la corsa, salite impossibili, teletrasporti, fuori mappa,
  troppi messaggi, orologio truccato. Se un movimento non va, rimanda il giocatore all'ultima posizione buona.
- modalità di prova: **niente bot, bus, tempesta e bottino** (andrebbero fuori sincronia fra i due).

**Non ancora**: danni fra giocatori (i colpi sull'altro non contano), costruzioni, raccolta, bus e tempesta
condivisi, oggetti a terra. Sono le fasi successive.

## Pubblicazione

Servono due servizi: uno per la pagina (**Vercel**) e uno per il server (**Render**, o qualsiasi servizio con
Node e WebSocket: Railway, Fly.io, un VPS). Tutti e due si collegano alla repo GitHub `22lord/battle-craft`.

### 1. Il server su Render

1. <https://render.com> → accedi con GitHub.
2. **New + → Blueprint** → scegli la repo `battle-craft`. Render legge `render.yaml`: servizio `battlecraft-server`,
   cartella `server/`, `npm ci`, `npm start`, piano free.
3. Quando è acceso, l'indirizzo è tipo `https://battlecraft-server.onrender.com`.
   Prova: aprendolo nel browser deve rispondere (pagina vuota, codice 200).
4. Il piano free **si addormenta dopo 15 minuti** senza visite: il primo "Crea stanza" dopo una pausa può metterci
   circa un minuto (il gioco dice "Server non raggiungibile": riprovare dopo qualche secondo). Per giocare spesso
   conviene il piano a pagamento più piccolo, o un altro servizio sempre acceso.

### 2. La pagina su Vercel

1. <https://vercel.com> → accedi con GitHub → **Add New → Project** → la repo `battle-craft`.
2. Framework: **Other**. Il resto lo prende da `vercel.json` (build `node tools/vercel/prepara.cjs`, uscita `dist/`).
3. **Environment Variables**: `BATTLECRAFT_SERVER_URL` = `wss://battlecraft-server.onrender.com`
   (l'indirizzo del punto 1 con `wss://` al posto di `https://`; se scrivi `https://` lo converte da solo).
4. Deploy. Il link (es. `https://battle-craft.vercel.app`) è quello da aprire e mandare.

`prepara.cjs` scrive l'indirizzo dentro `<meta name="battlecraft-server">` di una copia di `index.html` in `dist/`.
**Si rifiuta di pubblicare** se la variabile manca o punta a `localhost`: nella versione online localhost non entra mai.
`.vercelignore` tiene fuori modelli, foto, test, screen e il server: a Vercel arriva solo la pagina (~23 MB).

### 3. Chiudere il server alle sole pagine del gioco (consigliato)

Su Render, nel servizio: **Environment** → `ORIGINI_CONSENTITE` = `https://battle-craft.vercel.app`
(l'indirizzo di Vercel, più d'uno separati da virgola). Senza, qualsiasi pagina può creare stanze sul tuo server.

### Ordine delle cose

Prima Render (serve il suo indirizzo), poi Vercel (con quell'indirizzo), poi `ORIGINI_CONSENTITE` su Render
(con l'indirizzo di Vercel). Ogni push su `main` ripubblica tutti e due.

Il modello del personaggio l'ha fatto Lorenzo con Meshy (CONTESTO, vincolo 5): niente licenze di terzi da verificare.

## In locale (prove)

```
cd server && npm install && npm start          # server su ws://localhost:2567
node tools/browser/statico.cjs 8123            # gioco su http://localhost:8123/index.html
```

Aperta da localhost la pagina usa da sola `ws://localhost:2567`. Per provare un altro server: `?server=wss://...`.

## Test

| comando | cosa prova |
|---|---|
| `cd server && npm test` | regole del server (senza rete) + **due client veri** via WebSocket: codice, terzo rifiutato, sync, teletrasporto corretto, riconnessione, uscita |
| `cd server && node test/stanza.mjs wss://indirizzo` | lo stesso contro un server già acceso, anche quello online |
| `node test/v116.cjs` | la parte nel gioco con una stanza finta (fa parte di `node test/run-all.cjs`) |
| `node tools/browser/online116.cjs <uscita> [url-gioco] [url-server]` | **due Edge separati** sulla stessa stanza: si vedono, corrono, saltano, si accovacciano, cambiano arma, uno perde la connessione e rientra; scatti da tutti e due |

Per simulare Internet: `COLYSEUS_LATENCY=150 npm start` (150 ms andata e ritorno).
