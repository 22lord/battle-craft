# Vedere il gioco renderizzato (dal PC di Lorenzo)

Dal 21/11/2026 si può. Nel cloud non c'era WebGL. Sul PC di Lorenzo **Edge headless usa la
GPU vera** (Intel UHD, ANGLE/D3D11), quindi luci, ombre e colori sono quelli che vede lui.
Il Chrome che si aspetta il plugin Playwright non è installato: questi script pilotano Edge,
che su Windows 11 c'è sempre.

## Preparazione (una volta)

```
cd tools/browser
npm i playwright-core@1.48.2      # node_modules è ignorato da git
```

## Uso

Servire il gioco dalla radice della repo (in background). Nella v107 `npx http-server` e' stato
bloccato dai permessi (scarica un pacchetto): basta un server statico di 10 righe in Node con
`http.createServer` + `fs.readFile` su 127.0.0.1:8123.

```
npx --yes http-server -p 8123 -s -c-1 .
```

Poi:

- **telecamera libera** su punti del mondo vero:
  `node tools/browser/vista.cjs <cartella-uscita> tools/browser/viste-villaggio.json`
  Ogni vista: `{name, cam:[x,y,z], at:[x,y,z], fov?, nofog?, js?}`. `nofog` toglie la
  foschia (solo per capire la disposizione: nel gioco c'è). `js` è codice eseguito prima
  dello scatto con `G` (il gioco) e `v` (la vista): per esempio rompere un tetto
  (`G.world.removeHarvestable(...)`) e guardare dentro.
- **telefono** (v105): `node tools/browser/touch.cjs <cartella-uscita>` emula un telefono in
  orizzontale (844×390, tocco): joystick mobile, raccolta toccando, sensibilità del trascinamento.
- **telefono v107**: `node tools/browser/touch107.cjs <cartella-uscita>`: tasti visibili in modalita'
  armi e costruzione, tasto salto, visuale che non si ferma passando sopra i tasti o partendo da un
  tasto, tocco sulla barra delle armi fuori dalla casella.
- **partita vera**: `node tools/browser/partita.cjs <cartella-uscita>` clicca Gioca e
  scatta durante il lancio (bus, caduta, deltaplano, atterraggio). Stampa stato,
  posizione ed errori della console.

Orientamento della minimappa: **alto = +z, sinistra = +x**.

## Cosa NON dicono

- Gli scatti sono 1280×720 a una qualità fissa: gli FPS del browser headless non sono
  quelli del gioco vero.
- Se gira un altro processo pesante (la suite di test) il browser rallenta e il tempo di
  gioco scorre lento: "Partenza tra 3" dopo 12 s non è un bug.
- Non si sente l'audio. Il telefono è solo emulato (`touch.cjs`): niente dita vere, niente Safari.
