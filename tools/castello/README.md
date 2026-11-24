# Il castello (v105, rifatto nella v106)

Sorgente: `assets/castello/castello_cartoon_v3_obj.zip` (OBJ + texture, di Lorenzo).
Nel gioco sta in `index.html` come `CASTELLO105_B64` (GLB compresso, ~2,9 MB di base64).

## Rifarlo dopo aver cambiato il modello o le regolazioni

```
cd tools/castello
npm i                                   # meshoptimizer + sharp, node_modules ignorato da git
# estrarre lo zip in una cartella qualsiasi, poi:
node costruisci.cjs <cartella-con-obj> castello.b64 --report
```

Poi sostituire il contenuto della costante `CASTELLO105_B64` in `index.html` con quello di
`castello.b64` (riga lunga ~2,9 milioni di caratteri: non aprirla, usare uno script).

Regolazioni in cima a `costruisci.cjs`: `SCALA` (0,8), materiali tolti (prato, rocce, terra,
pini dell'isoletta volante), risoluzione delle texture, quanto semplificare, passo dei voxel
delle collisioni. Posizione e piazzola nel gioco: `CASTELLO105_POS` in `index.html`.

## Cosa fa in piu' dalla v106

- voxel delle collisioni a 20 cm (erano 35: le porte delle torri risultavano piu' strette del personaggio)
- porte delle torri al piano del cortile liberate: le colonne di legno si trovano dal modello
- blocchi distruttibili da 4 m (`BLOCCO`, origine `BLOCCO0` = -26 perche' i muri cavi stiano in un
  blocco solo, fisso sotto `ZOCCOLO` = 0,3 m): triangoli tagliati sui piani dei blocchi, vertici
  contigui per blocco, tabella `extras.blocchi`; ogni scatola di collisione ha un settimo valore,
  il blocco (-1 = fisso)
- `flagstone` e' solido: e' anche la faccia esterna dei muri, non solo il selciato
- normali precalcolate (8 bit), posizioni e uv a 16 bit (scala nel nodo e `extras.uvScala`)
