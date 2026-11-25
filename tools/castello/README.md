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

## Cosa fa in piu' dalla v107

- **muri pieni**: i muri sono due pareti sottili con ~2 m d'aria in mezzo e senza fondo. Il
  riempimento delle cavita' partiva dai bordi della griglia, che scende fino a -0,7 m: l'aria di
  fuori entrava nell'intercapedine passando sotto il piano del cortile e non scattava niente
  (rompendo la parete esterna si entrava nel muro). Ora sotto y = 0 i voxel vuoti fanno da barriera
  (senza diventare pieni). Le porte delle torri si liberano PRIMA del riempimento, se no l'interno
  delle torri risulterebbe chiuso. ~400k voxel riempiti, 18.522 scatole (erano 22.778)
- **tappi**: dove un voxel riempito tocca un voxel pieno di un altro blocco, il blocco riceve una
  faccia di pietra (`stone`, uv con la densita' del materiale) sul confine, rivolta verso l'altro.
  Finche' l'altro blocco c'e' resta chiusa dentro il muro; quando si rompe si vede pietra piena
  invece del vuoto. Rettangoli fusi per piano e agganciati ai piani veri dei blocchi: ~4.800
- le collisioni si calcolano prima della mesh (servono i tappi)
- per rifarlo: estrarre lo zip in una cartella qualsiasi (fuori dalla repo) e lanciare come sopra

## Cosa fa in piu' dalla v108

- **staccionata tagliata**: il quadrato `DENTRO` lasciava pali e traverse mozzati della staccionata
  dell'isoletta (davanti alla porta, sotto la torre di sud-ovest). Dopo il filtro si tolgono le
  componenti connesse piccole (< 1,5 m), che partono sotto 1 m e stanno a piu' di 22,5 m dal centro.
  4 pezzi, 316 triangoli. Le pietre e le finestre delle torri (sopra 1,2 m) e l'edera restano

## Cosa fa in piu' dalla v109

- **tappi fino alla parete**: i tappi partivano solo dai voxel interni del muro, ma la parete vera sta dentro
  il voxel di superficie: rotto un blocco, fra tappo e parete restava una fessura fino a 20 cm da cui si
  vedeva dentro il muro. Ora partono anche dai voxel di superficie che toccano l'interno dello stesso blocco.
  5.645 rettangoli (erano ~4.800), collisioni identiche (18.446 scatole, 348 blocchi). Dove la parete e' storta
  il tappo puo' sporgere di qualche cm
