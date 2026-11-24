# Contesto completo — gioco "Battlecraft" (ex "Battle Legends") con l'isola dentro

Documento di passaggio di consegne. Serve a riprendere in una chat nuova senza ripartire
da zero e senza rifare errori già pagati.

Autore: Lorenzo Deda (@22lordd), Napoli.
Stato al 24 novembre 2026: **battlecraft v106**, un solo file HTML (`index.html` nella repo). Gioco e isola sono
**fusi**: l'isola della vecchia "mappa" è il terreno della partita.

Versione del contesto: v7. Le v94-v97 non sono mai arrivate in chat:
le differenze v93→v98 sono in 9.1, v99→v102 in 9.2, v103 in 9.3, v104 in 9.4, v105 in 9.5, v106 in 9.6.

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
   stesso nome due volte. La prossima è la **v107**. Nella repo il file si chiama `index.html` e la
   versione sta in `VERSIONE`: le consegne fuori dalla repo restano `battlecraft-vNN.html`.
5. Gli archivi del modello che ha fornito **non contengono licenza**: da verificare sul
   sito di origine prima di qualsiasi pubblicazione.
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
risolvere questa cosa. il piccone non fa danni. posso rompere le mura del castello come su fortnite
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
- **licenza del modello**: da verificare prima di qualsiasi pubblicazione
- correggere la riga del LEGGIMI che nomina il riferimento (vincolo 1)

### Il prossimo passo logico

Con la sezione 3.1 molto si guarda da soli. Restano a Lorenzo: **l'audio** (suoni del
lancio v99, spari direzionali), **il telefono** (iPhone v101, mira assistita v100) e il
giudizio sulla **naturalezza del movimento** (accovacciato v103 compreso). Da chiedergli:
dove sono finite le texture dell'auto (`F:\` non esiste sul PC attuale) e da che sito
viene il modello (licenza).

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

**Prossima consegna: v107.**
