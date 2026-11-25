# Prompt: grafica, animazioni e dettagli verso la qualità del riferimento

Da incollare in una chat nuova di Claude Code aperta in `Desktop\battlecraft`. Una **fase per sessione**: il file
è da 22 MB e ogni fase tocca luci, materiali o animazioni in tutto il gioco.

---

Lavoriamo su Battlecraft. Prima di tutto leggi `CLAUDE.md` e `docs/CONTESTO.md` per intero, poi
`tools/browser/README.md`. Obiettivo: portare la grafica, le animazioni e il "feel" il più vicino possibile al
riferimento (stile cartoon stilizzato, colori pieni, forme leggibili da lontano), restando in un solo HTML con
Three.js r160 da CDN e girando bene sulla mia GPU Intel UHD.

Regole di metodo (non negoziabili):
1. **Prima misuri e guardi, poi tocchi.** All'inizio della sessione fai i render "PRIMA" con Edge headless da
   6 inquadrature fisse e salvale in `screen/render/fase-N/prima/`:
   a) piazza del castello col personaggio di spalle (come lo screenshot `screen/Screenshot 2026-11-25 164755.png`)
   b) muro del castello da 1 m
   c) primo piano del personaggio in lobby
   d) bosco con alberi, cespugli ed erba
   e) villaggio sul lago
   f) vista dal bus
   A fine lavoro rifai le stesse 6 inquadrature in `dopo/` e mettimele affiancate (prima | dopo) in un'unica
   immagine per ogni punto.
2. **Budget prestazioni.** Ogni effetto nuovo va su un livello di qualità (`QUALITY` bassa/media/alta) e si può
   spegnere. "Bassa" deve restare leggera quanto oggi. Metti un contatore FPS/ms attivabile con F3 così te lo
   misuro io giocando (gli FPS headless non contano). Dimmi quanto pensi che costi ogni effetto.
3. **Niente percentuali di somiglianza** e non dire "risolto" o "come il riferimento" senza un confronto a occhio
   sulle inquadrature. Non nominare mai il gioco di riferimento nel codice, nei testi o nei documenti.
4. **Senso critico**: se una cosa che chiedo è sbagliata, costa troppo o il collo di bottiglia è altrove,
   dimmelo prima di farla. Se hai dubbi su una tecnica, cerca su internet invece di andare a tentativi.
5. Versione nuova a ogni consegna (`VERSIONE`), `node test/run-all.cjs` deve restare tutto PASS, aggiungi i
   test delle cose nuove dove si può misurare, aggiorna `docs/CONTESTO.md` e poi commit + push.

Se nella cartella `screen/riferimento/` ci sono immagini del riferimento, usale come bersaglio visivo.

## Cosa ho già notato io (dagli screenshot di `screen/`)

- **Una sola texture di pietra** (canvas 256 px) per muri, pavimento della piazza e castello: tutto uguale,
  sfocato da vicino, e il pavimento sembra il muro steso per terra.
- **Texture stirate** sulle forme curve e sui voxel del castello rotto (arco e blocchi: pietre enormi e
  deformate).
- **Bordi a gradini** in cima ai muri (si vedono i voxel), merli e silhouette poco puliti.
- **Luce piatta**: tone mapping lineare, niente occlusione ambientale, niente bloom. Le casse sembrano
  appoggiate in aria, gli angoli non scuriscono, le ombre interne sono quasi nere (muro a sinistra nel
  164807).
- **Il personaggio è realistico in un mondo cartoon**: stacca di stile. Capelli scuri e piatti, nessun
  controluce sul bordo, si perde contro il cielo.
- Materiali tutti opachi, niente variazione di colore tra pezzi uguali, niente usura sugli spigoli.
- Cespugli a palla verde uniforme, nuvole come macchie arancioni piatte.
- Finestre e persiane disegnate piatte sulla parete, niente profondità.

## Fasi (fanne UNA per sessione, nell'ordine; all'inizio dimmi il piano della fase e aspetta il mio ok)

### Fase 1 — Luce, cielo e post-processing (la base che cambia tutto il resto)
- Tone mapping ACES o AgX al posto del lineare, ritarando esposizione, sole, emisferica e ambiente sul
  modello analitico della sezione 3 di CONTESTO (rifai le misure della pelle).
- Post-processing con gli addon di `three@0.160.0` (stessa versione fissata): occlusione ambientale (GTAO o
  SAO; valuta anche N8AO), bloom leggero solo sulle cose emissive (lampade, colpi, anelli), antialiasing
  (SMAA o FXAA se il MSAA del composer costa troppo), una correzione colore finale (saturazione, contrasto,
  ombre tendenti al blu-viola, luci calde) come "grading" stilizzato.
- Ombre più nitide vicino al giocatore: valuta le ombre a cascata (addon CSM) contro una sola mappa che segue
  la camera. Ombre interne mai nere: luce di rimbalzo/ambiente più alta.
- Cielo: gradiente più ricco, disco del sole con alone, nuvole volumetriche finte (billboard o mesh morbide con
  bordo illuminato dal sole), foschia di altezza col colore del cielo all'orizzonte.
- Ciclo giorno/tramonto opzionale: almeno un preset "giorno pieno" luminoso oltre al tramonto attuale.

### Fase 2 — Materiali e texture
- Texture separate per ogni superficie: muro a conci squadrati, lastricato della piazza, pietra grezza, legno a
  tavole, intonaco, tegole, metallo. Procedurali su canvas a 512-1024 px, ognuna con la sua **normal map** e una
  mappa di occlusione/rugosità generate dalla stessa mappa di altezza (il modello del personaggio ha solo il
  colore: valuta se generargli una normal map dal colore o no).
- Densità dei texel uguale ovunque (decidi un numero di pixel per metro e rispettalo).
- **Proiezione triplanare o UV in coordinate mondo** per voxel del castello, rocce e terreno: niente più pietre
  stirate.
- Variazione per istanza (tinta, luminosità) su casse, pietre, tegole, alberi; usura chiara sugli spigoli e
  sporco scuro alla base dei muri (colori ai vertici o shader); muschio sui muri come sfumatura, non come
  superficie in più (trappola 7).
- Rugosità coerenti: pietra e legno opachi, metallo e vetro lucidi, acqua con riflessi e schiuma sulle rive.

### Fase 3 — Geometria e dettagli del mondo
- Spigoli smussati (bevel) sui pezzi principali: muri, casse, travi, gradini; è la cosa che più dà l'aspetto
  "giocattolo" del riferimento.
- Castello: cima dei muri e merli puliti, niente scalini di voxel visibili da lontano (anche solo una mesh di
  copertura liscia sopra la collisione a voxel).
- Finestre con cornice in rilievo e vetro rientrato, persiane staccate dal muro, tetti con spessore e sporgenza,
  grondaie, comignoli.
- Ombra di contatto (decal scura morbida) sotto casse, auto, oggetti a terra e personaggi.
- Più oggetti di scena (barili, sacchi, lanterne, carretti, staccionate, fiori, pietre sparse) con varietà, per
  riempire le zone vuote senza esagerare coi triangoli (istanziati).

### Fase 4 — Vegetazione
- Alberi stilizzati a ciuffi di chioma con normali "sferiche" (ombreggiatura morbida tipo nuvola) e colore che
  scurisce verso l'interno.
- Vento in vertex shader su chiome, cespugli ed erba (oscillazione + raffiche), con fase diversa per pianta.
- Erba istanziata vicino al giocatore che sfuma con la distanza; si piega quando ci passi in mezzo.
- Cespugli con forma più irregolare, qualche fiore, che si scuotono quando li attraversi o li colpisci.

### Fase 5 — Personaggio
- Ridurre lo stacco di stile realistico/cartoon: shading a rampa morbida (non toon duro), luce di bordo
  (rim) sempre presente, pelle con finto sottosuperficie (bordi più caldi), contorno sottile opzionale
  (`CONTORNO`, verificando che i colpi facciano ancora danno ai bot).
- Capelli: riflesso anisotropico (banda di luce) e **movimento secondario** (molla in vertex shader pesata
  sull'altezza sopra il collo, oppure ossa a molla se fattibile) che reagisce a corsa, salto, atterraggio e
  rotazioni.
- Piccone e armi con più dettaglio, materiali con colore della rarità e un leggero bagliore.

### Fase 6 — Animazioni e "feel" (la parte che fa sembrare vivo il gioco)
- **Piccone**: anticipazione, colpo veloce, rimbalzo; *hit-stop* di 40-60 ms all'impatto, piccolo scuotimento
  della camera, l'oggetto colpito oscilla/si schiaccia, schegge del colore del materiale, numero di danno che
  salta su, punto debole (cerchio) che si sposta come nel riferimento, suono diverso per materiale.
- **Costruzioni**: il pezzo appare con un'animazione (si "monta" dal basso o scala da 0,9 con un contorno
  trasparente che si riempie mentre prende vita), rimbalzo leggero a fine montaggio; quando si rompe si spacca
  in pezzi che cadono con fisica semplice e spariscono.
- **Movimento**: inclinazione del corpo nelle curve, polvere ai passi in corsa, salto con stacco e
  atterraggio con piccolo schiacciamento + anello di polvere, FOV che si allarga un po' in corsa, rotazione sul
  posto con passi (non scivolando), idle con qualche variazione ogni tanto.
- **Armi**: rinculo della camera e del corpo, fiammata con bloom, bossoli espulsi, scie dei colpi, indicatori
  di colpo (bianco/giallo/blu scudo) che pulsano, effetto di eliminazione.
- Raccolta oggetti: l'oggetto a terra ruota e fluttua con un alone del colore della rarità, raccolto vola
  verso il personaggio.
- Lancio dal bus e deltaplano: scia dalle mani/punte, vento sullo schermo a velocità alta.

### Fase 7 — Interfaccia "viva"
- Numeri che contano invece di cambiare di scatto (vita, scudo, materiali), barre che si svuotano con la scia
  bianca del danno, popup di raccolta che entrano e scivolano via, colpo ricevuto con vignetta rossa
  direzionale. Font e icone coerenti.

## Cosa voglio a fine di ogni fase
- le immagini prima | dopo delle 6 inquadrature
- l'elenco di cosa è cambiato, con il costo stimato in prestazioni per ogni effetto e il livello di qualità in
  cui è acceso
- cosa devo provare io giocando (FPS con F3, sensazioni, audio, telefono)
- cosa **non** hai potuto verificare
- commit + push, e CONTESTO.md aggiornato

Comincia dalla Fase 1.
