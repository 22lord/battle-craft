# Il deltaplano (v108)

Sorgente: `Deltaplano-Laguna.glb` nella radice della repo (di Lorenzo, da Blender).
Nel gioco sta in `index.html` come `DELTAPLANO108_B64` (GLB compresso, ~260 KB di base64).

## Rifarlo dopo aver cambiato il modello

```
cd tools/castello && npm i && cd ../..     # serve meshoptimizer, lo prende da tools/castello
node tools/deltaplano/costruisci.cjs Deltaplano-Laguna.glb deltaplano.b64 --report
```

Poi sostituire il contenuto della costante `DELTAPLANO108_B64` in `index.html` con quello di
`deltaplano.b64` (riga lunga: non aprirla, usare uno script che cerca `const DELTAPLANO108_B64='`).

## Cosa fa

- applica traslazione e scala dei nodi (il modello non ha rotazioni)
- semplifica ogni oggetto con meshoptimizer: la vela poco (55%), perche' lo sventolamento la deforma nel
  vertex shader e servono vertici; sfere, cuciture e bordi molto (14-22%): in partita ci sono fino a 30
  deltaplani in aria. 56.800 -> 17.600 triangoli
- unisce per materiale (7 mesh), normali a 8 bit, niente uv (non ci sono texture)

## Cosa si aspetta il gioco dal modello

- +z e' il muso, y in su, metri
- le manopole stanno a x = +-0,35, y = 0 (`VELA108.presa`): li' vanno le mani
- la vela sta sopra y = 0,55: sotto (barra, montanti) lo shader non deforma
- lo sventolamento e' nullo verso il bordo d'attacco (z = 0,62) e massimo sul bordo d'uscita (z = -1,1);
  il fremito si annulla sulle cuciture a |x| = 0,29 / 0,85 / 1,41 / 1,97. Se cambia la forma della vela,
  vanno ritoccati i numeri in `VELA108_GLSL`
