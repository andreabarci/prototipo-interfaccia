# Brief per Claude Code: lo stile della mappa del caregiver

## Obiettivo

La mappa del caregiver si rivolge a un cittadino, non a un professionista. Il piano cartografico deve dare un senso ambientale del territorio e un'atmosfera accogliente e tranquilla: il figlio deve scoprire il quartiere, fidarsi e sentirsi ascoltato. Questo brief riguarda solo lo stile di base della mappa (fondo, verde, acqua, edifici, strade, etichette, rilievo). Marker, rami, cerchio, tendine e chat non vanno toccati.

Lo stile non si disegna in Mapbox Studio ma diventa un file del progetto, generato da uno script, così ogni colore sta in un punto preciso, si vede subito su Go Live e resta nella storia di Git.

## Ordine di lavoro

1. Scrivere `strumenti/crea_stile_caregiver.py`, sul modello di `converti_dati.py`.
2. Lo script scarica lo stile classico **Outdoors** di Mapbox (`outdoors-v12`) attraverso la Styles API, usando il token pubblico già presente in `js/config.js`, e applica le regole di questo brief.
3. Il risultato si salva in `data/stile-caregiver.json`. **Il token non deve comparire nel file** né essere stampato in chat o nei log; sorgenti, sprite e glifi restano con gli indirizzi `mapbox://`.
4. In `js/config.js` lo stile unico diventa due voci, una per pagina:
   - caregiver: `data/stile-caregiver.json`;
   - case manager: lo stile attuale (`mapbox://styles/mapbox/light-v11`), che per ora non cambia.
   Aggiornare `caregiver.js` e `app.js` perché ciascuno legga la sua voce. Per il resto `config.js` non va modificato.
5. Aggiornare `CLAUDE.md` (struttura della cartella e riga di `config.js`).

Lavora su tutto senza fermarti a chiedere conferma passo per passo; Andrea rivedrà alla fine. Alla fine dai un elenco breve di che cosa hai fatto, delle scelte provvisorie e di come rigenerare lo stile. Niente commit né push finché Andrea non ha rivisto.

## La palette (A · Carta e salvia)

Tutti i colori stanno **in un unico dizionario in cima allo script**, con nomi in italiano, così Andrea può cambiarli e rilanciare lo script.

| Elemento | Colore |
|---|---|
| Fondo (terra) | `#F6F1E7` |
| Parchi, prati, boschi, verde urbano | `#DCE5C8` |
| Acqua (superfici e corsi) | `#CFE0E3` |
| Edifici | `#ECE4D6` |
| Vie residenziali e locali | `#FFFDF8` |
| Arterie, statali, tangenziali | `#EDE5D7` |
| Percorsi pedonali e sentieri | `#D2BF9C` |
| Ferrovia | `#A39A8E` |
| Etichette | `#8C8378` |
| Contorno delle etichette | colore del fondo |

Criteri dietro la palette, da rispettare se serve un colore in più: verdi verso il giallo e poco saturi, per non confondersi con il verde acqua del macrodominio sociale dei marker (`#2b8a7f`); acqua lontana dal blu del sanitario (`#2f6f9f`); nessun colore della base più saturo dei marker.

## Le regole, per gruppo di livelli

**Terra e acqua.** Fondo, verde e acqua con la palette. Tutte le categorie di verde (parchi, prati, boschi, giardini) sullo stesso colore o con differenze minime. Le altre aree d'uso del suolo (scuole, ospedali, aree industriali, cimiteri) vicine al fondo, senza colori propri.

**Rilievo.** Curve di livello e loro etichette spente. Ombreggiatura del rilievo tenuta con opacità molto bassa e ombra calda (un marrone chiaro, non grigio): deve leggersi appena il Monte Stella, nient'altro.

**Edifici.** Riempimento con la palette, piatti (niente 3D), bordo assente o appena più scuro.

**Rete stradale.** La gerarchia si rovescia verso la scala del pedone:
- vie residenziali e locali chiare (`#FFFDF8`), ben leggibili da vicino;
- arterie, statali e tangenziali con il colore attenuato (`#EDE5D7`) e un bordo appena più scuro del fondo: devono stare un passo indietro, non sparire;
- spenti i numeri delle strade, gli scudi delle autostrade e le frecce dei sensi unici.

**Percorsi a piedi.** Sentieri, aree pedonali, percorsi nei parchi: colore della palette, tratto sottile e tratteggiato. Le aree pedonali (piazze) leggibili come superfici, non solo come linee.

**Ferrovia e trasporti.** La ferrovia ben visibile (`#A39A8E`): per chi cammina è una barriera reale, per esempio tra Villapizzone e Bovisa. Si tengono le etichette delle stazioni e delle fermate della metropolitana, con lo stesso colore delle altre etichette.

**Etichette.**
- Colore e contorno con la palette.
- Nomi delle vie solo dallo zoom 15 in su.
- Nomi dei parchi in corsivo.
- Nomi dei quartieri tenuti, se Mapbox li ha per questa zona di Milano; quelli di città e regioni tenuti solo dove servono.
- Punti di interesse: spenti quasi tutti. Restano solo quelli che una persona usa per orientarsi: luoghi di culto, mercati, servizi pubblici (per esempio uffici postali e municipio), oltre alle stazioni già dette. Negozi, ristoranti e attività commerciali spenti. Le categorie vanno filtrate sul campo `class` dei punti di interesse; prima di scrivere il filtro controlla quali valori esistono davvero nei dati di questa zona e scegli quelli che corrispondono a questi tipi.
- Carattere: un carattere umanistico tra quelli disponibili nei glifi di Mapbox. Scegline uno provvisorio e indica nell'elenco finale due o tre alternative, così decide Andrea.

## Da non fare

- Nessuna modifica alla pagina del case manager oltre alla lettura della sua voce di stile in `config.js`.
- Nessuna modifica a marker, rami, cerchio, tendine e chat.
- Nessun lavoro ancora su velatura fuori dal cerchio, quartieri NIL, limiti di zoom e transizioni: arriveranno con un brief successivo.
- Il token non va mai scritto nei file generati né mostrato.
