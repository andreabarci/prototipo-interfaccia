# Brief per Claude Code: pagina del caregiver

## Ordine di lavoro

1. Spostare il domicilio nella pagina del case manager a lat 45.4965, lon 9.1370 (la casa è condivisa tra i due strumenti) e verificare che i tempi a piedi si ricalcolino.
2. Costruire la pagina del caregiver (questo brief), in cui i sei stati si raggiungono con le interazioni normali.
3. Costruire il livello di presentazione con le due schede per passare da uno strumento all'altro (sezione in fondo).

Non vanno costruiti ora pulsanti o indirizzi diretti per richiamare i singoli momenti: si aggiungeranno solo a progetto finito, quando i flussi di entrambi gli strumenti saranno definiti e funzionanti a mano.

## Contesto

Il repo contiene già il prototipo dello strumento del case manager: una pagina HTML con mappa Mapbox, file dati statici generati dal modello dati e calcolo dei tempi a piedi dal domicilio. Va aggiunta una seconda pagina, `caregiver.html`, che riusa la stessa base: stile della mappa, file dati e funzioni già esistenti (tempi a piedi, linee tratteggiate dal domicilio, marker «servizio presso ente», rami curvi). Non va modificata la pagina del case manager, se non per estrarre codice comune da condividere.

È un prototipo dimostrativo per una tesi: niente backend, niente chiamate a modelli di linguaggio reali, niente login. Le interazioni seguono uno scenario fisso.

## Scenario

Un figlio (il caregiver) vive con il padre anziano (la persona assistita). Il case manager ha condiviso con lui una proposta di servizi. Il figlio la consulta dal suo portale, la esplora e fa una domanda in linguaggio naturale.

Domicilio condiviso (inventato): lat 45.4965, lon 9.1370, tra Boldinasco e Villapizzone. Il domicilio resta fisso al centro della mappa.

## Dati dello scenario (ID del modello dati)

| Ruolo | Ente | ID ente | Offerta | Bisogno |
|---|---|---|---|---|
| Proposto per il padre | Biblioteca comunale Villapizzone | E273 | O0205 Gruppo di lettura | B16 |
| Proposto per il padre | Biblioteca comunale Accursio | E253 | O0165 Gruppo di lettura | B16 |
| Proposto per il figlio | Biblioteca comunale Gallaratese | E250 | O0160-2 Incontri per caregiver | C02 |
| Proposto per il figlio | Centro di Psicologia e Pedagogia Sociosfera | E045 | O0054 Supporto psicologico per caregiver | C02 |
| Simile (scoperto) | Biblioteca comunale Dergano-Bovisa | E259 | O0177 Gruppo di lettura | B16 |
| Anche per te (scoperto) | CDI Simone de' Beauvoir | E203 | O0361 Sollievo diurno a chi assiste | C02 |
| Conversazione (scoperto) | Gruppo di cammino ATS Boldinasco | E359 | O0326 / O0327 | B05, B16 |
| Conversazione (scoperto) | Gruppo di cammino ATS Parco Montestella | E357 | O0322 / O0323 | B05, B16 |

Relazioni dello scenario, partendo da Villapizzone (E273):
- «Simili a questo»: verso E253 e E259;
- «Anche per te»: verso E250, E045 e E203.

Se i legami esistono già nei file dati, usarli; altrimenti definire queste relazioni in un piccolo file a parte (`scenario-caregiver.json`).

## Impianto della schermata

- **Tendina sinistra**: la proposta del case manager, in due gruppi, «Per tuo padre» e «Per te». Ogni voce riporta servizio, ente e tempo a piedi da casa.
- **Centro**: la mappa, con il domicilio fisso e un cerchio di 15 minuti a piedi centrato sul domicilio (raggio da ricavare dalla stessa velocità usata per i tempi). Il cerchio non si sposta.
- **Tendina destra**: si apre al clic su un servizio e parla del luogo: servizio, ente, indirizzo, tempo a piedi, descrizione. Contiene il selettore delle relazioni con due voci, «Simili a questo» e «Anche per te».
- **Riquadro della conversazione**: in basso, sopra la mappa, a riposo finché non si scrive.

## Stati dei marker (da tenere come classi o variabili facilmente modificabili)

- proposto per il padre;
- proposto per il figlio;
- scoperto (trovato esplorando o conversando, non proposto dal case manager);
- selezionato («servizio presso ente», con il fumetto del servizio, come nella pagina del case manager);
- attenuato (tutti gli altri enti del repertorio).

La grafica di questi stati la decide Andrea: per ora vanno usati segni neutri e provvisori, raccolti in un unico punto del CSS, così da poterli ridisegnare senza toccare la logica.

## I sei stati da prototipare

**Ricevere a**: all'apertura i quattro servizi proposti sono in evidenza, gli altri attenuati, i rami spenti, la tendina sinistra aperta e quella destra chiusa.

**Ricevere b**: in hover su una voce «Per te» della tendina sinistra (per esempio Biblioteca Gallaratese), il marker corrispondente va in evidenza e compare la linea tratteggiata dal domicilio con il tempo a piedi e l'icona della persona a piedi. Vale anche in hover sul marker.

**Esplorare a**: al clic su un marker proposto (Villapizzone) il marker diventa «servizio presso ente», si apre la tendina destra e si accende «Simili a questo». Accursio resta nello stato «proposto»; Dergano-Bovisa compare come «scoperto».

**Esplorare b**: con «Anche per te» nel selettore, i rami simili si spengono e si accendono rami tratteggiati e tenui verso i servizi per il figlio, sia proposti (Gallaratese, Sociosfera) sia scoperti (CDI Simone de' Beauvoir). Accursio e Dergano-Bovisa tornano attenuati.

**Conversare a**: il figlio scrive nel riquadro e invia. Qualsiasi testo produce la stessa risposta simulata (con un breve ritardo, come se il sistema stesse scrivendo). Il campo è precompilato con la domanda dello scenario:

> Cerco qualcosa vicino a casa per far muovere un po' mio padre e fargli incontrare altre persone.

Risposta:

> Vicino a casa ci sono due gruppi di cammino guidati da un accompagnatore dell'ATS: a **Boldinasco**, a circa X minuti a piedi, e al **Parco Montestella**, a circa Y. Sono attività all'aperto che uniscono il movimento allo stare in compagnia.

X e Y vanno calcolati con la funzione dei tempi a piedi già esistente. Sotto la risposta compaiono due etichette con i bisogni interpretati, «Attività diurne · movimento» e «Compagnia». Sulla mappa i due gruppi di cammino vanno in evidenza come «scoperti», i proposti restano invariati, gli altri si attenuano, i rami sono spenti.

**Conversare b**: i nomi nella risposta sono cliccabili. Al clic su «Boldinasco» il marker diventa «servizio presso ente», il nome si evidenzia nella risposta e si apre la tendina destra sul luogo, con il selettore disponibile ma senza rami accesi.

Per tornare all'inizio serve un modo semplice per azzerare la pagina allo stato di Ricevere a (per esempio il clic su un'area vuota della mappa chiude tendina destra e rami; il ricaricamento della pagina riporta tutto all'apertura).

## Livello di presentazione (non fa parte dell'interfaccia)

Serve solo per mostrare il prototipo in sede di discussione della tesi; non appartiene a nessuno dei due strumenti.

Una pagina contenitore, `index.html`, carica (se la pagina del case manager si chiama già `index.html`, rinominarla, per esempio in `case-manager.html`, e aggiornare i riferimenti) le due pagine (case manager e caregiver), per esempio in due iframe, e ne mostra una alla volta. Passando dall'una all'altra, ciascuna resta nello stato in cui è stata lasciata.

In alto c'è una striscia minima, sul modello delle schede di un browser: alta circa 24 px, testo piccolo, colori neutri e bassa opacità, più leggibile al passaggio del mouse. Non deve competere visivamente con l'interfaccia né coprirne parti utili (la striscia sta sopra, le pagine sotto). Contiene soltanto due voci testuali, «Case manager» e «Caregiver», con quella attiva appena sottolineata. Nessun altro pulsante.

Scorciatoie di riserva, attive solo quando il cursore non è in un campo di testo:
- S per passare da uno strumento all'altro;
- H per nascondere o mostrare la striscia.

Il link pubblicato su GitHub Pages apre `index.html`, così chi riceve il link vede entrambi gli strumenti.

## Da non fare

- Nessuna chiamata API a modelli di linguaggio.
- Nessuna scelta grafica definitiva: colori, icone e forme dei nuovi stati restano provvisori.
- Nessuna modifica ai dati del modello: le relazioni dello scenario stanno nel file a parte.
