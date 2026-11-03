# Prototipo di tesi · strumento cartografico del case manager

## Chi lavora e come

- Il progetto è la tesi magistrale di Andrea (Design della Comunicazione, Politecnico di Milano). Il prototipo dimostra un'ipotesi di ricerca: non è un prodotto da costruire per intero.
- **Il progetto è di Andrea**: concept, interfaccia, elementi grafici, interazioni e revisione. Claude scrive il codice che li realizza. Non inventare scelte grafiche o di interazione non decise: se una scelta manca, proponi al massimo due o tre alternative brevi e chiedi.
- Andrea non è un programmatore. Scrivi in italiano, spiega in parole semplici cosa hai cambiato e come vederlo, senza gergo tecnico superfluo.
- **Una domanda alla volta.** Lavora a piccoli passi verificabili su Go Live, non riscrivere tutto in una volta.

## Struttura della cartella

- `index.html` · la pagina: tendina sinistra, mappa al centro, tendina destra
- `css/style.css` · stili (quelli attuali sono provvisori)
- `js/config.js` · token di Mapbox, stile e vista iniziale. **Non modificarlo e non stampare mai il token** in chat o nei log
- `js/gate.js` · schermata con password all'apertura (protezione di cortesia, non di sicurezza)
- `js/app.js` · logica della mappa; parte da `window.startApp()`, chiamata da gate.js dopo la password
- `data/` · dati generati, **da non modificare a mano**
- `strumenti/converti_dati.py` · rigenera `data/` dal file Numbers del modello dati

Tecnica: pagina statica, JavaScript senza framework né build, Mapbox GL JS v3.26 da CDN. Si prova con l'estensione Live Server ("Go Live", `http://127.0.0.1:5500`); aprire `index.html` con un doppio clic non carica i dati. Si pubblica con commit e push: GitHub Pages serve il sito su https://andreabarci.github.io/prototipo-tesi/.

Il repository è **pubblico**: niente dati personali di persone reali. La persona dello scenario e il suo domicilio sono inventati.

## I dati

Il modello dati originale è un file Numbers tenuto da Andrea fuori dal repository (oggi `modello-dati-v13.numbers`). Per aggiornare i dati:

```
pip install numbers-parser
python3 strumenti/converti_dati.py percorso/modello-dati-vXX.numbers
```

- `data/bisogni.json` · i 26 bisogni del CANE (`id` B01-B24 per la persona, C01-C02 per il caregiver; `nome`; `dimensione`)
- `data/enti.json` · 355 enti; 284 hanno `lat`/`lon` e vanno sulla mappa. Campi: `id`, `nome`, `indirizzo`, `macro_dominio` (sanitario, sociosanitario, sociale), `categoria` (13 categorie semplificate), `categoria_origine`, `telefono`, `sito`
- `data/servizi.json` · 890 servizi, cioè offerte presso un ente (le offerte di blocco di RSA, CDI, consultori, SSPT sono già moltiplicate per ente). Campi principali:
  - `ente` (chi offre), `sede` (dove si va: di solito coincide con l'ente), `a_domicilio`
  - `titolo`, `descrizione`, `tipo`, `soglia`, `costo`, `mandato_demenza`, `fonte`
  - `bisogni`: lista di id dei bisogni a cui il servizio risponde
  - `destinatario`: persona, caregiver, entrambi, cittadinanza, anziano generico
  - `risposta`: R se il servizio risponde al bisogno, O se orienta verso chi risponde
  - `promotore`: chi organizza il servizio, quando è diverso dall'ente che lo ospita (un id ente o un nome)

Regole del dato già decise: i servizi a domicilio (ADI, SAD, custodia sociale) non hanno marker; enti diversi possono avere le stesse coordinate (stesso edificio): la sovrapposizione si risolve nel disegno del marker, non nel dato.

## I concetti che il codice deve rispettare

- **Rete, ventaglio, percorso.** Rete: tutti gli enti. Ventaglio: gli enti con almeno un servizio pertinente al bisogno scelto. Percorso: la lettura che parte da un servizio scelto e ne mostra i legami.
- **Ente e servizio sono due facce dello stesso marker.** Il marker rappresenta l'ente; nel percorso diventa "servizio presso ente". L'ente non va mai trattato come marginale.
- **Due piani.** Il piano cartografico resta fermo: i marker non si spostano mai. Si riconfigura solo il piano relazionale (attenuazioni, rami).
- **Rami.** Archi astratti tra marker, non percorsi stradali. Un tipo di legame alla volta, con l'equivalenza come predefinita. Quattro tipi di legame tra servizi:
  - equivalenza funzionale: servizi che possono sostituirsi;
  - adiacenza di bisogno: servizi che rispondono a bisogni vicini, nello scenario A anche bisogni di due persone diverse della coppia;
  - successione: servizi che si susseguono nell'accesso (chi orienta o valuta viene prima);
  - incompatibilità: servizi che si escludono, con un trattamento grafico distinto dagli altri tre.
  Come calcolarli dai dati **non è ancora deciso**: proponi la regola ad Andrea prima di scriverla.

## Lo scenario A e i suoi momenti

Il case manager, alla scrivania, apre la cartella cartografica di una persona con demenza già valutata. Bisogni della cartella: la socialità della persona (B16, Compagnia e relazioni sociali) e il supporto psicologico al caregiver (C02). Sono dati il domicilio (inventato, nel Municipio 8) e i bisogni; nessun altro luogo segnato.

| N. | Momento | Azione in ingresso | Fase | Cosa succede |
|---|---|---|---|---|
| 1 | La cartella della persona | apertura della cartella | rete | Base con il domicilio; tutti i marker; rami spenti; tendina sinistra aperta con i bisogni, destra chiusa |
| 2 | La scelta del bisogno | clic su un bisogno (tendina sinistra) | ventaglio | Marker pertinenti invariati, non pertinenti attenuati (non spariscono) |
| 3 | L'esplorazione del ventaglio | hover su un marker pertinente | ventaglio | Fumetto con il servizio che rende pertinente l'ente |
| 4 | Il servizio di partenza | clic su un marker pertinente | percorso | Il marker diventa "servizio presso ente"; si accendono i rami di equivalenza; si apre la tendina destra con servizio, ente, altri bisogni della persona a cui risponde e il comando per il tipo di legame |
| 5 | Lettura e confronto dei legami | hover su un ramo | percorso | Ramo ed estremi in evidenza, altri attenuati; fumetto con tipo di legame e servizio all'altro capo |
| 6 | Il cambio del tipo di legame | comando nella tendina destra | percorso | Si spegne l'equivalenza, si accende l'adiacenza di bisogno; possono emergere servizi fuori dal ventaglio |

Regole già decise: un bisogno alla volta sulla mappa; i marker pertinenti mantengono colore e icona; colore del marker per macrodominio (tre colori), icona per categoria; il clic sul marker pertinente seleziona il servizio e accende l'equivalenza.

## Scelte ancora aperte (da chiedere ad Andrea, non da decidere)

- Forma del marker "servizio presso ente" e i tre stati nel percorso: servizio di partenza, collegato in evidenza, pertinente non collegato.
- Ente con due servizi pertinenti: come si sceglie quale far partire.
- Variabile grafica dei rami per tipo di legame.
- Stile della base cartografica, icone di categoria, colori definitivi.
- Segnale nella tendina sinistra per il bisogno raggiunto dai legami nel momento 6.
- Domicilio e enti reali dello scenario A.
