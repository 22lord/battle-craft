# Battlecraft — Ultimo in piedi

Battle royale in terza persona con costruzioni, nel browser. Isola cartoon, 30 giocatori
(tu + 29 bot), lancio dal bus col deltaplano, armi, raccolta materiali, costruzioni e zona
che si stringe.

Di **Lorenzo Deda** (@22lordd), Napoli.

## Come si gioca

Apri `index.html` con un browser (Chrome, Edge, Firefox, Safari). Tutto il gioco sta in
quel file: modello, animazioni, suoni e musica sono incorporati. L'unica cosa che scarica
è Three.js r160 dalla CDN, quindi al primo avvio serve la connessione.

- **Mouse e tastiera**: comandi riassegnabili nel menu
- **Controller**: LS muovi · RS visuale · A/✕ salta o apri deltaplano · RT/R2 spara ·
  LT/L2 mira · X/□ raccogli/ricarica · Y/△ piccone · LB/RB cambia arma · B/○ costruisci ·
  L3 corsa · R3 accovacciati · D-pad ↑ modifica, ↓ materiale, ←/→ pezzo · Options pausa
- **Telefono**: comandi a schermo, mira automatica quando spari verso un nemico

Prova grafica (strumento di confronto delle luci): aggiungi `?visualtest` in fondo
all'indirizzo.

## Struttura

```
index.html        il gioco (un solo file, ~17 MB per via dei modelli incorporati)
VERSIONE          numero della versione attuale
assets/audio/     sorgenti dei suoni del lancio, già livellati (sono anche dentro index.html)
docs/CONTESTO.md  storia del progetto, vincoli, metodo, trappole note, stato: leggerlo prima
                  di toccare il codice
test/             test automatici in Node, senza browser né rete
```

## Test

Serve solo Node (verificato con 22 e 24), niente `npm install`:

```
node test/run-all.cjs
```

Dura una decina di minuti. I test caricano il codice vero del gioco con Three.js r160 in
Node e misurano: accovacciamento, ombre, mappe, bot, terreno sotto le case, oggetti sui
pendii, suoni del lancio, mira assistita, schermata di caricamento. **Non vedono la
grafica**: luci, colori e naturalezza dei movimenti vanno controllati giocando.

## Prima di pubblicare

Il modello del personaggio è arrivato senza licenza: va verificata sul sito di origine
prima di rendere pubblica la repo o il gioco.
