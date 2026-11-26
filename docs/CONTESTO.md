# Contesto completo — gioco "Battlecraft" (ex "Battle Legends") con l'isola dentro

Documento di passaggio di consegne. Serve a riprendere in una chat nuova senza ripartire
da zero e senza rifare errori già pagati.

Autore: Lorenzo Deda (@22lordd), Napoli.
Stato al 26 novembre 2026: **battlecraft v117**, un solo file HTML (`index.html` nella repo) + il **server multiplayer** in `server/` (sezioni 9.16 e 9.17, guida in `docs/ONLINE.md`). Gioco e isola sono
**fusi**: l'isola della vecchia "mappa" è il terreno della partita.

Versione del contesto: v13. Le v94-v97 non sono mai arrivate in chat:
le differenze v93→v98 sono in 9.1, v99→v102 in 9.2, v103 in 9.3, v104 in 9.4, v105 in 9.5, v106 in 9.6, v107 in 9.7, v108 in 9.8, v109 in 9.9, v110 in 9.10, v111 in 9.11, v112 in 9.12, v113 in 9.13, v114 in 9.14, v115 in 9.15, v116 in 9.16, v117 in 9.17.

**Dalla v110 la grafica procede a fasi** (prompt in `docs/PROMPT-GRAFICA.md`, una fase per sessione, piano
prima e ok di Lorenzo). Fatte: **fase 1 (luce, cielo, post-processing)** e **fase 2 (materiali e texture,
v112)**. Prossima: **fase 3 (geometria e dettagli del mondo)**. Ogni fase rifà le 6 inquadrature fisse con `tools/browser/fase.cjs` (sezione 9.10).

**Novità grossa della v103: il gioco adesso si può VEDERE renderizzato** (sezione 3.1), dal
PC di Lorenzo, con la sua GPU. Molte frasi "non verificato a occhio" qui sotto si possono
finalmente verificare.

---

## 0. Come leggere questo documento — cosa è cambiato rispetto alla v2

- **Non ci sono più due progetti.** Nella v93 dentro l'HTML ci sono `MARE = 0`,
  `RAGGIO_ISOLA = 150`, `MAPPA = 440`, `CITTA`, `CRESTA`, i tre `LAGHI` (Lago Grande,
  Lago Alto, Laguna), i `PATHS` e i materiali `MX`: è il terreno della mappa v6 dentro il
  gioco. Il titolo della pagina è «BATTLECRAFT».
- **Le versioni dalla v70 alla v92 sono state fatte in altre chat e non sono documentate
  qui.** Si sa solo quello che dice il LEGGIMI della v93 (sezione 9). Se serve sapere
  quando è entrato qualcosa, chiedere a Lorenzo o confrontare i file.
- **I sorgenti divisi non ci sono più.** `/home/claude/game/`, `/home/claude/mappa/`,
  `/home/claude/tools/`, `build.py`, `parts/`, il renderer finto, il semplificatore:
  tutto perso con il vecchio ambiente. **Il sorgente adesso è l'HTML compilato stesso**
  (vedi sezione 2).
- **C'è Three.js r160 vero in Node** (sezione 3): cambia cosa si può verificare.

Le sezioni 1, 4, 6, 7, 8 valgono come prima. La 10 (l'isola) resta, perché l'isola è
ancora quella, ma adesso vive dentro il gioco.

---

## 1. Vincoli fermi (richieste esplicite, non negoziabili)

1. **Non nominare mai il titolo del gioco di riferimento**, nemmeno nei commenti, nei
   testi, nel titolo o nei LEGGIMI. Si dice "il riferimento".
   ATTENZIONE: il LEGGIMI della v93 lo nomina una volta (sezione «Confronto e
   prestazioni»). Il codice dell'HTML invece è pulito (0 occorrenze, verificato). Alla
   prossima consegna quella riga va corretta.
2. **Non affermare di aver ottenuto una corrispondenza perfetta o una percentuale di
   fedeltà senza un metodo di misura definito.**
3. **Senso critico**: cercare la causa vera con i dati, non eseguire alla lettera. Se una
   richiesta poggia su una diagnosi sbagliata, dirlo. Richiesta sua, testuale: «ogni volta
   che ti do sti comandi cerca di sviluppare un senso critico».
4. **Ogni file consegnato va rinominato con un numero di versione progressivo**, mai lo
   stesso nome due volte. La prossima è la **v118**. Nella repo il file si chiama `index.html` e la
   versione sta in `VERSIONE`: le consegne fuori dalla repo restano `battlecraft-vNN.html`.
5. **Il modello del personaggio l'ha fatto Lorenzo con Meshy** (detto da lui il 26/11/2026, v116): non viene da un sito
   di terzi, la questione licenza è chiusa. (Meshy: col piano gratuito i modelli escono in CC BY 4.0, cioè va citato
   Meshy; coi piani a pagamento sono dell'utente.)
6. Tono: diretto, colloquiale, niente professorino, niente complimenti di circostanza.
   Se sbaglia, dirglielo. Risposte corte dove si può.
7. Mondo **cartoon, stile del riferimento**: colori pieni, forme leggibili da lontano,
   niente realismo.

---

## 2. Il vincolo tecnico che decide tutto

**Un solo file HTML.** Niente passo di compilazione per Lorenzo, niente file esterni.
Three.js r160 da CDN con versione fissata (`importmap` su
`cdn.jsdelivr.net/npm/three@0.160.0`), tutto il resto — modello, animazioni, musica,
texture — dentro il file in base64 (+gzip dove serve). 16 payload incorporati, invariati
dalla v92.

### Com'è fatto il file (v93: 15,9 MB, 7.777 righe; v98: 7.794 righe, stessa struttura)

- righe 1-443: HTML, CSS, interfaccia, importmap
- riga 445: libreria di decompressione (minificata)
- riga 447 in poi: **un unico `<script type="module">`** con tutto il gioco
- alcune righe sono enormi (fino a 5,8 milioni di caratteri): sono i payload. **Non
  aprirle con Read e non stamparle**: tagliare sempre con `cut -c1-200`

Mappa approssimativa del modulo (numeri di riga della v93; nella v98 dalla riga ~1728 in
giù sono spostati di +3/+20; si spostano a ogni modifica):

| righe | cosa |
|---|---|
| 453-459 | `PROP_*` modelli di scenario (pino, albero, cespuglio, auto) |
| 498-760 | comandi, `QUALITY`, `CAMCFG`, `MOVECFG`, `JUMPCFG`, `BUILDCFG`, armi, rumore |
| 807 | `AudioSys` |
| 943-1230 | texture procedurali, `CONTORNO`, `VEGCFG`, prop, geometrie di base |
| 1244-1700 | armi procedurali, personaggio procedurale (ripiego) |
| 1699-2060 | lettore GLB, retarget delle ossa, `adaptLoadedModel` |
| 2155-2950 | animazione del modello esterno, IK braccia, vetrina, clip, `LOCO` |
| 2953-3170 | `MICRO` micromovimenti |
| 3176-3310 | **terreno dell'isola** (`terrainHeight`, `raggioMosso`, colori) |
| 3311 | `Physics` |
| 3548-3730 | natura, materiali, `RenderChunks` |
| 3730 | `World` (fino a ~4180), poi `LUOGHI`, `MX`, costruzione dei luoghi |
| 4691-5025 | bot: nomi, palette, IK "umano" di mani/piedi/sguardo |
| 5026 | `Character` |
| 5510-6170 | `Combat`, `FX`, costruzioni (`BuildGrid`, `SupportGraph`, `BuildSystem`, `EditSystem`), `Harvest`, `Items`, `SafeZone`, `BotBrain` |
| 6320-6535 | lobby e set scenografico |
| 6574-6643 | **accovacciamento** (`canStand`, `updateCrouch`, `crouchPose`) |
| 6644-6975 | `Drop`, input (gamepad, touch), `CameraRig`, `HUD` |
| 7007 | `Game` |
| 7591-7700 | **prova grafica v93** (`stableSun93`, `labRoute93`, `VisualLab93`) |

### Come modificarlo senza sorgenti divisi

Opzioni, da decidere al primo intervento serio:
- **modifiche puntuali** con Edit direttamente sull'HTML, cercando con grep. Va bene per
  ritocchi
- **ricostruire la cartella `parts/` + `build.py`**: estrarre il modulo in file per area
  (i payload in file a parte), ricompilare. Costa un'ora ma rende sicuri i lavori grossi

In entrambi i casi: dopo ogni modifica rilanciare i test della sezione 5.

Nota di stile: il codice v93 aggiunto dall'altra chat è compatto, quasi minificato, con
suffisso `93` sui nomi (`VisualLab93`, `crouch90`) e commenti in inglese. Il resto è nello
stile vecchio (italiano, commenti lunghi).

---

## 3. IL LIMITE CENTRALE — leggere prima di toccare le luci

**Nell'ambiente di lavoro la rete non c'è.** Verificato anche il 21/11: la richiesta alla
CDN di Three.js torna **403 dal proxy**. Niente CDN, niente npm, niente pip.

Cosa c'è di nuovo rispetto alla v2:
- **Node 22** è installato (`/opt/node22/bin/node`). I test della v93 sono stati scritti
  per Node 24 ma girano anche su 22
- nella repo c'è **`test/lib/three.cjs`: Three.js r160 vero**, build CommonJS. Con
  questo i test caricano il modulo del gioco in Node (`vm` + un canvas finto) e usano lo
  scheletro, le geometrie, le matrici delle ombre e la fisica **veri**
- l'avviso «build/three.js deprecated» che stampa è normale, non è un errore

Cosa **ancora non si può fare**: vedere un fotogramma. Non c'è WebGL. Anche l'altra chat
che ha fatto la v93 ha provato un browser di anteprima e ha avuto `Error creating WebGL
context`. Quindi **l'aspetto della v93 non l'ha mai visto nessuno tranne Lorenzo**.

Va bene per: posizioni, ossa, lunghezze, collisioni, logica, matrici, numeri.
**Non va bene per: luci, ombre, esposizione, colore finale, naturalezza del movimento.**

Il vecchio `test/three_stub.js` (renderer WebGL1 finto) è perso. Se servisse di nuovo una
composizione approssimativa, va riscritto o sostituito da un rasterizzatore in numpy.

### 3.1 Dal 21/11/2026, sul PC di Lorenzo: si vede

Il limite qui sopra vale per il **cloud**. Claude Code ora gira anche sul PC di Lorenzo
(Windows 11, GPU Intel UHD), e lì **Edge headless ha WebGL vero** (ANGLE/D3D11): scatti
1280×720 della partita vera, con le luci, le ombre e la foschia del gioco. Strumenti e
istruzioni in `tools/browser/README.md` (telecamera libera su punti del mondo, partita
vera dal clic su Gioca). Il Chrome che si aspetta il plugin Playwright non c'è: si pilota
Edge con `playwright-core`.

Nella v103 è servito subito: ha trovato tre difetti che nessun test numerico vedeva (il
cielo tagliato dietro il bus, la dissolvenza sul fotogramma sbagliato, il comignolo
sospeso) e uno strumento sbagliato (il pontile mezzo all'asciutto, sezione 9.3).
Resta vero: niente audio, niente telefono, FPS headless non significativi.

### Il sostituto: il modello analitico delle luci

Le luci non si guardano, si **calcolano**. Formule di Three.js r160 per
`MeshStandardMaterial`:

```
irradianza direzionale = colore_luce * intensita * max(0, N·L)
irradianza emisferica  = mix(terra, cielo, 0.5 + 0.5*N.y) * intensita
irradianza da ambiente = PI * radianza_ambiente * envMapIntensity
uscita                 = irradianza * albedo / PI          (BRDF di Lambert)
poi: tone mapping lineare (x esposizione), poi codifica sRGB
```

Valori misurati, da riusare:

- **albedo della pelle**: lineare `(0.700, 0.502, 0.475)`
- **albedo della maglietta nera**: `0.031` lineare
- **radianza media della mappa d'ambiente**: `(0.089, 0.174, 0.179)`

**Verificato** a suo tempo: previsione 191 su 255 per la pelle di fronte, misura sullo
screenshot reale 193. Entro l'1%. Attenzione: la v93 cambia sole, luce diffusa e foschia
nel suo "DOPO", quindi prima di riusare questi numeri **leggere i valori nuovi nel codice**.

**Dalla v110 il modello è codice: `tools/luce110.cjs`** (formule sopra + curva ACES di Three r160 copiata
esatta + il grading del gioco `GRADING110`, che il test `v110.cjs` tiene allineato). Il tone mapping non è più
lineare: `CustomToneMapping` = ACES + grading. Le chiavi del ciclo del giorno da provare stanno in
`tools/luce110-chiavi.json`. **Riverificato il 25/11** sul render (`tools/browser/pelle110.cjs`, mezzogiorno,
avambracci rivolti in su): previsione 240/226/218, misura 238/226/220. La radianza media della mappa
d'ambiente ora cambia con l'ora (circa 0,12/0,20/0,28 a mezzogiorno).

---

## 4. Il metodo — la parte più importante del documento

**Misurare, non guardare. E buttare via gli strumenti che si rivelano difettosi.**

Ogni volta che qualcosa "sembrava sbagliato", prima si è costruito uno strumento per
misurarlo, poi si è deciso. Molte diagnosi a occhio si sono rivelate false, comprese
quelle fatte con sicurezza.

### Strumenti che hanno mentito (e sono stati buttati)

- misurare la planarità lungo +z quando il davanti è −z
- assumere `dt = 1/60`
- misurare il ginocchio destro quando è il sinistro che si raccoglie
- interrogare il terreno sotto ciascun piede separatamente: dava 31 cm di dislivello fra
  piedi distanti 20 cm (era la pendenza del terreno, letta come piede alzato)
- mediare la luminanza su un riquadro che attraversa un braccio cilindrico: la modellazione
  si annulla da sola nella media
- mascherare "la figura" con una soglia di luminosità: prendeva anche l'interfaccia
- misurare l'angolo diedro per trovare gli spigoli vivi: dava 75° sul corpo liscio
  originale, cioè misurava altro. Sostituito dal test indipendente sul verso `fn·vn`
- provare la locomozione nel mondo vero: il personaggio sbatteva negli ostacoli, 11 m
  percorsi contro 18 attesi. Sostituito da un banco di prova piatto e vuoto
  (nota: il percorso diagnostico della v93 risolve lo stesso problema in un altro modo,
  cercando la strada con A* sulla geometria della mappa ed evitando gli ostacoli)

### Diagnosi sbagliate, poi corrette dalla misura

- «è poco illuminata» → mediana **193 su 255**: era **sovraesposta**
- «i capelli sono pixellosi, serve più geometria» → **34.000 triangoli su 90 pixel** di
  testa: sono già sub-pixel, più geometria peggiora. Era filtraggio (anisotropia a 1) e
  risoluzione di rendering
- «il pavimento della città è buggato» → z-fighting fra piazza e strade complanari
- «l'acqua è più alta del molo» → non era il molo (vedi sezione 10.4)

### Quando i test non bastano

Tre volte è servito guardare i **fotogrammi estratti con ffmpeg** dalle registrazioni
dello schermo di Lorenzo: così sono usciti il bug delle braccia bloccate e quello del
fucile che fluttuava, che nessuna misura numerica aveva mostrato. **I suoi screenshot e
video sono una fonte di verità che i test non sostituiscono.** Con la v93 questo vale
ancora di più: il pulsante «Salva immagine» della prova grafica esporta un 1280×720 e
«Salva misure» i dati delle traversate. Chiederglieli.

---

## 5. Strumenti e test

### Persi con il vecchio ambiente (da ricostruire solo se servono)

| file | cosa faceva |
|---|---|
| `fbx2.py`, `fbxmodel.py`, `fbxanim.py` | lettore FBX binario, scheletro/mesh/pelle, clip |
| `glbskin.py` | scrittore GLB riggato (indici u32 oltre 65.536 vertici) |
| `posa.py` | posa e skinning in numpy |
| `collassa.py` | **semplificatore a contrazione di spigoli (Garland-Heckbert)** |
| `test/run_test.py` | la vecchia suite da 76 test |
| `test/shot.py` + `sc_*.js` | renderer finto + 139 scenari di misura |

Le note tecniche per riscriverli sono nelle sezioni 6 e 8. **`decimate.py` (griglia) non
va riscritto**: era sbagliato (sezione 6).

### Disponibili adesso (nella repo, cartella `test/`; prima nello zip della v93)

```
test/run-all.cjs            lancia tutto:  node test/run-all.cjs   (prova index.html)
test/lib/three.cjs          Three.js r160 CommonJS
test/harness.cjs            carica il modulo del gioco in Node (vm + DOM/canvas finti)
test/harness-lite.cjs       versione leggera (accovacciamento)
test/accovacciamento.cjs    passi bassi, niente incroci, ossa fisse, soffitto
test/ombre.cjs              deriva della proiezione delle ombre
test/mappe-alternative.cjs  semi 123456 e 999
test/integrazione.cjs       mappa, bot, audio spari, prova grafica, riavvio
test/mondo.cjs SEME check   case senza terreno dentro, auto, casse, atterraggi, elementi tolti
test/tregua-bot.cjs         tregua fra bot
test/suoni-lancio.cjs       lancio intero con audio finto che registra volumi
test/mira-assistita.cjs     mira per telefono/controller/mouse, muri, portata
test/caricamento.cjs        schermata di caricamento
test/partita-simulata.cjs   rapporto (senza controlli): quando muoiono i bot
test/pavimenti.cjs          v103: piastrelle che reggono, si rompono, tornano; niente buchi
test/villaggio.cjs [SEME]   v103: case all'asciutto, pontili calpestabili, faro, bottino
test/scivolamento.cjs check v103: piede in appoggio fermo, accovacciati, velocita' vere
tools/browser/              v103: render veri con Edge (non sono test: vedi README)
test/v110.cjs               v110: curva, nebbia, livelli di qualità, ciclo del giorno, modello analitico, F3, mappa non spostata
test/v111.cjs               v111: sparo automatico, finestra del nome, scritta della versione
test/v112.cjs               v112: tappi del castello (spenti, si accendono rompendo, si rispengono), UV nel mondo, ripiego senza GPU
test/v115.cjs               v115: auto (modello, colori, tetti, sentieri e case, piano, collisioni, porte, piccone)
test/v116.cjs               v116: indirizzo del server, solitario invariato, partita online, l'altro giocatore (stanza finta)
server/test/stanza.mjs      v116: regole del server + DUE CLIENT VERI via WebSocket (cd server && npm test; non e' in run-all: serve npm install)
test/v114.cjs               v114: estrazione per rarità, forziere (modello, piazzamento, raggio, una volta sola, bottino, danno), medikit
```

Strumenti della v110 (in `tools/`, non sono test):

```
tools/browser/fase.cjs <out> [url] [qualità] [ora]   le 6 inquadrature fisse delle fasi grafiche (+ draw call/triangoli)
tools/browser/affianca.cjs <out.png> <colonne> img...  griglia di immagini con etichette (prima | dopo)
tools/browser/misura.cjs <img> x y w h [img2...]       mediana/90% di R,G,B,luminanza in un riquadro
tools/browser/pelle110.cjs <out.png> [ora]             personaggio di fronte al sole, per misurare la pelle
tools/browser/costi110.cjs [w h] [url]                 ms GPU veri (query del timer) per ogni effetto, vista fissa
tools/browser/f3110.cjs <out>                          prova del pannello F3 e dei suoi interruttori
tools/luce110.cjs                                      modello analitico delle luci (sezione 3)
tools/patch110/                                        la patch della v110 (blocco.js, cielo.js, applica.cjs)
tools/patch112/                                        la patch della v112 (materiali.js, tappi.js, applica.cjs)
tools/browser/texture112.cjs <out.png>                 foglio delle texture generate (colore | normal | rugosità) e ms di generazione
tools/browser/cuciture112.cjs <cartella> [url] [vista] diagnosi di linee sul castello: normale / senza ombre / magenta senza luci / colore per blocco
tools/browser/esegui.cjs <script.js> [url]             esegue uno script nella pagina col gioco caricato (riceve G) e stampa il risultato
tools/logo113/scontorna.cjs <logo.jpg> <uscita> [larg]  scontorna un logo su fondo verde (Edge): logo.png/.webp trasparenti + anteprima
tools/logo113/applica.cjs                              la patch della v113 (logo nella barra e nei due caricamenti, versione)
tools/logo113/guarda.cjs [uscita]                      scatti di caricamento, lobby (PC e telefono) e "SI PARTE"
tools/forziere114/prepara.cjs [in.glb] [out.glb]       v114: forziere di Lorenzo diviso in cassa + coperchio, semplificato (meshoptimizer), texture ridotte
tools/patch114/                                        la patch della v114 (forzieri.js, applica.cjs)
tools/macchina115/prepara.cjs [in.obj] [out.glb]       v115: auto di Lorenzo da OBJ a GLB in 3 pezzi (colori, semplificazione)
tools/patch115/                                        la patch della v115 (auto.js, strade.js, applica.cjs)
tools/patch116/                                        la patch della v116 (rete.js, applica.cjs)
tools/patch117/                                        la patch della v117: SOSTITUISCE il modulo di rete intero con il suo rete.js
tools/browser/online117.cjs <out> [url] [server]       v117: TRE Edge separati, A spara a B fino a eliminarlo, C guarda (15 controlli)
tools/browser/statico.cjs [porta] [cartella]           server statico in Node (8123 = repo, 8124 dist = come su Vercel)
tools/browser/online116.cjs <out> [url] [server]       v116: DUE Edge separati nella stessa stanza, 27 controlli + scatti da tutti e due
tools/vercel/prepara.cjs                               v116: dist/index.html con l'indirizzo del server (BATTLECRAFT_SERVER_URL), rifiuta localhost
```

Tempi: ~10 minuti in tutto sul banco di prova del cloud.

**Regola**: questi test devono restare PASS dopo ogni modifica. Quando si aggiunge una
funzione, si aggiunge il suo test.

---

## 6. Il personaggio e le animazioni

Modello femminile fornito da Lorenzo (951.810 triangoli originali), riggato Mixamo:
**33 ossa**, prefisso `mixamorig:`.

Pipeline costruita da zero: FBX binario → numpy → GLB → base64+gzip → dentro l'HTML.

Cose non ovvie imparate strada facendo:

- FBX: record `(endOffset, numProperties, propertyListLen, nameLen, name, props, children)`,
  offset a 64 bit dalla 7500, array compressi con zlib
- in `Connections` **il primo id è il FIGLIO**
- unità di tempo FBX: `46186158000` per secondo
- trasformazioni: `localMatrix = T · Rpre · R · S`, riposo = `T · Rpre`, quindi
  **`localAnim = restLocal × R_anim`**. Verificato contro `TransformLink` con errore 0,00000

### La semplificazione della mesh — la storia completa

Prima versione: **raggruppamento a griglia**. Fonde i vertici che capitano nella stessa
cella. Due vertici possono stare nella stessa cella **senza essere collegati**: le due
facce opposte di un nastro di capelli, due ciocche affiancate. Fondendoli si strappa la
superficie. Misurato: bordo aperto da 217 m a 653 m, **63.902 spigoli aperti (56%)** contro
0 dell'originale. Erano i buchi che Lorenzo continuava a segnalare e che venivano cercati
altrove (verso delle facce, normali, luci).

Seconda versione, quella giusta: **contrazione di spigoli con metrica quadrica**. Lavora
solo lungo spigoli che esistono davvero, quindi la topologia non si rompe mai. Risultato:
**0 spigoli aperti**. Tre accorgimenti che contano:

1. **Saldatura prima, separazione dopo.** Il modello ha il 15% di vertici doppi, sdoppiati
   sulle cuciture della texture. Si saldano per posizione prima di cominciare, le UV
   viaggiano **per angolo di triangolo**, e alla fine i vertici si risdoppiano dove le UV
   non coincidono.
2. **Regola di contenimento delle isole UV.** Senza, 2.706 triangoli finivano a cavallo di
   due isole dell'atlante e campionavano il vuoto: erano le **macchie** che ha segnalato
   (807 campionavano nero).
3. **Normali per angolo con separazione degli spigoli vivi** (soglia 55-75°). Mediare le
   normali attraverso una piega dà un vertice che punta dove non c'è superficie: era il
   **puntino sulla spalla** (2,07% dei vertici della pelle con normale opposta ai vicini,
   sceso a 0,000%).

Esperimento fatto e **rigettato**: pesare la quadrica con la curvatura. La silhouette
peggiorava (p99 da 5,42 a 6,18 mm). Annullato.

### Decimazione per regione

La riduzione non è uniforme: la dimensione della cella dipende dall'osso che pesa di più
su ogni vertice. Testa e mani 6,8 mm, braccia 14-16, gambe e busto 20. Il **62% dei
triangoli dell'eroe sta sulla testa**, che è dove si guarda.

### Le 19 clip

`idle, cammina, corre, corsa_lenta, strafe_sx, strafe_dx, strafe_sx_lento, strafe_dx_lento,
salto, gira_sx, gira_dx, spara, spara2, muore, posa_lobby, ballo1, ballo2, parte,
salto_indietro`

Quaternioni int16 divisi per `scala` (4096), **non normalizzati** — il lettore normalizza
in `applicaPosa`. La posa della lobby è "Standing Pose 2".

Non c'è una clip di accovacciamento: la v93 costruisce la postura bassa in codice
(`crouchPose`) partendo dalle clip erette (sezione 9).

---

## 7. Numeri tarati del gioco (e perché)

Valori fissati fino alla v69. **Prima di fidarsi, ricontrollarli nella v93**: in mezzo ci
sono 24 versioni non documentate.

### Velocità

| | valore | nota |
|---|---|---|
| `MOVECFG.walk` | 2,6 m/s | erano 5,0: le clip andavano al 307% |
| `MOVECFG.run` | 4,6 m/s | erano 7,6: al 207% |
| `LOCO.vCammina` | 1,77 u/s | velocità naturale della clip |
| `LOCO.vCorre` | 3,99 u/s | da moltiplicare per `m.scale` (0,92) |

### Luci della lobby

| luce | valore | posizione |
|---|---|---|
| emisferica | 0,08 (0,30 se le ombre sono spente) | — |
| frontale "faccia" | 0,32 | (0,6, 1,7, 6) |
| **chiave** | 4,4 | (5,49, 4,40, 2,56) — azimut 65°, elevazione 30° |
| riempimento | 0,12 | (−4, 2, 5) |
| **controluce** | 1,5 | (−3,6, 3,4, −4,4) — **proietta ombra anche lui** |
| esposizione | 0,80 lobby, 0,86 partita | |
| `envMapIntensity` | **0,16 sul personaggio**, 0,75 sul set | |

Previsione sulla pelle: verso la chiave 205, di fronte 144, in ombra 106. Rapporto
chiaro/scuro **1,94** (era 1,35, cioè piatto).

**La chiave sta davanti per illuminare il viso, il controluce sta dietro per proiettare
l'ombra verso la camera.** Sono due esigenze opposte: l'unico modo è separarle.

### Micromovimenti (`MICRO`)

`resp` 0,21 Hz (~13 respiri/min) · `respBusto` 0,019 rad · `peso` 0,053 Hz (un travaso ogni
~19 s) · `pesoRoll` 0,052 rad · `sguardoY` 0,23 · sosta fra sguardi 1,4-4,2 s.

Misurato su 40 secondi simulati: **piedi 0,0 mm**, testa 9 mm laterali, mano appoggiata
entro 5 mm dall'ancoraggio.

---

## 8. Trappole note (costate tempo, non ripeterle)

1. **Doppio saltello**: la radice è un osso dentro il supporto; aggiungere il saltello a
   entrambi lo raddoppia. Esiste `rootRestY` apposta.
2. **La posa di riposo va fotografata alla costruzione del modello**, in
   `userData.qRiposo`, PRIMA che l'IK tocchi le ossa.
3. **`gunzip` restituisce ArrayBuffer, non Uint8Array**: senza conversione il ciclo di
   lettura dell'intestazione non termina mai.
4. **La clip dell'arma non va mediata con la locomozione, va sostituita**: serve la
   maschera `sotto`, se no le braccia pendono.
5. **Ruotare il bacino sposta i piedi**: 2,7 cm per grado di rollio. Senza IK, tutto ciò che
   deve lasciare i piedi a terra va messo SOPRA il bacino. (L'accovacciamento v93 riduce
   proprio il rollio del bacino ereditato dalle clip erette.)
6. **CCD: la rotazione va portata nel sistema del PADRE e premoltiplicata**:
   `locale_nuovo = (padre⁻¹ · q · padre) × locale`.
7. **Una superficie trasparente in più lascia sempre un bordo dove finisce.** Meglio
   dipingere la sfumatura nella texture di sotto.
8. **`setQuality` deve ricompilare i materiali anche della lobby.**
9. **Il toro di Three.js parte dall'asse +X**: senza offset sulla rotazione z gli archi
   finiscono davanti invece che dietro (`-Math.PI/2 - arco/2`).
10. **Il modello ha SOLO la texture di colore**: niente normal map, niente roughness map.
    Non è andata persa, non c'è mai stata.
11. **Attenzione alle regex con prefisso di commento opzionale e DOTALL**: una volta hanno
    mangiato due metodi interi (`faiAcque` e `faiCitta`), riscritti a mano. Vale doppio
    adesso che si lavora su un HTML da 15 MB con righe da milioni di caratteri: niente
    sostituzioni con regex larghe sul file intero.
12. **Le righe dei payload non si leggono**: un `cat`, un `sed -n` o un Read senza taglio
    su quelle righe riempie il contesto. Sempre `cut -c1-200`.
13. **Il nord dipende da chi parla.** Minimappa e bussola: alto = +z = nord, sinistra =
    +x. I commenti vecchi del codice (e la sezione 10.6 di questo documento) usano il
    contrario: "colline nord" = −z, "costa ovest" = −x. Il "nord-ovest vuoto" era il
    quadrante (−x, −z), in basso a destra sulla minimappa. Parlando con Lorenzo vale la
    minimappa.
14. **Oggetti fissi nel mondo che dovrebbero seguire la telecamera**: la cupola del cielo
    (raggio 430) stava al centro dell'isola e la telecamera taglia a 600. Dal bus il lato
    opposto era oltre il taglio. Ora segue la telecamera (nel ciclo, prima del render).
15. **Pannelli distruttibili: tutto quello che sta appoggiato a un pannello va DENTRO il
    pannello** (`this.panel = rec` intorno al `box()`), se no resta sospeso quando il
    pannello sparisce. Era successo al soffitto e al comignolo sotto il tetto.
16. **Collisioni affiancate**: due box che si toccano sullo stesso bordo, calcolati come
    centro ± metà, lasciano per arrotondamento una fessura di 1e-15 in cui un
    `supportHeight` cade. Le piastrelle dei pavimenti sono allargate di 5 mm.
17. **Python non c'è sul PC di Lorenzo** (solo l'alias del Microsoft Store). Node sì
    (v26). Script in Node o modifiche con Edit.
18. **`npm i` in una sottocartella senza `package.json` risale alla radice della repo** e
    aggiunge la dipendenza al `package.json` principale (successo con `tools/browser`).
    `playwright-core` sta in `node_modules/` della radice (ignorato da git); gli script di
    `tools/browser` lo trovano da li'. `tools/castello` ha il suo `package.json`.
19. **Le patch all'HTML con heredoc della shell si rompono** sulle virgolette di template
    del codice. Scrivere lo script di patch come file (Write) e lanciarlo con node; ogni
    sostituzione controlla che il testo cercato compaia una volta sola.
20. **Collisioni fatte di voxel: il controllo "sto in piedi qui" deve lasciare il gradino.**
    Una prova di spazio libero che parte dai piedi tocca il gradino successivo della scala e
    dice "bloccato": la testa libera va controllata da 0,75 m in su (il gradino massimo e' 0,7).
21. **I muri del castello sono CAVI** (due pareti a ~4,5 m con l'intercapedine) e la faccia
    esterna usa il materiale `flagstone`, lo stesso del selciato. Trattarlo come "pavimento"
    (non solido, non distruttibile) rendeva il muro attraversabile per ~2 m e non rompibile.
22. **Dividere una mesh in blocchi distruttibili: i triangoli grandi vanno TAGLIATI** sui piani
    dei blocchi. Assegnati per baricentro, una faccia di muro alta 8 m restava intera in un
    blocco solo. E le normali vanno calcolate prima di dividere, se no si vedono le cuciture.
23. **Commenti `//` dentro funzioni scritte su una riga sola** (`hedge`, `addRock`, ...): una
    patch che aggiunge `// v106` a meta' riga si mangia il resto della funzione. Usare `/* */`.
24. **Nel banco di prova Node gli attributi Int16 normalizzati** vengono da un altro "realm" e
    Three.js li rifiuta (`Invalid component type`). Il castello li converte in Float32 al caricamento.
25. **Prima di dire "non si entra" provare il percorso giusto**: la torre nord-ovest sembrava
    chiusa, invece erano le botti davanti a bloccare il mio percorso in diagonale. Camminare
    lungo l'asse della porta (le colonne di legno si ricavano dal modello).
26. **Riempimento delle cavita' a voxel: attenzione al fondo.** Una griglia che scende sotto il piano
    di calpestio lascia passare l'aria "da sotto" in ogni volume senza fondo (i muri del castello):
    il riempimento non scatta e nessun test se ne accorge (si cammina sopra e intorno). Visto solo
    con una sezione delle collisioni stampata a caratteri (`#`/`.`) a 25 cm.
27. **Campionare collisioni sottili a passo largo mente**: una sezione a 50 cm "vedeva" i muri del
    castello tratteggiati (pareti da 20 cm saltate fra un campione e l'altro). Passo <= meta' dello
    spessore, o si legge un buco che non c'e'.
28. **`hMin102` (quota piu' bassa) su un oggetto largo**: niente galleggiamento a valle, ma affonda a
    monte, e cio' che sta oltre il raggio controllato (le panche del fuoco a 2,4 m) resta sospeso.
    Per gli oggetti fissi meglio la piazzola (`piazzola107`).
29. **Una quota "di serie" pensata per un modello vecchio**: i cespugli stavano a terreno + 0,25 x scala, giusto
    per il cespuglio procedurale, sbagliato per il modello (base a y = 0): 17 cm per aria di mediana. Quando si
    cambia un modello, cercare chi ne usa la quota.
30. **Tappi del castello dai soli voxel interni**: la parete vera sta DENTRO il voxel di superficie, quindi fra
    tappo e parete restava una fessura fino a 20 cm. Ora partono anche dai voxel di superficie attaccati
    all'interno (v109).
31. **Apostrofi nei testi dentro stringhe JS con apici singoli** (testo d'aiuto del controller): un "l'arma"
    chiude la stringa e tutto il modulo non parte (SyntaxError = gioco nero). Il primo test che carica il
    modulo lo dice subito: lanciarne almeno uno dopo ogni testo aggiunto.
32. **Sulla porta 8123 puo' esserci gia' un server** lasciato da una sessione precedente (serve la repo, va
    bene): un secondo server sulla stessa porta muore con EADDRINUSE. Per confrontare con una versione
    vecchia usare un'altra porta.
33. **`renderer.info.render` con `autoReset` di serie si azzera DOPO il passaggio delle ombre**: i draw call e i
    triangoli "di una vista" fino alla v109 non contavano le ombre. Dalla v110 `info.autoReset = false` e si azzera
    a mano a ogni fotogramma (F3): in piazza ~2 M di triangoli con le ombre, dal bus ~5,8 M. Non confrontare i
    numeri vecchi coi nuovi.
34. **Il generatore del mondo (`wrand`) è condiviso da tutto ciò che nasce dopo**: le nuvole stanno in `makeSky`,
    prima di case e alberi. Una nuvola in più (5 chiamate a `wrand`) sposterebbe l'intera mappa. Nella v110 sono
    restate 16 con le stesse chiamate; il test `v110.cjs` blocca la mappa (1656 oggetti raccoglibili, 31 case).
35. **git estrae `index.html` in CRLF** (`core.autocrlf = true`) anche se nel repo è LF: le patch che cercano
    `'\nclass Game {\n'` non trovano niente dopo un `git checkout`. `tools/patch110/applica.cjs` normalizza a LF.
36. **Un cielo disegnato per primo calcola ogni pixel dello schermo** (anche quelli che poi le case coprono): ~1 ms
    a 1080p sulla UHD col cielo della v110. Ora `renderOrder = 1000` col test di profondità: solo i pixel visibili.
37. **Nei render target Three non applica tone mapping né sRGB**: col post-processing il passo finale li fa per
    tutti, anche per i materiali `toneMapped:false` (bagliori additivi), che quindi in Media/Alta vengono
    compressi dalla curva. In Bassa no.
38. **Cambiare Post o Ombre (F3, o la qualità) ricompila tutti i programmi**: uno scatto di qualche centinaio di ms
    subito dopo il clic, non è il costo dell'effetto. Misurare dopo qualche secondo.
39. **ACES desatura le luci forti**: la pelle in pieno sole a mezzogiorno arriva a 238 su 255 quasi grigia (albedo
    della texture già 0,70). Abbassare il sole cambia pochi punti (calcolato); è da fase 5 (pelle), non da luci.
40. **"Linee" sul castello: prima di dare la colpa alle ombre, guardarlo senza luci su fondo magenta**
    (`cuciture112.cjs`). Se le linee restano e non diventano magenta sono geometria, non buchi né ombre. Erano i tappi
    dei muri cavi (v107/v109): nascono dai voxel da 20 cm e sporgono dalla parete; col muro intero si vedevano di taglio.
41. **`RenderChunks78` stacca dalla scena i blocchi lontani**: una `scene.traverse` non li vede. Chi cambia materiali (o
    altro) su tutte le mesh deve passare anche da `world.chunks.cells[*].root` (lo fa `scambia112`).
42. **Uno shader di generazione unico con tutti i materiali e il materiale ricalcolato 13 volte per pixel = 23 s di
    caricamento** (compilazione D3D compresa). Un programma per materiale (`#define TIPO`) e l'altezza calcolata una volta
    in una texture HalfFloat: 1,6 s.
43. **Testo e patch passati alla shell dentro `node -e "..."`**: gli escape `\n` diventano a capo veri (la stringa JS si
    rompe, successo due volte con `applica.cjs`) e i backtick vengono ESEGUITI come comandi (successo scrivendo proprio
    questa trappola: sparivano i nomi fra backtick). Patch e documenti si scrivono con Write/Edit, come dice la 19.
    (Ripagata nella v116 con `node -e` e con un heredoc `<<'EOF'` dentro Bash: script di modifica SEMPRE come file.)
44. **Colyseus 0.18 / @colyseus/schema 5: i campi dello schema si dichiarano con `t.string()`, `t.float32()`, `t.map(X)`**
    dentro `schema({...})`. Le stringhe `'string'` delle versioni vecchie (e degli esempi in rete) fanno crollare il server all'avvio.
45. **Un campo dello schema mai scritto arriva al client `undefined`**, non 0: interpolato diventa NaN, e un NaN nella posa fa
    saltare l'IK delle braccia (`armOutside77`: `best` resta null, errore a ogni fotogramma). Il server riempie tutti i campi
    all'entrata e il client ripulisce con `n0()`.
46. **In rete i pacchetti si datano all'INVIO, non all'arrivo.** Via Internet arrivano a grappoli: datati all'arrivo, due finivano
    sullo stesso istante e con 150 ms di latenza simulata il salto visto dall'altro perdeva il 60% dell'altezza. Ogni stato
    porta `ts` (orologio del mittente); il client lo porta sul suo orologio con lo scarto minimo, il server misura i passi su `ts`
    ma col guinzaglio del suo orologio (niente tempo dichiarato in anticipo, niente tempo accumulato stando zitti).
47. **Alla riconnessione il client rimanda `inGioco = true`**: il server rimetteva il giocatore allo spawn e poi lo correggeva
    (2,5 m indietro). Lo spawn si rifà solo nel passaggio lobby → partita.
48. **L'annuncio `eliminato` arriva PRIMA della patch dello stato** (i messaggi partono subito, lo stato a ogni patch): per
    un attimo l'eliminato risulta "a terra ma vivo nello stato" e il codice della partita nuova lo ricreava in piedi. La
    partita nuova si riconosce solo dal passaggio morto → vivo visto nello stato (`r.vivoPrec`).
49. **All'avvio della partita il browser è fermo a compilare la grafica**: il primo pacchetto arriva in ritardo e tutti i
    seguenti sembrano "in anticipo" per il guinzaglio dell'orologio (correzione "orologio" a ogni client). Credito di 1 s
    che si ricarica a 0,1 s/s (`creditoMs`).
50. **Messaggi inviati in un test con `ts` inventati** (`performance.now() + 5000`): il guinzaglio dell'orologio li
    rifiuta (giustamente) e i test dopo falliscono a cascata. Nei test `ts` veri.
51. **Server lasciati accesi in background** (2567 Colyseus, 8123/8124 statici): per riavviare col codice nuovo va ucciso il
    processo sulla porta (`netstat -ano | grep :2567`, poi `taskkill //PID n //F`), se no il nuovo muore con EADDRINUSE.

---

## 9. Stato del gioco — battlecraft v93

### Cosa fa la v93 (dal suo LEGGIMI, scritto dall'altra chat)

**Accovacciamento nella partita normale**: passi bassi dedicati, appoggi nel mondo,
ginocchia orientate col bacino, rollio del bacino ridotto, torace che tiene la mira, piedi
riorientati dalla posa originale, correzioni in curva a velocità limitata (niente caviglie
che saltano), lunghezze degli arti mai toccate, controllo del soffitto, transizione in
piedi. Numeri: caviglia max da 20,25 cm (v92) a 15,78; incrocio dei piedi da 13,72 cm a 0.

**Prova grafica** (pulsante PROVA GRAFICA in lobby, `VisualLab93`): ambiente diagnostico
sulla mappa vera, separato dal combattimento.
- viste fisse: casa, pino, panorama
- **Mostra PRIMA / DOPO** sullo stesso punto del percorso
- percorso automatico di ~40,76 m trovato con A* evitando gli ostacoli
- accovacciamento attivabile
- **Salva immagine** (1280×720, col filtro colore) e **Salva misure** (FPS medi e
  fotogramma al 95° percentile, primi 3 secondi esclusi, 30 personaggi con movimenti
  ripetibili senza IA)
- il DOPO: sole più alto e meno arancione, luce diffusa azzurra, cielo e foschia
  coordinati, ombre allineate ai texel (`stableSun93`), ombre di contatto sotto i piedi,
  un pino con tre fasce di luce, tre cespugli con materiale opaco

**Il DOPO non è esteso alla partita normale**, per scelta: manca la verifica visiva.
Non fatti: rocce, transizioni del terreno, materiali delle armi, revisione della corsa.

### 9.1 Cosa cambia dalla v93 alla v98 (diff del codice, payload identici)

Il diff è piccolo: 35 righe. I 6 payload grossi (modello, clip, audio, prop) sono
identici byte per byte. Non c'è un LEGGIMI della v98: niente note su cosa è stato
verificato a occhio.

**Risoluzione di rendering** (codice col suffisso `94`): menu a tendina nel menu
principale e nella pausa — Automatica, Full HD, 1440p, 4K. Salvata in `localStorage`
(`battlecraft_resolution94`). Fuori da "Automatica" forza pixel ratio 1 e calcola il buffer
con `renderSize94`, limitato da `maxTextureSize`; sotto il menu scrive i pixel effettivi.
Note:
- su uno schermo 1080p, "4K" vuol dire disegnare 4 volte i pixel e poi rimpicciolire:
  supercampionamento, pesante. Su telefono o portatile debole può crollare
- fuori da "Automatica" salta anche il supercampionamento della lobby (`rapportoPixel`
  esce subito)
- ~~il `localStorage.setItem` nel cambio non ha il `try`~~ — corretto nella v103, insieme
  ad altre due scritture e a una lettura all'avvio che bloccava il gioco con lo storage
  chiuso

**Accovacciamento ritoccato** (`crouchPose93`, `applyMovement`):
- velocità da accovacciato da ×0,45 a **×0,28** (camminata ~0,73 m/s, corsa ~1,29 m/s)
- ciclo del passo più corto (avanzamento fase `/1,25` → `/0,8`), appoggio 0,58 → 0,60
- passo in avanti da 0,34 a 0,20 m; soglia di rilascio dell'appoggio da 0,65 a 0,34 m
- la posizione del bacino viene riportata a quella di riposo (`pRiposo`), così non eredita
  l'ondeggiamento della clip eretta
- **nuovo vincolo finale**: la caviglia viene tenuta sotto la sua anca, ±22 cm avanti e
  indietro, 10-20 cm di lato

Possibile scivolamento, **calcolato dal codice, non misurato**: un ciclo completo copre
0,8 m di spostamento del corpo, l'appoggio è il 60%, quindi il corpo avanza 0,48 m mentre
il piede dovrebbe restare fermo. Il piede atterra a +0,20 m e dovrebbe finire a −0,28, ma
il vincolo lo ferma a −0,22: negli ultimi ~6 cm di ogni appoggio il piede viene trascinato.
In più il vincolo è applicato DOPO il limite di velocità del piede (5 m/s), quindi in
teoria può spostarlo di colpo. **Misurato nella v103 (sezione 9.3): 6-8 cm trascinati a
ogni appoggio, corretto a 0.**

**Prova grafica nascosta**: `VisualLab93` ora si crea solo se l'indirizzo contiene
`?visualtest`. Per usarla: aggiungere `?visualtest` in fondo all'indirizzo nel browser
(es. `.../battlecraft-v98.html?visualtest`).

### 9.2 Cosa cambia dalla v99 alla v102 (fatte in questa chat, tutte con test)

**v99 — suoni del lancio** (`DropAudio99`, livelli in `DROPSND99`): motore del bus in loop
(dentro ovattato, poi si allontana col bus), vento che sale con la velocita' di caduta e
cala sotto il deltaplano, strappo + tela all'apertura, colpo all'atterraggio; anche i bot
vicini, spazializzati, al massimo uno ogni 0,5 s. Loop senza cucitura (periodici con
margine, `loopStart`/`loopEnd`), livellati a -18 LUFS, volumi 0,30-0,42 contro 0,85 degli
spari. I sorgenti preparati sono in `assets/audio/`. Ascolto non verificato.

**v100 — mira assistita** (`AimAssist99`, regolazioni in `AIM99`): telefono = auto-mira
quando spari con un nemico entro ~8 gradi + rallentamento + attrazione verso il petto;
controller = solo rallentamento e attrazione leggera mentre spari o tieni LT; mouse =
niente. Mai attraverso i muri, mai oltre la portata dell'arma. Tolto lo sprite arancione
del sole (resta la luce e l'alone caldo nel cielo).

**v101 — niente zoom su Safari iPhone**: viewport senza zoom, `touch-action`, blocco di
pizzico e doppio tocco su gioco e comandi, campo nome a 16 px. Non provato su iPhone vero.

**v102**:
- **piazzole sotto le case** (`PADS102`, `terrainHeight` = naturale + piazzole): prima in
  19 case su 33 il terreno entrava sopra il pavimento (fino a 1,32 m). Parte piana = casa
  + 1,2 m + portico dal lato porta, sfumatura 6 m, fra case vicine l'altezza passa pesata
  sulla distanza. La mesh del terreno si rifa' dopo le case (`rifaiTerreno102`). Prezzo:
  piccoli terrazzamenti in collina (punti oltre 40 gradi vicino alle case da 1,0% a 1,6%;
  il personaggio cammina su qualsiasi pendenza del terreno)
- **auto mai davanti alle porte** (`liberaPorte102`): erano tutte e tre davanti a una porta
- **oggetti appoggiati sui pendii** (`hMin102`): casse (anche quella in cima, che prima
  galleggiava nel vuoto), pozzi, cataste, orti, fuochi, cassonetti, bancarelle, panchine
- **tolti perche' abbozzati**: bunker (sotto terra, irraggiungibile), tende a piramide,
  carro del fieno (palla rosa), cartello bianco senza scritta, alberi cilindro+sfere
  (prato comune, isolotto, albero gigante con porticina), poltrona di due scatole.
  Tenuti: meteorite, "22" coi sassi, pietre in equilibrio
- **bot**: atterraggi a campionamento del punto piu' lontano (minimo 34-37 m), ogni bot
  salta quando il bus e' piu' vicino alla sua meta; tregua fra bot 40-65 s dopo
  l'atterraggio (`tregua102`), che salta se vengono colpiti o se sono scesi a meno di 28 m.
  Partita simulata: distanza mediana fra bot all'atterraggio da 14 a 38 m, primi morti da
  24 s a 42-52 s
- **schermata di caricamento** fra Gioca e la partita (`avvia102`): mouse agganciato subito,
  partita creata e shader compilati dietro la schermata, bus fermo finche' non si vede

Interpretazione da confermare con Lorenzo: "pavimenti bloccati" letto come terreno dentro
le case. **Confermato il 21/11: intendeva che non si possono rompere** → fatto nella v103.

### 9.3 Cosa cambia nella v103 (tutto con test, e visto nei render)

- **Pavimenti distruttibili** (`floorTiles103`): piano terra e solai divisi in piastrelle
  di circa una cella (4 m), ognuna un pannello di legno da 150 come le campate dei muri;
  il solaio lascia il buco della scala. Lo zoccolo di pietra sotto i muri resta fisso.
  Il piano terra prima era pietra + assi complanari a +0,30 (z-fighting): ora un blocco
  solo. Gli oggetti a terra ricadono quando si rompe la piastrella sotto
  (`settle103` → `Items.update`). 155 piastrelle sulla mappa standard.
- **Tetto rotto = soffitto e comignolo spariscono con lui** (prima restavano sospesi).
- **Villaggio dei pescatori** (`faiVillaggio103`, strada `VIA103` aggiunta ai `PATHS`):
  sulla lingua di terra bassa fra la laguna e il mare, in basso a destra sulla minimappa.
  6 case colorate ai lati della via (una a due piani), 3 pontili **calpestabili** (2 sulla
  laguna, 1 sul mare; partono dalla riva vera e finiscono in ≥0,8 m d'acqua), barche
  ormeggiate, reti stese, botti, casse, lampioni, e il **faro** a fasce bianche e rosse
  sulla costa del mare (collisione, bottino alla base). Generatore casuale proprio (`r103`)
  per non rimescolare il resto. Bottino in punta ai pontili.
  Visto nei render: si legge bene; la rete stesa è il pezzo più debole (sembra un graticcio).
- **Cielo tagliato dietro il bus**: trapezio scuro enorme dietro il bus all'inizio del
  lancio. Era lo sfondo della pagina, visibile dove la cupola del cielo (ferma al centro,
  raggio 430) superava il taglio della telecamera (600). Ora la cupola segue la telecamera.
- **Espulsione dal bus prima di lasciare l'isola** (`eject103`): chi non saltava veniva
  buttato a fine rotta, a 180 m dal centro, sopra il mare. Ora quando il bus, uscendo,
  passa a 110 m. Provato: atterraggio a 113 m, sulla terra.
- **Dissolvenza del caricamento**: partiva prima del primo aggiornamento della telecamera,
  e per 350 ms si intravedeva la telecamera sotto una casa. Ora aspetta due fotogrammi.
- **Accovacciato, piedi che scivolano**: misurati 6-8 cm trascinati a ogni appoggio
  (flag d'appoggio del codice), 13-15 cm con la soglia dei 2 cm. Causa: ciclo da 0,8 m con
  appoggio al 60% = 0,48 m di corpo col piede fermo, ma il vincolo caviglia-anca ne
  concede 0,44. Ciclo portato a 0,66 m: 0,0 cm col flag, 0,7-2,2 cm con la soglia (in
  piedi: 1,4). Il piede si stacca un po' più in fretta (arco `sin^0,7`). Da guardare
  giocando: i passi da accovacciati sono più fitti.
- `localStorage` protetto ovunque (`lsGet103`).
- Test nuovi: `pavimenti.cjs`, `villaggio.cjs` (due semi), `scivolamento.cjs check`.

Strumenti che hanno mentito in questa sessione (aggiunti alla lista della sezione 4):
- `accovacciamento.cjs` muove il personaggio accovacciato a 1,8 m/s, una velocità che
  accovacciati non esiste (0,73 e 1,29): non poteva vedere lo scivolamento
- campionare un pontile a passo fisso: trova "buchi" nelle fughe di 8 cm fra le assi, che
  sono volute e che la capsula scavalca
- la "velocità massima del piede in appoggio" dà più del 100% anche in piedi, perché conta
  i fotogrammi di contatto e stacco: tolta
- il villaggio controllato solo coi numeri: i pontili risultavano "in acqua", il render
  ha mostrato che il primo stava mezzo sulla spiaggia

### 9.4 Cosa cambia nella v104

- **Musica della lobby all'apertura** (`provaMusica103`, chiamata quando sparisce la
  schermata di caricamento). I browser vietano l'audio prima di un gesto (Safari sempre,
  Chrome per i siti nuovi): dove è vietato parte al primo tocco/clic/tasto ovunque. Due
  correzioni lungo la strada: il controllo "sta già suonando" era su `_musOn`, che diventa
  vero anche quando `play()` viene rifiutato (dopo il tentativo all'apertura i gesti non
  l'avrebbero più fatta partire); su iPhone il gesto che sblocca l'audio è
  `touchend`/`click`, non `pointerdown`, quindi aggiunti.
  Provato con un blocco simulato in Edge: rifiutata all'apertura, suona dopo un clic.
  ATTENZIONE strumento: Playwright esegue i suoi comandi come gesto dell'utente
  (`userActivation.hasBeenActive` diventa vero da solo), e l'Edge headless lascia partire
  l'audio comunque: per simulare il blocco serve un flag che diventa vero solo con eventi
  `isTrusted`.
- **Icona con Amy**: ritratto renderizzato nella lobby vera (luci della lobby), ritagliato
  a 64 px (scheda, solo il viso) e 180 px (Home di iPhone, testa e spalle), dentro l'HTML
  come PNG in base64 nelle righe 7-8 (righe lunghe ~13k e ~77k caratteri: tagliare con
  `cut`). Sostituisce il triangolo giallo SVG.
- **Home di iPhone**: `apple-mobile-web-app-capable` (si apre a tutto schermo senza le
  barre di Safari), titolo "Battlecraft", barra di stato nera piena (non trasparente:
  niente sotto l'orologio), `theme-color`. NON provato su un iPhone vero, in particolare
  che iOS accetti l'icona come data URI (dovrebbe; se mostra uno screenshot invece di
  Amy, serve un file `apple-touch-icon.png` accanto alla pagina).
  Da sapere: aperto dalla Home, il gioco ha un suo spazio dati separato da Safari
  (nome, statistiche e impostazioni ripartono da zero la prima volta), e la musica
  aspetta comunque il primo tocco.
- **Niente più sottotitolo «Ultimo in piedi»** (dopo la v104, senza cambio di versione):
  tolto dal `<title>`, dal logo del menu (il `<small>` sotto BATTLECRAFT) e dal README.
  Anche i due testi di gioco che usavano la frase ora dicono «ultimo sopravvissuto»:
  l'avviso a inizio partita e la schermata di vittoria. Solo testo, test non rilanciati.

### 9.5 Cosa cambia nella v105

Richiesta di Lorenzo, testuale: «ho aggiunto un castello nella cartella nel desktop vorrei
che lo aggiungi alla mappa in maniera coerente col resto. quando miri da telefono o anche in
generale la sensibilità è troppo bassa. voglio che da telefono raccogli gli oggetti
toccandoli ed elimini il +. vorrei che il joystick per camminare a sinistra anche se tocco
un poco piu sopra comunque capisce e si sposta».

**Il castello** (`faiCastello105`, posizione e piazzola in `CASTELLO105_POS`):
- il modello (`assets/castello/castello_cartoon_v3_obj.zip`, firmato @22lordd, stendardi «22»)
  è un diorama: isoletta volante con prato, roccia sotto (fino a -29 m), pini, staccionate.
  Nel gioco resta **solo il castello**: mura, 4 torri coi tetti blu, mastio a graticcio,
  porta con ballatoio, cortile lastricato, scale ai camminamenti, bancarelle, pozzo, casse
- conversione con `tools/castello/costruisci.cjs` (README accanto): 300k triangoli dopo il
  filtro → **128k** con meshoptimizer, texture a 512/256 px senza normal map, colori di AO
  per vertice tenuti. Scala **0,8** (mura 46 m, porta ~3,6 m). Ruotato di 180°: la porta
  guarda -z. Dentro l'HTML: 2,9 MB di base64 (il file passa da 17,0 a ~19,9 MB)
- posto: **la cresta est** (in alto a sinistra sulla minimappa), l'unica zona grande libera
  da case, laghi e città (cercata con un programma, non a occhio). Piazzola piana a quota
  24 che sfuma in 14 m: rocca in cima al crinale, fianchi ripidi. Il sentiero della cresta
  ora prosegue fino alla porta. Segno sulla minimappa (`segnaCastello105`)
- **collisioni**: scatole ricavate dai voxel del modello (0,35 m in pianta, 0,15 in
  altezza: i piedi stanno al massimo 15 cm sopra la superficie vera), riempite dove chiuse,
  fuse. 8.523 scatole, metà sono le torri tonde (a gradini nella griglia). Il costo
  misurato dei raggi non cambia (lo domina il terreno). Indistruttibile
- un `blocker` toglie case, alberi, cespugli e massi dall'area (prima c'erano massi nel
  cortile e due case addosso alle mura, perché il sentiero nuovo spostava le casupole);
  `nearHouse92` include il castello, quindi i bot non ci atterrano dentro
- **bottino**: 5 oggetti nel cortile, 4 sui camminamenti a 6,6 m, scelti a griglia dove si
  sta in piedi; tutti raggiungibili a piedi (verificato con una ricerca sulla griglia)
- visto nei render: dalla città si legge la sagoma con le torri sulla cresta; lo stile
  (pietre dipinte, tetti blu e rossi) sta bene col resto. Non visto: com'è giocarci dentro
- test nuovo `castello.cjs` (semi 90210 e 999)

**Comandi del telefono** (`TOUCH105`, tutte le regolazioni lì):
- **sensibilità**: trascinare per guardare moltiplicava i pixel per 1,5 → ora **3** (un giro
  completo da ~1900 a ~950 px di dito; misurato 76° per 200 px). In mira al telefono la
  sensibilità scende a ×0,8 (era ×0,55), col mirino a ×0,45 (era ×0,25); il rallentamento
  della mira assistita sopra un nemico da 0,55 a 0,72. Il cursore nelle impostazioni ora si
  chiama «Sensibilità visuale», arriva a 3 ed è **salvato** (prima ripartiva da 1 a ogni
  apertura). Il mouse è invariato salvo il cursore
- **raccogliere toccando l'oggetto**: tocco breve (<320 ms, <14 px) ovunque sullo schermo;
  si prende l'oggetto il cui punto sullo schermo è entro 70 px dal dito, fino a 3,4 m (il
  tasto X arriva a 2,6); se è più lontano, «Avvicinati per raccoglierlo». Tolto il pulsante
  «Raccogli» (quello con il **+**). Il suggerimento dice «Tocca per raccogliere: …»
- **joystick mobile**: tutta la parte sinistra dello schermo (42%, sotto la fila di pulsanti
  in alto) fa da joystick; il cerchio nasce dove appoggi il pollice e, se il dito esce dal
  bordo, il centro lo segue
- provato con `tools/browser/touch.cjs` (Edge, tocco emulato 844×390): joystick nato a
  (170,120), avanti pieno, 5,5 m percorsi; oggetto raccolto col tocco. **Non provato su un
  telefono vero.** Da chiedere a Lorenzo: se il «+» era davvero il pulsante Raccogli (l'ho
  letto così) e se la sensibilità ora va bene

### 9.6 Cosa cambia nella v106

Richiesta di Lorenzo, testuale: «il castello è troppo in alto e su una collina innaturale. certi
oggetti si possono trapassare e non dovrebbe essere così. ci sono ancora lampioni che collidono
con le macchine e non va bene. sassi nelle case. risolvi tutti i problemi di questo tipo. in screen
in quella posizioni di strutture non posso mettere una struttura in mezzo come il pavimento vorrei
risolvere questa cosa. il piccone non fa danni. posso rompere le mura del castello come su [il riferimento]
o come le case che già ci sono. nelle torri non posso entrare». Screenshot: `screen/` (due muri
paralleli, rampa in mezzo, giocatore sulla rampa).

**Castello: posizione.** Stava a quota 24 su una piazzola che sfumava in 14 m: altopiano piatto con
pareti a strapiombo (fino a 14 m sul lato del mare, visto nel render dall'alto). Ora
`CASTELLO105_POS = {x:108, z:40, y:14}` (6 m piu' a ovest, lontano dalla spiaggia) e la collina la
fa `terrainHeightNat102` (punto 3): il terreno sfuma verso la quota del castello in `COLLE106` = 38 m
dal bordo delle mura, la cresta piu' alta scende a sella. La piazzola resta (blend 6) solo per il
cortile piano.

**Castello: torri.** Le porte ci sono nel modello (cortile e camminamento), ma coi voxel da 35 cm
le collisioni a gradini lasciavano ~60 cm liberi sulla diagonale, il personaggio e' largo 76. Voxel
a **20 cm** (prova a 15: nessun guadagno, piu' scatole). In piu' `costruisci.cjs` ricava dal modello
le due colonne di legno di ogni porta e svuota il prisma fra di esse (nel modello e' vuoto,
verificato). Test: si cammina lungo l'asse di tutte e 4 le porte.

**Castello distruttibile.** `costruisci.cjs` divide il modello in blocchi da 4 m (origine -26 in
pianta, fasce da 4 m sopra 30 cm): i triangoli si tagliano sui piani dei blocchi, i vertici di ogni
blocco sono contigui in ogni mesh, le scatole di collisione non escono dal blocco. Nel gioco ogni
blocco e' un pannello di pietra da `CASTELLO106_HP` = 150 (6 colpi di piccone), stesso meccanismo
delle case (`removeHarvestable` azzera i vertici e toglie le scatole, `restoreHarvestables` al
riavvio). Sotto 30 cm resta fisso (zoccolo, come le case). Le mura sono spesse: per aprire un varco
servono **due blocchi** (parete esterna e interna), visto nel render. Materiali a due facce, se no
nel taglio si vedrebbe attraverso. Niente crollo di cio' che sta sopra (come le case della mappa).
Numeri: 362 blocchi, 22.778 scatole (erano 8.523), triangoli 128k -> ~197k per il taglio. Il GLB
ha posizioni e uv a 16 bit e normali a 8 (base64 4,6 MB, era 2,9). Costo misurato in Node: un raggio
da 90 m attraverso il castello 2,3 ms contro 1,8 (lo domina il terreno), moveCharacter 51 us contro 45.

**Sovrapposizioni** (test nuovo `sovrapposizioni.cjs`, tre semi, confronta le scatole di
collisione dopo `World.build`; i massi allargati alla misura vista). Trovati sul seme standard:
lampione dentro un'auto (48,24), massi dell'accampamento dentro due casupole (78,91), panchine della
piazza dentro due case della via (l'anello da 17 m le attraversa), siepe dentro il gazebo, auto sulle
casse di una bancarella, masso su un lampione, alberi dentro le rocce. Ora tutti controllano prima
di piazzarsi (`occupato106`): lampioni (si spostano fino a 3 m o saltano), panchine (si avvicinano al
centro), auto (`liberaPorte102`: se non c'e' posto l'auto non c'e'; seme 123456: un'auto in meno),
siepi, massi di rifugio e accampamento, piante e massi sparsi. Le casse dell'accampamento spostate.

**Oggetti che si attraversavano** (tutti `collide:false`): bancarelle (pali, bancone), catasta di
legna (fermava solo la fila di sotto, alta 60 cm: ci si saliva e si passava dentro il resto), molo del
Lago Grande (tavole e passerella: ora si cammina, come i pontili), barche (una scatola sull'impronta,
ci si sale), rete stesa (sei scatole sottili), facce esterne dei muri del castello (trappola 21).

**Piccone sui personaggi.** Il raggio del piccone ignorava i personaggi: zero danni a bot e
giocatori. Ora `PICCONE106`: 20 a colpo (30 in testa), portata 3 m (contro strutture resta 4,2).

**Pavimento sopra la testa** (lo screenshot). Pavimento e tetto andavano sempre nella cella
DAVANTI: fra due muri, sopra una rampa, non c'era modo di chiudere in mezzo. Ora mirando in alto
(`BUILDCFG.suTesta106` = 0,45) vanno nella propria cella al primo livello sopra la testa. Test con
due muri, rampa in mezzo, giocatore sulla rampa: pavimento messo in cima ai muri.

Test nuovi: `sovrapposizioni.cjs` (3 semi), `piccone-costruzioni.cjs`; `castello.cjs` controlla
anche torri e blocchi. Visto nei render: collina, torri, varco nel muro, molo. **Non visto giocando**:
la sensazione del piccone sui bot, la mira "in alto" per il pavimento (soglia 0,45 da tarare con lui).

### 9.7 Cosa cambia nella v107

Richiesta di Lorenzo, testuale: «ti ho messo in screen tutta la roba che non mi piace. tipo quel pozzo
fatto malissimo e con le mura al contrario e quadratissimo. il fatto che spacco un muro del castello e
ci posso entrare dentro e non dovrebbe essere così. oggetti per la mappa che collidono con terreno in
pendenza. quando prova a fare un "novanta" con le build. quando provo a mettere il pavimento non mi fa
mettere il pavimento sulla scala. poi da mobile. quando sono nella mode solo armi non ci deve essere il
tasto per editare le mura. non ci deve essere nemmeno il tasto per cambiare le armi tanto basta che le
clicco. se clicco sulla scritta dell arma non sempre me la prende. voglio il tasto per saltare più
grande. e che se sto muovendo la visuale e finisco sui quei tasti non è che il movimento che stavo
facendo si blocca. sia se clicco dall inizio che da dopo». Screenshot in `screen/` (24-25/11).

**Pozzo rifatto** (`pozzo`): erano 10 scatole con `rotY: a`, che gira l'asse lungo nel verso
sbagliato (non tangente: denti storti), sotto un tetto piatto. Ora anello vero (cilindro esterno +
interno con facce girate), bordo sporgente, acqua scura (`M.wellWater107`), pali, tettuccio a due
falde, argano, corda, secchio. Collisione a croce di tre scatole. Visto nel render: si legge.
In citta' pozzo e bancarelle erano incastrati contro le case della via (visto dall'alto): ora cercano
un posto libero (`liberoVicino107`).

**Oggetti sui pendii** (`piazzola107`): pozzo, catasta, orto, fuoco spento, bancarelle e cassonetti
spianano una piazzola sotto di se' (quota media dell'impronta, sfumatura 3,5 m) in `PADS102`, come le
case; la mesh del terreno si rifa' dopo (`rifaiTerreno102`, gia' cosi'). Prima `hMin102`: le panche
del fuoco spento (a 2,4 m dal centro, fuori dal raggio controllato) restavano sospese, l'orto affondava a
monte (lo screenshot). Le impronte stanno in `World.oggetti107` e `occupato106` le conta: un masso era
finito sopra una panca (gli oggetti senza collisione non risultavano occupati).

**Muri del castello pieni.** Misurato con una sezione delle collisioni a caratteri: il muro +x a z+5 ha
la parete esterna a ~18,75 dal centro e l'interna a ~16,4, e in mezzo **2 m d'aria anche nelle
collisioni**. Il riempimento delle cavita' di `costruisci.cjs` perdeva da sotto (trappola 26). Corretto
nel convertitore, piu' i **tappi** di pietra sui confini dei blocchi (dettagli in
`tools/castello/README.md`). Visto nel render: rotta la parete esterna dietro c'e' pietra; rotte
tutte e due, un varco pulito coi fianchi di pietra. Il commento "-26: i muri stanno in un blocco solo"
era falso (il confine a 18 taglia il muro): corretto.

**Costruzioni.**
- Pavimento guardando in basso: livello dai piedi (`floor((piedi + 2,6) / 4)`), cioe' in cima alla rampa
  oltre un terzo della salita. Prima petto - 5 m di mira = base della rampa, dove c'era gia' il pavimento:
  «Già occupato» (lo screenshot 133104).
- Posto occupato = un livello sopra (`baseKey` ricorda il posto originale: tenendo premuto non si impila).
- Chi costruisce non blocca se stesso: pavimento o rampa che gli passano fra le gambe (fino a 1,3 m
  sopra i piedi) vengono messi e lo sollevano sopra.
- "Novanta" (in cima alla rampa, girati di 90 gradi, in salto: muro + pavimento + rampa): nella v106 il
  pavimento finiva sulla base occupata. Ora passano tutti e tre (test). **Interpretazione mia**: la frase
  di Lorenzo e' tronca; da chiedergli se il novanta che intende e' questo e come si sente giocando.

**Telefono.**
- Modifica solo in costruzione (la regola CSS lo mostrava sempre), tolto «Arma ›».
- Salto 76 px (era 48), Costruisci spostato per fargli posto (anche in verticale).
- Barra delle armi: caselle 52 px (erano 44) e un tocco fuori dalla casella (sulla scritta, fra due) prende
  la casella piu' vicina; trascinando dalla barra si gira la visuale.
- Visuale: ogni tasto trascinato (non solo Spara) gira la visuale, dopo 9 px. Movimenti e rilascio
  ascoltati sulla finestra; il gesto non finisce piu' su `lostpointercapture`. **Attenzione**: in Edge
  emulato la visuale non si fermava passando sopra i tasti nemmeno nella v106; la causa sul telefono
  vero e' una mia ipotesi (perdita della cattura del puntatore). Da far provare a Lorenzo.
- Provato con `tools/browser/touch107.cjs` e `touch.cjs` (joystick e raccolta invariati).

**Sistema dei colpi** (seconda richiesta della sessione: un prompt generico su hitbox, tunneling,
danno, feedback). Detto a Lorenzo: le armi sono **hitscan**, il tunneling qui non esiste; il colpo a se
stessi era gia' escluso (`ignore: ch`). Fatto:
- **zone**: `characterHit86` riscritta, 9 capsule sulle ossa in 5 zone (head, chest, stomach, arm, leg).
  Fase larga con una sfera di 1,25 m: chi e' lontano dal raggio non tocca lo scheletro. Zero allocazioni
  (la v106 creava ~40 oggetti per personaggio per raggio). Misurato nello stesso banco: **51 us contro
  1.080 us** per raggio sui 29 personaggi, stessi colpi trovati (20 su 20)
- **dati per arma** in `WEAPONS`: `zone` (moltiplicatori), `falloffMin`, `perfora` (quota che salta lo
  scudo, ora 0 ovunque), `spinta` (pompa 0,35 per pallino, precisione 2,2 m/s). `head` resta = zone.head
- **`dannoArma107`**: base x zona x calo con la distanza x difficolta' (bot -> giocatore)
- **`ColpoInfo107`** (un oggetto riusato in `Combat.colpo107`): attaccante, vittima, arma, zona, punto,
  normale, direzione, distanza, danno, danno allo scudo / alla vita, scudo rotto, uccisione, materiale.
  `takeDamage` ci scrive la divisione del danno. **`EsitoSparo107`** riassume i pallini di uno sparo:
  hitmarker `kill` > `head` > `shield` (nuovo, azzurro) > normale, una volta per sparo
- audio: `impatto107` (legno, pietra, metallo, terra; piu' piano con la distanza, muto oltre 29 m) e
  `scudoRotto107`. Non ascoltati
- niente ragdoll: alla morte resta la caduta procedurale che c'era
- **bilanciamento cambiato**: braccia e gambe ora fanno meno (fucile 0,8 = 18 invece di 23). Da far
  provare a Lorenzo
- test `colpi107.cjs`. Strumento che ha mentito: il bot appena creato puo' essere raccolto (seduto sui
  talloni, posa del bus): sparando da dietro alla gamba il busto la copre e il raggio prende "chest", che e'
  giusto. Il test spara a ogni parte dal lato da cui sporge
- `VisualLab93.setup` (prova grafica) provava una sola coppia casa/pino e si arrendeva se li' la pendenza
  bloccava il percorso: cambiando dove nascono gli alberi falliva `integrazione.cjs`. Ora prova fino a 12
  coppie. Una volta `integrazione` e' fallita anche su "tutti i bot saltano entro 24 s" e poi non piu':
  sembra casuale, non indagato
- piazzole: dove quella di un oggetto tocca quella di una casa vince la casa e l'oggetto ne prende la quota
  (`mondo 999` trovava una casa sospesa)

Test nuovo: `v107.cjs` (pozzi, piazzole, muro pieno e varco, pavimento sulla rampa, novanta, pavimento
fra le gambe). Non visto giocando: i novanta, il telefono vero.

### 9.8 Cosa cambia nella v108

Richiesta di Lorenzo, testuale: «ho messo il deltaplano nella cartella che deve essere implementato. ogni
volta che mi butto da un altezza un po alta posso attivarlo. fuori dal castello sono rimasti dei residui
volanti tagliati che devono essere tolti. il deltaplano deve avere un animazione di sventolamento
realistico. anche il bus non deve volare completamente dritto. cioè si. la traiettoria è quella. ma deve
cmq avere un animazione di sospensione irregolare nell aria».

**Il deltaplano di Lorenzo** (`Deltaplano-Laguna.glb` nella radice della repo: Blender, 56.800 triangoli,
65 oggetti, 7 materiali a tinta unita, niente texture, niente animazioni). Convertito da
`tools/deltaplano/costruisci.cjs` (README accanto) in `DELTAPLANO108_B64` (260 KB): trasformazioni dei
nodi applicate, semplificato per oggetto con meshoptimizer (vela al 55% perche' lo shader ha bisogno di
vertici, sfere/cuciture/bordi al 14-22%), unito per materiale: **17.600 triangoli**, 7 mesh. Nel modello
+z e' il muso, le manopole stanno a x = +-0,35, y = 0. In gioco `makeGlider88` clona il modello
(geometria condivisa, `disposeGlider108` non la butta) con materiali propri; se il modello manca resta il
triangolo procedurale di prima.
- **sventolamento** (`VELA108`, `velaShader108`): nel vertex shader, onde che corrono dal bordo d'attacco
  al bordo d'uscita, nulle davanti e massime dietro e verso le punte, piu' un fremito veloce nei pannelli
  che si annulla sulle cuciture (|x| = 0,29 / 0,85 / 1,41 / 1,97, come le stecche di una vela vera).
  Normali corrette con la derivata, il telaio sotto y = 0,55 resta rigido. Intensita' per deltaplano:
  cresce con la velocita' e in virata, forte durante l'apertura. Ampiezza `VELA108.ampiezza` = 0,11 m.
  Un solo programma per tutti (`customProgramCacheKey`). L'ombra non sventola (MeshDepthMaterial)
- **apertura**: la vela si allarga di lato con un piccolo rimbalzo (easeOutBack) mentre sbatte
- **turbolenza**: pilota e deltaplano beccheggiano, rollano e sobbalzano insieme (somme di seni)
- **presa**: il deltaplano sta 0,44 m sopra le spalle, le mani vanno con l'IK sulle due manopole
- visto nei render (dietro, di lato, davanti): orientamento giusto, il pilota appeso sotto la barra.
  Lo sventolamento si vede confrontando due fotogrammi, ma **in movimento non l'ho visto**: da far giudicare
  a Lorenzo (se poco/troppo: `VELA108.ampiezza`)

**Deltaplano cadendo da in alto** (`Drop88.puoAprire108` / `riapri108`): in partita, se si sta cadendo
(vel.y < -1, non salendo) con almeno `VELA108.quota` = **6 m** di vuoto sotto i piedi, compare
«Spazio · APRI DELTAPLANO» (stesso riquadro del lancio, anche tocco/controller) e il tasto del salto lo
apre. Da li' e' la planata del lancio (`air88` con `redeploy108`): 10 m/s avanti, discesa a 4,7 m/s,
atterraggio uguale, senza il messaggio «Atterraggio completato». Esce dalla costruzione/modifica. Niente
nebbia e dettaglio "da lancio" (solo nel lancio vero) e la telecamera scivola nella posizione da planata
invece di saltarci. Suono di apertura anche qui. Non si richiude (non richiesto; si potrebbe aggiungere).
I bot non lo usano. Soglia dei 6 m: **scelta mia**, da tarare con lui.

**Bus**: la rotta resta la retta, ma sopra ci sono quota (+-0,9 m), scarto laterale (+-0,5 m), rollio
(~3°), beccheggio (~2°) e un filo d'imbardata, ognuno somma di 2-3 seni a frequenze non multiple con una
fase casuale per partita. Prima: un seno solo di 30 cm. Il bus e' lungo sull'asse x locale (rotation.x =
rollio). Misurato nel test: picchi di quota a intervalli diversi, scarto massimo 0,5 m.

**Residui attorno al castello**: erano pali e traverse della staccionata dell'isoletta del modello,
tagliati dal quadrato `DENTRO` del convertitore: un palo con due traverse mozzate davanti alla porta e un
palo sotto la torre di sud-ovest (trovati cercando le componenti connesse della mesh fuori dalle mura,
poi visti nei render). `costruisci.cjs` ora toglie le componenti piccole (<1,5 m), sotto 1 m e a piu' di
22,5 m dal centro (4 pezzi, 316 triangoli). L'edera sul muro est (19 triangoli a 23,3 m, ma a 3,7 m
d'altezza) e le pietre/finestre delle torri restano. Castello rigenerato: 348 blocchi, 18.446 scatole.

Test nuovo `v108.cjs` (modello, apertura in partita: non a terra / non a 3 m / non salendo / si' a 20 m,
discesa e atterraggio, nebbia; bus; niente pezzi fuori dalle mura). Il banco di prova ora carica anche
il deltaplano (`harness.cjs`).

Strumento che ha mentito: la prima soglia per i pezzi tagliati era "sotto 50 cm" e diceva "tolti"; il
test che guarda i vertici (non le componenti) ha trovato la traversa alta, che parte da 62 cm.

### 9.9 Cosa cambia nella v109

Prima richiesta: un prompt generico scritto per Unity/Unreal (IPickupable, Audio Mixer, Sound Class) su
raccolta di cure/munizioni/armi, scambio a slot pieni con lancio dell'arma, volume degli spari -25/35% con
variazione di tono 0,95-1,05, bus audio delle armi. Detto a Lorenzo: metà c'era già (`Items`, cure bloccate a
vita piena) e con 3 caselle fisse una per tipo lo scambio non poteva mai succedere. Sua risposta, testuale:
«aggiungi man mano gli oggetti all inventario puoi anche dropparla ri raccoglierli. se ho un arma scarica e
raccolgo quella piena ho 2 fucili d assalto nell inventario quello scarico e quello pieno. se con un arma in
mano e l inventario pieno prendo un arma me la sostituisce. posso accumulare sempre più proiettili».
Seconda richiesta (durante il lavoro): «quando rompo il muro del castello c'è ancora una fessura che mi fa
vedere dentro al muro. i cespugli fluttuano leggermente» (screenshot `screen/` 25/11 16:48).

**Inventario a caselle** (`INV109`, 5 caselle): `ch.inv[k] = { w, mag }` o null, `ch.slot` = casella scelta
(può essere vuota), `ch.weapon` resta il tipo in mano (tutto il codice che lo legge non è cambiato). Spariti
`ch.weapons` e `ch.mag`: il caricatore si legge da `ch.cur109().mag`. Metodi: `giveWeapon(w, riserva, mag, casella)`
(torna la casella o -1), `svuota109`, `selectSlot109`, `selectWeapon(tipo)` (per bot e test: quella in mano o la
più carica), `liberi109`, `magDi109`.
- doppioni: ogni arma ha il suo caricatore; si spara e si ricarica solo quella in mano
- raccogliere va nella casella scelta se è vuota, se no nella prima libera
- pieno + arma in mano = **scambio**: la vecchia cade davanti col suo caricatore; pieno col piccone = non si
  prende («Inventario pieno: prendi in mano l'arma da scambiare»). Il suggerimento dice «Scambia: … (lasci …)»
- **butta l'arma**: tasto **H** (azione `drop`, rimappabile), D-pad ← fuori dalla costruzione, al telefono
  **dito fermo 0,45 s su una casella** della barra (`tienePremuto109`). Un'arma buttata porta solo il suo
  caricatore, niente munizioni di riserva (se no buttare e riprendere le moltiplicherebbe)
- **munizioni senza tetto** (prima 999). I materiali restano a 999
- alla morte cade tutto: ogni arma col suo caricatore + una scatola per tipo con tutta la riserva (prima: solo
  l'arma in mano con 60 + 30 munizioni regalate)
- tasti 1-5, rotella e barra (5 caselle + piccone, 52 px al telefono, la barra è larga 332 px su 844)
- **bot**: non prendono doppioni e non scambiano (un bot sopra un'arma la scambierebbe all'infinito)

**Raccolta modulare** (`RACCOLTA109`): una voce per `kind` di `ITEM_DEFS` con `puo`, `prendi`, `motivo`, `colore`.
`Items.pickup` fa la parte comune: controllo, effetto, rimozione, suono, scritta, scintille del colore
dell'oggetto (`FX.impact`). Le geometrie degli oggetti raccolti ora si liberano (prima restavano in memoria;
quelle delle armi sono condivise e restano). Niente pooling: gli oggetti sono pochi, non serve.

**Lancio a terra** (`Items.lancia109` / `vola109`): parte dal petto a 3,2 m/s avanti + 2,6 in su (+ metà della
velocità di chi lancia), gravità 18, contro i muri si ferma (`clearLine`), rimbalza (`rimbalzo` 0,25) e si posa
su terreno o strutture (`supportHeight`). In volo non si raccoglie. Misurato: si posa a ~1,8-2,6 m davanti.

**Audio delle armi** (`AUDIO109`): bus `AudioSys.armi` (GainNode fra i suoni delle armi e il master) a **0,70**
(-30%, ~-3 dB): spari (campione e ripiego sintetico), ricarica, colpo a vuoto. Cursore **«Volume armi»** nelle
impostazioni (salvato in `baia_armi109`; muovendolo dal menu fa sentire uno sparo). Intonazione casuale a ogni
sparo **0,95-1,05** (prima 0,982-1,018). Per regolare tutte le armi da un punto: `AUDIO109.armi` o
`G.audio.setArmiVol(v)`. **Non ascoltato**: da far sentire a Lorenzo.

**Castello: fessura nel muro rotto.** I tappi (v107) partivano solo dai voxel *interni* del muro, ma la parete
vera sta dentro il voxel di superficie: fra tappo e parete restava una fessura fino a 20 cm, da cui si vedeva la
parete interna scura. Ora partono anche dai voxel di superficie attaccati all'interno dello stesso blocco
(`costruisci.cjs`). Tappi da ~4.800 a 5.645 rettangoli, collisioni identiche (18.446 scatole, 348 blocchi).
Visto nel render, stesso punto prima/dopo: le due feritoie scure sono chiuse. Prezzo: dove la parete è storta
il tappo sporge di qualche cm (gradino visibile solo a blocco rotto).

**Cespugli che galleggiavano** (`quotaCespuglio109`): stavano a terreno + 0,25 x scala, giusto per il vecchio
cespuglio procedurale, ma il modello ha la base a y = 0. Misurato (`cespugli109.cjs`): mediana **17 cm per
aria**, 239 su 300 sopra 5 cm. Ora quota più bassa del terreno sul cerchio dei vertici bassi del modello, meno
4 cm x scala; dove il terreno scende più di 0,4 x scala sotto il cerchio (dirupi, bordi di piazzola) il
cespuglio non si mette (ne nascono altri altrove: sempre 300). Dopo: 0 sopra 5 cm sui tre semi, centro mai
oltre 0,44 x scala sotto terra.

Test nuovi: `v109.cjs` (inventario, scambio, butta/riprendi, munizioni, cure, morte, bot, bus audio con un finto
AudioContext che segue i collegamenti), `cespugli109.cjs` (tre semi). `colpi107.cjs` e `tools/browser/touch107.cjs`
aggiornati alla nuova API. Strumento nuovo `tools/browser/inv109.cjs` (barra su PC e telefono, H, pressione lunga,
ripresa toccando: tutto provato in Edge). **Non provato**: telefono vero, l'audio.

Strumento che ha mentito: la prima misura del "cespuglio sepolto" prendeva il vertice più affondato, che in
pendenza è il lato a monte (deve affondare): dava -3 m e "falliva". La misura giusta è il centro.

### 9.10 Cosa cambia nella v110 — fase grafica 1: luce, cielo, post-processing

Richiesta: `docs/PROMPT-GRAFICA.md` (fasi 1-7, una per sessione). Al piano Lorenzo ha risposto, testuale: «ok vai.
no voglio il giorno che cambia costantemente non che decido io. si se premo f3 fammi vedere gli fps». Quindi niente
preset da scegliere: **ciclo del giorno continuo**. AO spenta di serie in Media (accendibile da F3).

Tutto il codice nuovo sta in un blocco prima di `class Game` (suffisso `110`). La patch è riproducibile:
`git checkout index.html VERSIONE && node tools/patch110/applica.cjs` (sorgenti in `tools/patch110/`).

- **Curva**: `THREE.CustomToneMapping` = ACES di Three + grading (`GRADING110`: saturazione 1,12, contrasto 1,05,
  ombre verso blu-viola, luci calde; in spazio radice quadrata). Uguale a tutte le qualità. Tolto il filtro CSS
  `saturate(1.14) contrast(1.05)` del canvas. AgX provato (`?tono=agx` nell'indirizzo): lava i colori, scartato.
- **Nebbia d'altezza** (`NEBBIA110`): patch ai chunk `fog_*` di Three: un velo in più in basso che cresce con la
  distanza. Colore della foschia = orizzonte del cielo x `CIELO110_LUM`.
- **Ciclo del giorno** (`GIORNO110`, `Giorno110`): giro di **12 minuti** reali, parte al mattino. Il sole sale su un
  arco (64° a mezzogiorno), azimut da -150° (alba) a +30° (tramonto, il lato della v109). 9 chiavi di colori/intensità
  (alba, mattina, mezzogiorno, pomeriggio, ora d'oro, tramonto, crepuscolo, notte, aurora). **Notte corta e
  "chiara"**: luce di luna azzurra a 42°, luce diffusa 1,8 ed esposizione 1,55, stelle, lampioni accesi
  (`M.lamp` da 0,8 a 4,2 di emissione). La luce che fa ombra non scende sotto 14° e si muove a scatti di 0,2°;
  sole e luna si scambiano solo quando la luce è a zero. Il giorno scorre anche in pausa e a fine partita.
  Orologio in F3 (06:00 alba, 18:00 tramonto).
- **Cielo** (`makeSky`): gradiente orizzonte-zenit, bagliore dalla parte del sole basso, alone e **disco del sole**
  HDR (col bloom brilla) allineato alla luce delle ombre (prima il bagliore era a 7°, la luce a 28°), stelle.
  Disegnato dopo gli opachi (trappola 36).
- **Nuvole**: erano sprite oltre la fine della foschia, quindi tutte del colore della foschia (le "macchie
  arancioni"). Ora billboard fuori dalla foschia, texture a sbuffi con la base piatta (4 forme), luce sulla forma
  intera dal gradiente precalcolato della densità, bordo acceso verso il sole (di più in controluce), sfumate
  all'orizzonte. Sempre 16 (trappola 34).
- **Mappa d'ambiente** rifatta col colore del cielo ogni 1/48 di giro (~15 s).
- **Ombre ancorate ai texel** (`stableSun110`, come `stableSun93` ma con la direzione che cambia): muovendosi le
  ombre ferme non tremano. Riquadro invariato (±42 m).
- **Post-processing** (`Post110`, solo Media/Alta, mai in lobby): scena in un target HalfFloat con la profondità,
  poi **AO dalla sola profondità** a metà risoluzione (8 campioni, sfocatura che rispetta i bordi, sparisce oltre
  70 m: niente secondo passaggio della geometria come il GTAO), **bloom** sopra soglia HDR 1,6 (dual filter a 4
  livelli), passo finale (curva + grading + vignetta leggera + sRGB), **FXAA**. SMAA dagli addon di
  three@0.160.0 (import dinamico, `three/addons/` nell'importmap) solo da F3. Senza WebGL2 o in Bassa: rendering
  diretto come prima (col MSAA del canvas). Colpi, fiammate, anelli del bottino e schegge sono "HDR" (colore x2-3)
  solo quando il bloom è acceso (`hdr110`).
- **F3** (`Perf110`): FPS e ms medi (ultimo mezzo secondo), 95° percentile (ultimi 240 fotogrammi), **ms GPU** con
  `EXT_disjoint_timer_query_webgl2` (in Edge sul PC di Lorenzo c'è), draw call e triangoli (ombre comprese), buffer,
  qualità, ora. Interruttori cliccabili (Esc per liberare il mouse): Post, AO, Bloom, AA (FXAA/SMAA/no), Ombre,
  Ora +3h. F3 blocca la ricerca del browser.

**Costi misurati** (`tools/browser/costi110.cjs`, GPU vera, vista della piazza a mezzogiorno, 1920x1080, due giri):

| configurazione | ms GPU | differenza |
|---|---|---|
| v109 Bassa / v109 con ombre | 7,5 / 12,4 | — |
| v110 Bassa | 7,7-8,2 | +0,1/+0,7 (rumore ±0,3) |
| v110 ombre senza post | 12,6-12,7 | |
| post solo curva+grading (al posto del MSAA del canvas) | 11,8-11,9 | **-0,8** |
| + FXAA | 12,7-13,1 | +0,8/+1,2 |
| + bloom (= **Media**) | 13,6-14,0 | +0,6/+1,3 → Media = v109 +1,3/+1,6 |
| + AO (= **Alta**) | 15,1-15,2 | +1,1/+1,6 → Alta = v109 +2,8 |
| SMAA al posto di FXAA (solo F3) | 18,8-19,1 | +3,5/+4,1 |

Le ombre restano il costo più grosso (+4,6 ms a 1080p: ridisegnano 1-3 M di triangoli). Lì andrà la prossima
ottimizzazione vera (distanza delle ombre, oggetti che non le proiettano), non nel post-processing.

**Render**: `screen/render/fase-1/prima/` (v109), `dopo/` (mezzogiorno, u = 0,33), `dopo-tramonto/` (0,70),
`dopo-notte/` (0,86), `confronto/` (prima | dopo, una per inquadratura). Visto: ombre interne colorate e mai nere,
nuvole con volume, sole col bagliore, notte leggibile coi lampioni, AO (Alta) negli angoli (nell'angolo
scala/muro/cespuglio la mediana scende da 53 a 41; il pavimento aperto non cambia). Lobby: pelle illuminata
mediana 138 → 152, punte 211 → 215; il nero della maglietta 41 → 22 (piede della curva).

**Difetti noti, visti nei render**: dal bus resta una fascia di foschia all'orizzonte (di notte viola); a
mezzogiorno la sabbia è chiara (texture: fase 2); la pelle a mezzogiorno è quasi grigia (trappola 39, fase 5).

**Non verificato**: FPS giocando sul PC di Lorenzo (F3), il telefono (Bassa dovrebbe costare come prima, misurato
solo sul PC), come si sente un giro di 12 minuti in partita (forse troppo veloce/lento: `GIORNO110.durata`),
il caricamento di SMAA dalla CDN (in headless si carica: i programmi salgono di 3), la notte vista in movimento.

### 9.11 Cosa cambia nella v111 — nome alla prima apertura, sparo automatico

Richiesta di Lorenzo, testuale: «fa che a inizio gioco ti chieda il nome e poi lo memorizza per ogni volta che lo
apri e aggiungi anche la possibilità all inizio di sparo automatico. cioè nel senso che quando miri e il puntatore
e sul pg allora spara in automatico». Fuori dalle fasi grafiche (la fase 2 slitta alla v112). Patch:
`tools/patch111/applica.cjs` (parte dalla v110 del repo).

- **Nome**: si salvava già (`baia_nome`, campo in Impostazioni dalla v62-69), ma nessuno lo chiedeva. Ora
  `benvenuto111` mostra una finestra quando sparisce il caricamento, **una volta per dispositivo**
  (`battlecraft_benvenuto111`), col nome già scritto se ce n'era uno (non il predefinito «22lordd»). I tasti scritti
  nel campo non arrivano al gioco (`stopPropagation`). Campo a 16 px (niente zoom su iPhone).
- **Sparo automatico** (`SPARO111`, `Game.mirinoSuNemico111`, `impostaSparo111`): opzione nella finestra e in
  Impostazioni (casella `sparoSel111`), **spenta di serie**, salvata in `battlecraft_sparoauto111`. Col mirino su un
  avversario vivo, senza muri in mezzo (stesso raggio dello sparo, dalla telecamera) ed entro la portata dell'arma,
  l'arma spara da sola al suo ritmo, anche quelle a colpo singolo (cecchino: cadenza + ricarica). Non col piccone, non
  in costruzione/modifica, non in volo. Il grilletto vero non resta bloccato (`firedPress` lo tocca solo il clic).
  **Interpretazione mia** di "quando miri": basta il mirino sopra, senza tenere il tasto destro;
  `SPARO111.soloInMira = true` lo limita alla mira. Costo: test geometrico sui personaggi (distanza dalla linea del
  mirino < 1 m), il raggio vero solo se qualcuno è vicino, al massimo ogni 0,05 s. Solo il giocatore: i bot no.
  Detto a Lorenzo: sul PC è di fatto un "triggerbot", rende i bot molto più facili.
- **Scritta della versione in lobby** (`#ver`, in basso a sinistra): era ferma alla **v104**. Ora v111 e il test la
  confronta con `VERSIONE`: alla prossima versione va aggiornata anche lei (se no il test fallisce).
- Test nuovo `v111.cjs` (18 controlli: mirino sul bot/a lato/dietro un muro/oltre la portata, opzione spenta,
  cecchino al suo ritmo, piccone, costruzione, salvataggio, finestra, versione). Strumento
  `tools/browser/benvenuto111.cjs`: profilo nuovo → finestra, nome, ricaricamento → ricordato; in partita 12 colpi
  da soli in 1,5 s con l'opzione, 0 senza; finestra su telefono emulato (iPhone 13 orizzontale): ci sta.
- **Non provato**: telefono vero; come si sente in partita (tempi di reazione, se dà fastidio quando si vuole solo
  guardare un nemico).

### 9.12 Cosa cambia nella v112 — fase grafica 2: materiali e texture (+ "divisioni" del castello)

Richiesta: la fase 2 di `PROMPT-GRAFICA.md`, più un prompt "materiali stilizzati" di Lorenzo (colori saturi, normal
solo a forme grandi, metallo opaco con spigoli lucidi, pelle/tessuti/cuoio, 2K/4K). Al piano ha risposto, testuale:
«no il castello non lo eliminare ma vorrei non si vedessero le divisioni». Quindi: castello con le SUE texture, e via le
linee. Detto a Lorenzo prima di farlo: pelle, tessuti, cuoio e armature sono fase 5 (il modello ha solo il colore,
trappola 10); 2K/4K su UHD con texture generate al caricamento non conviene (colore 1024, normal/rugosità 512).
Patch riproducibile: `git checkout index.html VERSIONE && node tools/patch112/applica.cjs` (sorgenti in `tools/patch112/`).

- **Le "divisioni" del castello erano i tappi** (v107/v109) dei muri cavi sui confini dei blocchi da 4 m: ~11.400
  triangoli che sporgono dalla parete (voxel da 20 cm), visti di taglio come linee dritte. Diagnosi con
  `cuciture112.cjs` (trappola 40). Ora `World.tappi112` li trova (triangoli del materiale di pietra stesi su un piano di
  confine, normale esatta sull'asse), li rende degeneri **nell'indice** e `removeHarvestable` accende solo quelli che
  guardano il blocco rotto (`mostraTappi112`); `restoreHarvestables` li rispegne. Le posizioni restano quelle di prima.
  Visto nel render: muro pulito, blocco rotto chiuso dai tappi dei vicini.
- **Texture generate sulla GPU** (`MAT112`, `genMat112`): 9 materiali (conci, lastricato, pietra grezza, tavole,
  mattoni, tegole, lamiera ondulata con ruggine, perlinato, zolle). Per ognuno: passata d'altezza (HalfFloat), poi colore
  con occlusione e curvatura dipinte (incavi caldi mai sotto il 62%, spigoli più chiari, finta luce dall'alto), normal,
  ORM (rugosità in G, metallo in B). `readPixels` → `DataTexture` con mipmap e anisotropia 8. **1,1-1,6 s** alla prima
  Media/Alta sulla UHD (+0,1 s per il castello). Foglio delle texture: `tools/browser/texture112.cjs`.
- **Densità fissa e UV nel mondo** (`uvMondo112` in `World.batch`): sulle scatole una ripetizione ogni `MAT112.lato` m
  (2 m; mattoni 1,6; pietra grezza 3; zolle 2,5), proiezione per faccia. Vale anche in Bassa (texture vecchie con la
  stessa densità; costo zero al fotogramma). Prima ogni faccia aveva la texture intera, stirata o schiacciata.
- **Due insiemi di materiali** (`scambia112`): Bassa = quelli della v111; Media/Alta = `MeshStandardMaterial` con normal
  e rugosità (terreno e rocce restano Lambert). Lo scambio passa anche dai blocchi della mappa staccati (trappola 41).
  F3 ha l'interruttore **Materiali** (v112/vecchi).
- **Shader comuni** (`inietta112`): variazione di tinta a bassa frequenza nel mondo (spezza la ripetizione), **sporco
  alla base dei muri** (mappa d'altezza presa dalla mesh vera del terreno, 181×181), **triplanare** su rocce e scogliere
  (pietra grezza, whiteout), **schiuma sulle rive** (profondità dal terreno, fascia fissa + onde che si muovono).
- **Castello**: normal e rugosità ricavate dal disegno di Lorenzo (la malta scura diventa un solco), il colore resta il
  suo. Niente triplanare sul castello: le sue pietre poligonali con la malta scura, mescolate fra due proiezioni,
  farebbero doppie righe sulle torri.

Valori dei materiali (normalScale in `MAT112.normale`): conci 1,0 · lastricato 1,0 · grezza 1,2 · legno 0,9 · mattoni
1,0 · tegole 1,0 · lamiera 0,8 (metallo 0,35, creste 0,85, ruggine 0) · perlinato 0,9 · zolle 0,55 · castello 0,9.
Rugosità dipinta nella mappa: pietre 0,8-0,95, legno 0,7-0,95, lamiera 0,28-0,42 (ruggine 0,92), spigoli -0,25.

**Costi misurati** (`costi110.cjs`, piazza del castello, mezzogiorno, 1920×1080, GPU vera): Media 13,0 → **14,8 ms**,
Alta 14,4 → **16,2 ms** (+1,8 ms, quasi tutto lo `MeshStandardMaterial` con normal al posto del Lambert). Bassa
invariata (materiali v111; verificato: 0 materiali nuovi in scena in Bassa, 417 in Media).

**Render**: `screen/render/fase-2/prima/` (v111), `dopo/`, `confronto/` (prima | dopo), `extra/citta.png` (città
v111 | v112: lì il salto è più evidente, i muri sfocati diventano conci nitidi), `texture.png`, `diagnosi*/`.

**Non verificato / aperto**: FPS giocando (F3) e il telefono (Bassa non cambia, quindi dovrebbe restare uguale); come si
legge in movimento la schiuma (in un'immagine ferma è una fascia bianca abbastanza larga sulle spiagge piatte); le zolle
del terreno si vedono poco (la normal sul Lambert a 0,55 è sottile: alzabile da `MAT112.normale.zolle`); le texture si
generano **la prima volta che la qualità è Media/Alta** (in `scambia112`, chiamato da `setQuality`): il telefono parte in
Bassa e non le genera mai, sul PC si pagano 1,6 s alla prima `setQuality('med')` (all'avvio). La lobby non usa questi
materiali.

### 9.13 Cosa cambia nella v113 — logo nuovo

Richiesta di Lorenzo, testuale: «ti ho messo nuovo logo del gioco». Nella radice c'erano due immagini Gemini: il logo
(BATTLECRAFT in pietra bianca col martello fra BATTLE e CRAFT, fondo verde) e un foglio di materiali stilizzati (sfere e
blocchi in Blender, non è un logo: lasciato dov'era, utile come riferimento per le fasi grafiche).

- Originale copiato in `assets/logo/logo-originale.jpg` (2816×1536). `tools/logo113/scontorna.cjs` toglie il verde in Edge:
  "verdezza" = G - max(R,B) (fondo 47,90,63 → 27; lettere, metallo e legno ~0 o sotto), alfa graduale fra 6 e 0,72×fondo,
  sui bordi il colore del fondo viene tolto dal miscuglio, poi niente G sopra max(R,B) (via l'alone). L'ombra scura sotto le
  lettere diventa un'ombra nera semitrasparente. Ritaglio al contenuto, riduzione a metà successive: **960×320 (3:1)**,
  WebP 41 KB (`assets/logo/logo.webp`, anche PNG e il ritaglio pieno). Visto ingrandito su bianco e magenta: niente alone.
- Nel gioco (`tools/logo113/applica.cjs`): il WebP sta **una volta sola** come variabile CSS `--logo113` (55 KB di base64
  nella riga del CSS: tagliare con `cut`), disegnato da `.logoImg` (`aspect-ratio:3/1`, `background-size:contain`) in tre
  punti: barra della lobby (54 px di altezza, 40 su schermi stretti e al telefono), caricamento iniziale e "SI PARTE"
  (larghezza del riquadro, 440 px). `role="img"` con `aria-label`. Tolta la scritta a caratteri.
- Visto nei render (`screen/logo113/`): barra della lobby a 1280×720 e su telefono emulato 844×390 ×3, schermata "SI
  PARTE". Il manico del martello esce di pochi pixel sotto la barra: voluto, sta bene.
- Non cambiati: `<title>` e icona (resta Amy).

### 9.14 Cosa cambia nella v114 — forzieri con bottino per rarità, medikit da portare

Richiesta di Lorenzo (testo preparato, con il forziere): apertura dei forzieri col raggio/interazione, una volta sola,
coperchio che si apre, arma estratta a caso pesata per rarità (comune, rara, epica, leggendaria) con i suoi dati;
vita e cure con medikit trasportabili (massimo, raccolta, tasto dedicato, mai oltre la vita massima).

**Il modello.** Il testo diceva `.obj`, ma il file nella radice è `forziere_v3.glb` (generatore "Lorenzo chest gen";
`forziere_v3 - Copia.glb` è identico byte per byte). Era **22 MB, 647.480 triangoli, texture 2048 + 1024, un pezzo solo**:
dentro l'HTML avrebbe raddoppiato il gioco, e il coperchio non si poteva aprire. `tools/forziere114/prepara.cjs`:
- divide i **componenti connessi** fra cassa e coperchio. Il giunto è a 0,660 m (il bordo di ferro della cassa finisce a
  0,657, quello del coperchio comincia a 0,663), ma **non è un piano**: gli archi laterali del coperchio scendono fino a
  0,632 dentro il bordo della cassa, e le staffe d'angolo della cassa salgono a 0,669. Regola: centro del componente
  sopra/sotto il giunto, più 4 eccezioni scritte nel file (piastra della serratura e serratura scura col coperchio,
  tappini degli archi col coperchio, tappini delle staffe con la cassa). Verificato col render esploso.
- semplifica con **meshoptimizer** (contrazione di spigoli, errore 0,003 = ~4 mm): **8.912 triangoli** (5.364 cassa,
  3.548 coperchio). A distanza di gioco identico all'originale (render affiancati).
- mette il nodo `Coperchio` sulla **cerniera** (0; 0,66; −0,427): nel gioco basta ruotarlo su X.
- texture a 512 (legno) e 256 (ferro) via canvas di Edge. Risultato `assets/forziere114/forziere114.glb`, 352 KB,
  **298 KB di base64** nell'HTML (`FORZIERE114_B64`). Il materiale `Bagliore` del file originale non è usato da nessuna mesh.
- **Trappola pagata:** `npm i <pacchetto> --no-save` dentro `tools/forziere114/` risale al `package.json` della radice
  e **toglie `playwright-core`** (non è nel package.json). Installare sempre i due insieme:
  `npm i --no-save --no-package-lock playwright-core@1.48.2 meshoptimizer@0.22.0` nella radice.

**Nel gioco** (patch `tools/patch114/applica.cjs` + modulo `tools/patch114/forzieri.js`, parte dalla v113):
- `Forzieri114`: **18 forzieri** per partita (`FORZIERE114`), vicino ai punti del bottino della mappa, scala 0,8
  (1,1 × 0,82 m), girati a multipli di 90° (così la collisione a scatola combacia), almeno 28 m l'uno dall'altro,
  su terreno piano (angoli entro 12 cm), fuori dall'acqua, senza toccare collisioni e **solo su terreno o pavimenti**:
  il primo giro ne aveva messo uno sopra una roccia (la collisione delle rocce è più grande e piatta del disegno, v106).
- **Apertura**: tasto Raccogli (X). Bersaglio = forziere colpito dal raggio della telecamera entro 2,4 m dal giocatore,
  se nessun muro è in mezzo; se no, uno chiuso entro 1,4 m davanti. Ha la precedenza sugli oggetti a terra e la sua
  scritta ("X Apri il forziere"). Anche controller (tasto raccogli) e telefono (tocco sul forziere).
- **Una volta sola**: `aperto` si mette nell'istante del tasto, prima dell'animazione: un secondo tasto o un secondo
  `apri()` non estrae nulla (testato).
- Coperchio: 108° in 0,55 s con ritorno elastico; a 0,22 s esce l'arma, lanciata verso chi ha aperto (rimbalza come
  le armi buttate, v109), scintille e bagliore del colore della rarità. Il forziere resta aperto e vuoto.
- **Estrazione** (`estraiArma114`): prima la rarità (`RARITA114`: comune 50, rara 30, epica 15, leggendaria 5), poi
  l'arma fra quelle che la ammettono (`BOTTINO114`: fucile 5, pompa 4, precisione 1,5 solo epica/leggendaria).
  Restituisce `{arma, nome, rarita, nomeRarita, colore, css, moltDanno, danno, caricatore, munizioni, tipoMunizioni}`.
- **La rarità conta**: la casella dell'inventario diventa `{w, mag, rar}`; danno ×0,90 / 1,00 / 1,08 / 1,16
  (**stimati**, da provare giocando), anche sui pezzi costruiti. Si conserva buttandola, scambiandola e alla morte;
  colore della casella, nome nell'interfaccia e anello a terra prendono la rarità. Le armi che c'erano già (iniziale,
  a terra, dei bot) non hanno rarità e restano esattamente come prima.
- I bot **non** aprono forzieri.

**Medikit** (`MEDIKIT114`): il "Kit medico" esisteva in `ITEM_DEFS` ma **non usciva mai sulla mappa**. Adesso:
- se ne portano fino a **3**; raccolti non si consumano (oltre il massimo restano a terra, "Medikit al massimo");
- tasto **T** (`medikit` in ACTIONS, cambiabile nelle impostazioni), oppure tocco sulla casella ✚ nella barra;
- cura **+50** dopo **2 s** (barra della ricarica come avanzamento); mai oltre `maxHp` (nuovo, 100: anche `heal()`
  e la barra della vita lo usano); a vita piena non parte e non consuma; sparare o cambiare modalità la interrompe
  (il kit resta);
- 12 medikit a terra per partita, accanto a pozioni e bende; i bot li usano subito (non li portano).
- Le bende restano com'erano (cura immediata alla raccolta).
- `test/v109.cjs` controllava il vecchio kit medico (a vita piena resta a terra, a 40 porta a 100): quel controllo ora usa
  la benda (stessa regola, +15). Suite intera: tutto PASS.

**Test** `test/v114.cjs` (50 controlli, in `run-all`): frequenze su 20.000 estrazioni con seme, armi solo nelle rarità
ammesse, modello vero con coperchio e cerniera, piazzamento (libero, piano, non in acqua, non su rocce, distanze),
bersaglio col raggio / muro in mezzo / troppo lontano / di spalle, apertura una volta sola, un'arma sola con la sua
rarità, coperchio a 108°, rarità in casella e a terra, **danno vero di un colpo leggendario = base × 1,16**, tutti i casi
dei medikit. L'harness espone `Forzieri114`, `Medikit114`, `spargiMedikit114`; i numeri stanno in `Forzieri114.cfg`.

**Visto nei render** (Edge, partita vera, luci del gioco): forziere chiuso e aperto su un prato, coperchio sulla cerniera,
fucile di precisione leggendario uscito con l'anello arancione. Non visti: l'animazione in movimento, l'interfaccia
(scritta, casella ✚) e il telefono. Da provare giocando: frequenza dei forzieri, moltiplicatori del danno, tempo di cura.

### 9.15 Cosa cambia nella v115 — le auto di Lorenzo, un colore per auto, 13 auto sulla mappa

Richiesta di Lorenzo, testuale: «aggiungi anche diverse macchine ho già aggiunto il modello cambia colore diverse volte.
per la mappa al posto della macchine che già ci sono».

**Il modello**: `macchina_citycar_v4.obj` (32 MB, 570.176 triangoli, 94 pezzi con nomi, 12 materiali per nome, normali,
niente UV, fronte verso +X, lunga 4,07 m). Il suo `.mtl` **non c'è**: i colori li dà `tools/macchina115/prepara.cjs`
(tabella MATERIALI). **La prima riga dell'OBJ nomina il gioco di riferimento** (vincolo 1): il commento non viene copiato,
nel gioco e nella repo non c'è. Lo script: un primitivo per materiale saldato per (posizione, normale), meshoptimizer
(errore 0,0025, LockBorder sui confini fra materiali), poi **tre pezzi soli**: `carrozzeria` e `tetto` (ritinti nel gioco)
e `resto` col colore nei vertici (cromo e fari perdono metallo ed emissione, compensati schiarendo fari/led/stop).
12 materiali x 13 auto erano oltre 150 draw call; così sono 3 per auto. **14.138 triangoli**, `assets/macchina115/macchina115.glb`,
**364 KB di base64** (`AUTO115_B64`). Render a 12 pezzi e a 3 pezzi: indistinguibili.

**Nel gioco** (patch `tools/patch115/applica.cjs` + `auto.js` + `strade.js`, parte dalla v114):
- il modello nuovo entra **dentro `World.car()`** al posto del vecchio (`PROPS.auto` ritinto): porte libere
  (`liberaPorte102`), collisione `tag: 'car'`, piccone (metallo 140) e i test `mondo`/`sovrapposizioni` restano gli stessi.
  La collisione ora è la scatola giusta anche con l'auto storta (mezza lunghezza 2,03, mezza larghezza 0,95 senza
  specchietti, alta 1,42). Senza il modello si torna al vecchio.
- **un colore per auto** (`AUTO115_COLORI`, 14): un materiale per colore, non per auto. Sulle auto chiare (bianca,
  argento) il tetto diventa scuro, se no sparirebbe. Le tre della città: rossa, blu e gialla (prima erano rossa e **due blu**).
- **10 auto in più fuori città** (`World.autoStrade115`, numeri in `AUTO115`, elenco in `W.autoDove115`):
  4 **lungo i sentieri** (parallele al tratto a 3,4 m dalla linea, solo tratti entro 30° da un asse) e 6 **di fianco
  alle case** (parallele al muro a 1,3 m, mai entro 1,5 m da una porta). Ogni posto: oltre 40 m dal centro città e 40
  dal castello, in piano (ruote entro 45 cm), fuori dall'acqua, 18 m fra due auto, nessuna collisione, nessun cespuglio
  (i cespugli non hanno collisione: controllati su `veg.slot`).
- Totale **13 auto, 13 colori**.
- **Trappola pagata (detta male a Lorenzo e poi corretta)**: messe prima della vegetazione con un caso a seme proprio,
  pensavo che alberi e rocce restassero dove erano. Falso: un albero scartato perché il posto è occupato salta i suoi
  `WRNG`, e tutti quelli dopo slittano: **80 alberi e rocce cambiavano posto in tutta l'isola**, anche a 80 m dalle auto.
  Adesso le auto si mettono **dopo `makeVegetation()`** ed evitano alberi, rocce e cespugli: il resto della mappa è
  identico alla v114 (verificato: 0 oggetti spariti, 0 nuovi, 814 cespugli uguali). Lungo i sentieri i posti piani e
  liberi sono pochi (pesano pendenza, acqua e la città, da cui partono tutti i sentieri), per questo le case.
- `test/v110.cjs` contava 1.656 oggetti raccoglibili ("mappa identica alla v109"): ora conta 1.656 + le auto aggiunte.
- L'harness carica il modello (`caricaAuto115` in `init`), quindi tutta la suite prova le auto nuove.
- `test/colpi107.cjs` spara a braccio e gamba da 5 m di lato nel prato (-60,-8): a 3 m c'è ora un'auto del sentiero e il
  raggio prendeva lei. Il test toglie le collisioni delle auto entro 10 m dal punto (misura le zone del corpo, non le auto).
  **Il prato (-60,-8) è il punto di prova di v111, v114 e colpi107**: chi aggiunge oggetti lì vicino ricontrolli quei test.

**Test** `test/v115.cjs` (18 controlli): modello (3 pezzi, <20.000 triangoli), tutte col modello nuovo, ≥8 fuori città
con entrambi i tipi di posto, colori tutti diversi, carrozzeria del colore giusto, tetto scuro solo sulle chiare,
parallele al sentiero o al muro (0,5-2,5 m), in piano, fuori dall'acqua, distanze, nessuna dentro collisioni o davanti a
porte, collisione che contiene la carrozzeria, piccone.

**Visto nei render** (`screen/auto115/`): auto blu in città, verde e bianca (tetto scuro) e arancione lungo i sentieri,
verde lime accanto a una casa di mattoni, grigia accanto a una casa col portico. Non visto: auto distrutta col piccone in
partita, telefono.

### 9.16 Cosa cambia nella v116 — multiplayer online (2 giocatori, Colyseus)

Richiesta di Lorenzo: giocare con un amico aprendo un link, senza LAN né download; stanze con codice, 2 giocatori,
posizioni/rotazioni/animazioni/telecamera sincronizzate, nomi, disconnessioni e riconnessioni, spawn diversi; il server
responsabile dello stato condiviso e che valida gli input; **niente sistema di movimento alternativo, niente modelli nuovi,
niente grafica toccata**; pagina su Vercel, server a parte, indirizzi da variabili d'ambiente, niente localhost online.
Guida completa (uso, pubblicazione, test): **`docs/ONLINE.md`**.

**Architettura.** Server **Colyseus 0.18.12** in `server/` (Node ESM, niente build): `src/index.js` (porta da `PORT`,
`ORIGINI_CONSENTITE` facoltativa per il CORS), `src/StanzaBattle.js` (stanza, schema `Giocatore`/`StatoStanza`),
`src/regole.js` (limiti e validazione, funzioni pure: le prova `test/stanza.mjs`). Il **codice stanza È il roomId**
(4 caratteri senza 0/O/1/I): l'amico entra con `joinById`. `maxClients = 2`, patch a 20 Hz.
Nel gioco: classe **`Rete116`** (patch `tools/patch116/`), il client `@colyseus/sdk@0.18.10` si scarica da jsdelivr **solo
quando si preme Crea stanza / Entra** (il solitario non carica niente in più).

**Perché funziona senza toccare movimento e animazioni.** `Character.animate()` ricava tutto (camminata, corsa, salto,
atterraggio, accovacciamento, idle, arma) da `vel`, `onGround`, `yaw`, `crouch90/crouchK90`, `ads`, `mode/weapon`. Il mio
client muove il giocatore con `applyMovement` + `Physics` come sempre e manda questi valori 20 volte al secondo; l'altro è un
`Character` normale senza cervello (`remoto116`, modello pieno con `opts.eroe116`) a cui do i valori interpolati con 120 ms
di ritardo. `Rete116.update` gira nel ciclo PRIMA di `update()`, così è in posa prima di `animate`.

**Validazione sul server** (`validaStato`): numeri finiti, dentro la mappa, passo orizzontale ≤ corsa × 1,35 × dt + 0,6 m,
salita ≤ 9 m/s × dt + 0,8, caduta ≤ 60 m/s, primo stato vicino allo spawn, ts che avanza, orologio al guinzaglio
(±750 ms), secchiello di 12 messaggi a 30/s. Se un movimento non va: `correggi` → il client torna all'ultima posizione buona.
Il server **non** rifà la fisica del mondo (servirebbe far girare l'isola intera in Node): controlla che ogni movimento
dichiarato sia possibile. Da riconsiderare quando ci saranno i danni.

**Partita online** (`Rete116.startMatch`, chiamata da `startMatch` se si è in stanza): **niente bot, bus, tempesta, bottino e
forzieri** (andrebbero fuori sincronia), fucile in mano. Spawn **(-42, 40)** e **(-40, 50)**: cercati con una griglia a 2 m
sulla mappa vera (in piano, nessuna collisione entro 3,5 m, fuori dalla città); i primi scelti stavano sotto un portico.
Tornando in lobby si resta nella stanza (`inGioco = false`: l'altro sparisce dalla mappa); Esci la lascia.
Riconnessione: l'SDK riprova da solo, il server tiene il posto 30 s (`allowReconnection`), il token sta in `sessionStorage`
(anche ricaricando la pagina si rientra). Etichetta col nome sopra la testa (sprite), grigia con "(…)" in riconnessione.
In partita, in alto: `ONLINE · STANZA K7Q2 · 2/2 · ping`.

**Pubblicazione**: `vercel.json` (build `tools/vercel/prepara.cjs` → `dist/index.html` col meta `battlecraft-server` riempito
da `BATTLECRAFT_SERVER_URL`; rifiuta variabile mancante e localhost), `.vercelignore` (solo la pagina), `render.yaml`
(server su Render, piano free che si addormenta). Ordine dell'indirizzo del server nella pagina: `?server=` > meta > localhost
solo se la pagina stessa è aperta in locale > nessuno.

**Misurato** (`tools/browser/online116.cjs`, due Edge headless separati + server vero): 27/27, anche sulla versione
"pubblicata" (`dist/` con l'indirizzo nel meta e `ORIGINI_CONSENTITE` attiva) e con **150 ms di latenza simulata**
(`COLYSEUS_LATENCY=150`): da fermo l'altro è dove è (< 5 cm), in corsa lo scarto è quello di latenza + ritardo, il salto si
vede (> 0,8 m), accovacciamento/piccone/arma/rotazione arrivano, 0 correzioni del server nel gioco normale, riconnessione
automatica dopo un WebSocket chiuso di colpo. Scatti in `screen/online116/`.
**Pubblicato il 26/11/2026**: gioco su **https://battlecraft-blush.vercel.app/**, server su **https://battlecraft-server.onrender.com**
(Render free; `BATTLECRAFT_SERVER_URL=wss://battlecraft-server.onrender.com` su Vercel). Provato DA QUI contro quelli veri:
`server/test/stanza.mjs wss://battlecraft-server.onrender.com` 31/31 e `online116.cjs` sul link di Vercel 27/27 (ping ~200 ms:
il servizio Render sta in America, regione di serie). Dietro il proxy di Render una disconnessione si vede dopo **~10 s**
(la nota il ping di Colyseus), in locale subito. Scatti in `screen/online116-pubblicato/`.
**Non visto**: due PC in due case diverse, telefono. **L'aspetto dell'altro è uguale al proprio** (stesso modello; la palette non cambia il modello esterno): li
distingue il nome.

**Fasi successive** (in ordine): danni fra giocatori con colpi validati dal server; bus/tempesta condivisi; costruzioni e
raccolta; oggetti a terra e forzieri.

### 9.17 Cosa cambia nella v117 — multiplayer fase 2: 10 giocatori, spari e danni

Richiesta di Lorenzo dopo la prima partita vera con un amico (testuale): «le build degli altri giocatori per me non
esistono. non partiamo direttamente dal bus. vorrei la possibilità di riempire la lobby con bot. ho sparato 300 volte il
mio amico e non è morto. non lho visto manco sparare. non vedo manco il mio amico volare col deltaplano. e poi si vorrei
server in europa», poi «vorrei anche ci fossero almeno 10 giocatori online». Piano a fasi concordato: 0 Europa,
1 spari e danni, 2 bus + deltaplano, 3 costruzioni, 4 bot (li simula il client di chi crea la stanza). **Questa versione
fa la 0 e la 1** (+ 10 giocatori).

- **10 giocatori** (`REGOLE.maxGiocatori`, `RETE116.max`): 10 posti di partenza nel prato a ovest della città (griglia a 2 m
  sulla mappa vera, almeno 7 m fra loro), lobby "Online n/10" e nomi di tutti.
- **Spari e danni, la vita sta sul server.** `Rete116.aggancia()` avvolge `Combat.tryFire` e `FX.tracer` (una volta): durante
  uno sparo del giocatore raccoglie i punti d'arrivo dei pallini e i colpi sugli altri (`takeDamage` dei remoti =
  `dannoRemoto`: calcola la divisione scudo/vita per hitmarker e numeri, NON tocca la vita) e manda **un messaggio `sparo`**
  { arma, bocca, punti, colpi }. Il server (`riceviSparo`): ritmo di fuoco a secchiello per arma (raffica 3), portata +10 m,
  angolo fra yaw del tiratore e bersaglio ≤ 75° (oltre 4 m), danno per pallino ≤ danno x zona max x 1,16 (`ARMI_DANNO`: copia
  dei numeri di WEAPONS, **se cambiano le armi va cambiata anche lì**), poi `applicaDanno` (come takeDamage) e gira lo sparo
  agli altri: fiammata, scie, sangue, suono 3D, rinculo. Piccone: messaggio `piccone`, ≤ 5 m, 3 colpi/s.
  Il mio `takeDamage` in online non fa niente: la mia vita la leggo dallo stato (`vitaMia`, vignetta se scende).
  Eliminazione: il server manda `eliminato` {v, k, arma} e ognuno chiama la `G.onDeath` di sempre (feed, armi a terra,
  "Eliminato"/vittoria). Partita nuova (lobby → Gioca): vita 100 sul server.
- Ricarica e colpi di piccone dell'altro: campi `ricarica` e `sw` (contatore) nello stato.
- **Server in Europa**: `render.yaml` con `region: frankfurt`. Render non cambia la regione di un servizio esistente:
  Lorenzo deve cancellarlo e riapplicare il Blueprint (`docs/ONLINE.md`).

**Misurato**: `server/test/stanza.mjs` 45/45 (10 giocatori + l'undicesimo rifiutato, colpo valido -23, danno gonfiato
tagliato a 44, 30 spari di precisione in un istante → ne passano 3, colpo di spalle scartato, eliminazione con annuncio e
uccisione, eliminato che non fa danno, vita piena alla partita nuova, piccone da 10 m scartato, avvio con primo pacchetto in
ritardo senza correzioni). `tools/browser/online117.cjs` con **tre Edge separati**: 15/15 (vita di B uguale sul server e sui
tre schermi, B e C vedono scie e fiammate di A, eliminazione nel feed di tutti, B "Eliminato", A e C restano in partita,
B rientra con vita piena). `test/v116.cjs` 44/44 (colpi e vita lato client con stanza finta).
**Non visto**: partita vera fra PC diversi con la v117 (serve il server nuovo online), telefono.

### Cosa non è verificato (detto dal LEGGIMI stesso, e vero)

- **nessuno ha visto la v93 renderizzata** tranne, eventualmente, Lorenzo
- nessuna misura FPS reale
- l'audio direzionale passa i test numerici ma non è stato ascoltato
- nessuna prova su telefono
- il confronto col riferimento sulle quattro azioni partenza/corsa/curva/arresto non è
  stato fatto con misure, solo guardando fotogrammi del suo video

### Aperto, ereditato dal brief sulla naturalezza del movimento

Lorenzo ha consegnato un **brief formale in 8 punti** (analizzare prima di modificare;
stabilità di testa e collo; fasi di appoggio dei piedi; bacino, busto e spalle;
comportamento in ogni azione; armi, mani e braccia; ordine e limiti delle correzioni;
ricerca e verifica). Testuale: «Se hai difficoltà, dubbi o risultati poco credibili, cerca
su internet prima di continuare per tentativi» e «Non definire il movimento "umano" o
"risolto" soltanto perché il codice funziona senza errori».

Alla v69 restavano aperti i punti sotto. **Non è noto quali siano stati affrontati fra la
v70 e la v92**: verificare nel codice prima di ripartire.

- blocco dei piedi con IK durante la locomozione (alla v69: scivolamento ~20% della
  velocità del corpo, 48 cm/s a passo, 101-152 in corsa). Nella v93 c'è un blocco
  `feetHuman`/`solveLimb` (righe ~4711-5025): da capire cosa copre già
- limiti articolari di testa e collo sugli assi veri
- salto e atterraggio
- sistema mani-arma (nella v93 c'è `rifleHuman`/`routeHand`: idem, da capire)
- clip della corsa all'indietro
- sovrapposizione mira/sguardo sul busto durante la locomozione
- **texture dell'auto**: `map_body_cab3_02_BaseColor.png`, `map_glass_cab3_03_BaseColor.png`,
  `map_wheel_cab3_01_BaseColor.png`, in `F:\Downloads\AM_cab3\SALE_textures\` sul suo PC
  (alla v69 mai applicate; verificare nella v93)
- contorno: `CONTORNO.spessore = 0.026`, verificare che i colpi facciano ancora danno ai bot
- ~~licenza del modello~~: chiusa, il modello l'ha fatto Lorenzo con Meshy (vincolo 5)
- correggere la riga del LEGGIMI che nomina il riferimento (vincolo 1)

### Il prossimo passo logico

Con la sezione 3.1 molto si guarda da soli. Restano a Lorenzo: **l'audio** (suoni del
lancio v99, spari direzionali), **il telefono** (iPhone v101, mira assistita v100) e il
giudizio sulla **naturalezza del movimento** (accovacciato v103 compreso). Da chiedergli:
dove sono finite le texture dell'auto (`F:\` non esiste sul PC attuale).

Candidati per la prossima sessione, guardando i render: il DOPO della prova grafica nella
partita normale (adesso si può confrontare a occhio), la rete stesa del villaggio, il
brief del movimento (salto/atterraggio, corsa all'indietro, mani sull'arma).

---

## 10. L'ISOLA — ora è il terreno del gioco

### 10.1 Da dove viene

Nata come mappa esplorabile separata (con un visore: volo/camminata, minimappa,
etichette, teletrasporto), poi fusa nel gioco. Nella v93 resta `const LUOGHI = []` col
commento «elenco per il menu di teletrasporto del visore»: residuo del visore, da capire
se il visore esiste ancora nel gioco o se è codice morto.

Richiesta originale, testuale: «voglio una mappa più grande sempre con gli elementi che hai
già. fai una sola città il resto sono casupole sparse. aggiungi laghi grotte. la mappa è
un'isola in mezzo al acqua letteralmente. covi nascondigli segreti case sull albero un
castello e easter egg. non voglio che banalizzi tutto. voglio comunque che dai dettagli.
ricordati che comunque che siamo in un mondo cartoon stile [il riferimento].»

**Poi ha fatto tagliare quasi tutti quei luoghi**, uno alla volta, guardandoli: grotte,
castello con la scalinata, montagna del castello, cascata, palme, relitto, case
sull'albero, papera gigante. Il motivo era sempre lo stesso — **fatti male, non
sbagliati come idea**. Vedi 10.6.

La mappa della partita ha anche un generatore a seme: la standard dà 33 case, i semi
123456 e 999 ne danno 28 e 27 (test `maps.cjs`).

### 10.2 Il terreno — l'ordine dei pezzi è la cosa importante

Costanti: `MARE = 0`, `RAGGIO_ISOLA = 150`, `MAPPA = 440`,
`CRESTA = {ax:98, az:-22, bx:132, bz:58, h:22}`, `CITTA = {x:6, z:18, y:3.0, r:52}`,
`LAGHI`: Lago Grande (−86, 52, r 30, fondo −4,2), Lago Alto (62, −62, r 19, fondo −3,2),
Laguna (24, 108, r 23, fondo −2,6). `PATHS`: sentieri che spianano e schiariscono il
terreno e tengono libera la vegetazione.

La forma nasce da pochi pezzi sovrapposti, **in quest'ordine, perché l'ordine conta**:

1. colline (fbm)
2. rilievo grosso (la cresta)
3. conche scavate (città e laghi) — devono poter tagliare dentro i rilievi
4. **discesa verso il mare, per ultima, che vince su tutto**

Il castello aveva una terrazza che doveva vincere anche sulla costa; messa prima, la costa
le mangiava un angolo di 16,3 m. Ora che il castello non c'è, **la costa è davvero l'ultima
parola e non ci sono eccezioni**.

Laghi e coste non sono cerchi: `raggioMosso(x, z, cx, cz, base, ampiezza, seme)` campiona
un rumore sull'**angolo** (cos/sin), così il bordo si chiude senza cucitura visibile.
Aggiunto dopo «i laghi sono troppo circolari».

### 10.3 Le tre lezioni dell'isola (non ripeterle)

**a) `this.box()` accorpa le geometrie, quindi niente materiali a colore per vertice.**
Dentro `box()` vanno **solo materiali a tinta propria** (`MX.selciato`, `MX.selciato2`,
`MX.sasso`, `MX.tronco`, `MX.telo`). `M.rock` e `M.trunk` usano `vertexColors` e sulla
geometria accorpata rendono nero. Il commento sopra `const MX` nel codice lo ricorda.
Il conteggio delle mesh che chiedono colori che non hanno **deve restare 0**.

**b) L'alone bianco sopra la città erano le nuvole**, rimaste alla scala del vecchio mondo
quadrato da 200: sprite bianchi fra la camera e i tetti. Spostate a 160-240 di quota su un
raggio di 230-430; il sole a (520, 150, 300). **Se una macchia non sparisce togliendo gli
oggetti sotto, non è lì.** (Il DOPO della v93 tocca cielo, sole e foschia: ricontrollare
che le nuvole non siano tornate dentro l'isola.)

**c) Una sola quota d'acqua: `MARE = 0`.** Il mare è un disco di raggio 343 sotto tutta
l'isola; ovunque il terreno scende sotto zero si vede il mare. I vecchi dischi dei laghi a
−1,1 creavano due acque sovrapposte. Tolti: i laghi sono specchi al livello del mare.
Corollari: la riva del molo si **trova** (dal largo verso il centro, primo punto dove il
terreno scende sotto il piano delle tavole) e il molo va verso il largo; i massi
dell'isolotto si alzano col parametro `alza` di `rockAt`.

### 10.4 Cosa c'era sull'isola alla mappa v6 (da ricontrollare nella v93)

- **Città** (6, 18): vie in terra battuta dai `PATHS`, prato comune con albero grosso,
  cinque bancarelle a teli colorati, pozzo, panchine, carro di fieno, lampioni, gazebo,
  siepi, auto, cassonetti
- **Casupole** sparse (86, 86 e dintorni): pozzo, catasta, orto, fuoco spento
- **Bunker**, **Rifugio nella roccia**, **Accampamento** — i covi
- **Tre laghi** (il grande con isolotto, canneti, molo a tavolato, barca di assi)
- **Cresta rocciosa** a est
- **Sei easter egg** sparsi, non segnalati

Regola per barche e moli: **assi dritte, non superfici curve**. I mezzi cilindri si
leggevano come botti.

Nella partita ci sono anche le case generate (33 nella mappa standard), che nella mappa v6
non c'erano: non è noto come convivano con città e casupole. Da guardare.

### 10.5 Perché sono stati tolti (per non riproporli uguali)

| cosa | difetto misurato o osservato |
|---|---|
| grotte | speroni a 4,2 di distanza ma grossi 3,2: si toccavano, un mucchio di sassi senza ingresso |
| scalinata del castello | 46 gradini identici con muretto continuo: una scala mobile |
| cascata | un velo trasparente senza shader resta un vetro piantato nel prato, in tre tentativi |
| palme | sfere schiacciate su un palo: broccoli |
| relitto | un cilindro marrone |
| case sull'albero | chiome a sfera singola, riconoscibili come sfere da ogni angolo |
| papera | tre palle e un cono; rifatta più dettagliata, tolta lo stesso |
| montagna del castello | tolta di conseguenza: un cono da 42 m con una terrazza sopra il nulla |

### 10.6 Punto aperto sull'isola

**Risolto nella v103: villaggio dei pescatori** (sezione 9.3). Attenzione: "nord" e
"ovest" qui sono nella convenzione vecchia (trappola 13): sulla minimappa è il basso a
destra. Il quadrante in alto a sinistra non era vuoto (Laguna, Casupole, Accampamento,
12 case). Testo originale:

**Il nord e l'ovest erano vuoti** dopo i tagli. Per un battle royale serve un motivo per
andare in quella metà. A Lorenzo è stato chiesto se vuole altro (villaggio di pescatori
sulla costa, rovine, miniera) o tenerla spoglia. **Non ha mai risposto.** Nella v93 le
case generate potrebbero aver già riempito quella zona: verificare prima di chiedere di
nuovo.

---

## 11. Storico versioni

**Gioco (linea vecchia)**: v58 due livelli di dettaglio · v59 lobby ferma e set nuovo · v60
illuminazione sul modello analitico · v61 caviglia corretta, supercampionamento,
micromovimenti · v62-v69 contrazione di spigoli, normali per angolo, isole UV, luce al
passaggio del mouse, cambio nome.

**Mappa (separata, poi fusa)**: v1-v2 prima isola · v3 laghi meno circolari, modelli neri
corretti · v4 pavimento della città e castello che fluttuava · v5 prato comune, luoghi
rifatti · v6 luoghi rimossi, nuvole e sole spostati, quota dell'acqua unificata, molo a
tavolato, barca ad assi, isolotto alzato.

**v70-v92**: fatte in altre chat, **non documentate qui**. A un certo punto il nome diventa
"Battlecraft" e l'isola entra nel gioco.

**v93**: accovacciamento nuovo, prova grafica PRIMA/DOPO, test in Node con Three.js r160.

**v94-v98**: fatte altrove; in questa chat è arrivata solo la v98 (sezione 9.1).

**v99-v102**: sezione 9.2.

**v103**: pavimenti distruttibili, villaggio dei pescatori, cielo dietro il bus,
espulsione sull'isola, scivolamento da accovacciati, primi render veri (sezione 9.3).

**v104**: musica della lobby all'apertura, icona con Amy, Home di iPhone (sezione 9.4).

**v105**: il castello di Lorenzo sulla cresta est, comandi del telefono (sezione 9.5).

**v106**: castello piu' basso, distruttibile, torri accessibili; sovrapposizioni e oggetti
attraversabili; piccone sui personaggi; pavimento sopra la testa (sezione 9.6).

**v107**: pozzo rifatto, piazzole sotto gli oggetti, muri del castello pieni coi tappi, pavimento sulla
rampa e novanta, comandi del telefono (sezione 9.7).

**v108**: deltaplano di Lorenzo con la vela che sventola, deltaplano cadendo da in alto, bus che
galleggia, pali di staccionata tolti attorno al castello (sezione 9.8).

**v109**: inventario a caselle (armi doppie, scambio, butta e riprendi), raccolta modulare, munizioni
senza tetto, bus audio delle armi, tappi del castello senza fessure, cespugli a terra (sezione 9.9).

**v110**: fase grafica 1 — curva ACES + grading, ciclo del giorno continuo (12 min, notte chiara), cielo col
sole e nuvole nuove, nebbia d'altezza, post-processing in Media/Alta (AO, bloom, FXAA), F3 con ms GPU (sezione 9.10).

**v111**: nome chiesto alla prima apertura, sparo automatico (opzione), scritta della versione in lobby
(sezione 9.11).

**v112**: fase grafica 2 — texture nuove generate sulla GPU (9 materiali con normal e rugosità), UV nel mondo,
triplanare sulle rocce, sporco alla base dei muri, schiuma sulle rive, normal del castello dal suo disegno; tappi del
castello spenti finché non serve (spariscono le "divisioni" sui muri) (sezione 9.12).

**v113**: logo nuovo di Lorenzo (martello + BATTLECRAFT in pietra) nella barra della lobby e nei caricamenti
(sezione 9.13).

**v114**: forzieri di Lorenzo con bottino casuale per rarità (comune/rara/epica/leggendaria, cambia il danno), medikit da
portare (3, tasto T, +50 in 2 s) (sezione 9.14).

**v115**: le auto di Lorenzo al posto delle vecchie, un colore per auto, 10 auto in più lungo i sentieri e accanto alle case (13 in tutto)
(sezione 9.15).

**v116**: multiplayer online — server Colyseus in `server/`, stanze da 2 con codice e link, l'altro giocatore animato dal sistema
esistente, nomi, riconnessione, validazione sul server, pubblicazione Vercel + Render (sezione 9.16, `docs/ONLINE.md`).

**v117**: multiplayer fase 2 — fino a 10 giocatori, spari e danni fra giocatori con la vita sul server, spari visibili,
eliminazioni; server a Francoforte (sezione 9.17).

**Prossima consegna: v118** (multiplayer fase 2b: partenza dal bus insieme + deltaplano visibile; poi costruzioni, poi bot).
