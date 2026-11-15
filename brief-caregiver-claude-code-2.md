# Brief per Claude Code: pagina del caregiver, seconda versione

Questo brief aggiorna `brief-caregiver-claude-code-1.md`, che resta valido per tutto ciò che qui non cambia (domicilio, cerchio dei 15 minuti, rami, livello di presentazione). Dove i due brief non coincidono, vale questo.

## Ordine di lavoro

1. Riorganizzare la schermata: chat nella tendina sinistra, tendina destra sempre aperta con due tab (sezione «Impianto della schermata»).
2. Aggiornare `data/scenario-caregiver.json` con i dati nuovi (sezione «Dati dello scenario»).
3. Costruire il salvataggio e i pacchetti del tab «Consigliati».
4. Costruire la chat con le etichette correggibili e le tre risposte simulate.
5. Verificare che i sei stati della tesi si raggiungano con le interazioni normali (sezione «I sei stati»).
6. Aggiornare in `CLAUDE.md` la riga di `caregiver.html`, che oggi descrive la disposizione vecchia.

Come nel primo brief, niente pulsanti o indirizzi diretti per richiamare i singoli momenti: si aggiungono solo a progetto finito.

## Contesto

La pagina del caregiver esiste già (`caregiver.html`, `js/caregiver.js`) e realizza il primo brief. Questa versione cambia la disposizione delle tendine, introduce i servizi salvati dal figlio e i pacchetti di consigliati, e rende la chat più completa. La pagina del case manager non va toccata.

Resta un prototipo dimostrativo: niente backend, niente chiamate a modelli di linguaggio, niente login. La conversazione è simulata con testi scritti a mano.

## Scenario

Invariato: il figlio vive con il padre; domicilio condiviso a lat 45.4965, lon 9.1370, fisso al centro della mappa, con il cerchio dei 15 minuti a piedi.

Cambia il punto di partenza: il figlio usa lo strumento da prima e ha già salvato alcuni luoghi sanitari di base del padre. La proposta del case manager arriva come novità nel tab «Consigliati». Il prototipo mostra come il figlio, da qui, scopra le connessioni nel dominio sociale.

## Impianto della schermata

- **Tendina sinistra: la chat.** Comprimibile con un pulsante a freccia. Contiene lo scambio (domanda, risposte, etichette) e in basso la barra di testo con il pulsante di invio.
- **Centro: la mappa.** Invariata (domicilio fisso, cerchio dei 15 minuti).
- **Tendina destra: sempre aperta**, con due tab in alto:
  - **«I miei luoghi»** (attivo all'apertura): i servizi salvati dal figlio;
  - **«Consigliati»**: i pacchetti di servizi consigliati.
- **Scheda del marker.** Al clic su un marker, o su un nome nella chat, la tendina destra diventa la scheda del luogo: servizio, ente, indirizzo, tempo a piedi, descrizione, voci CANE, pulsante per salvare, selettore delle relazioni («Simili a questo» / «Anche per te»). Si esce con una «×» in alto e si torna al tab da cui si veniva. Il riquadro della conversazione in basso sulla mappa del primo brief sparisce.

## Tab «I miei luoghi»

- Lista per «servizio presso ente»: per ogni voce il servizio, l'ente, il tempo a piedi e le voci CANE a cui risponde.
- La lista coincide con i marker in evidenza sulla mappa quando questo tab è attivo. I marker dei consigliati qui non si vedono.
- All'apertura contiene due servizi già salvati (vedi «Dati dello scenario»).

## Tab «Consigliati»

Il tab raccoglie pacchetti di consigliati. Ogni pacchetto:
- si comprime e si apre con un clic sul titolo;
- si accende e si spegne sulla mappa a blocco, con un interruttore accanto al titolo;
- quando è acceso, mostra i suoi servizi sulla mappa con il marker «consigliato», di forma diversa da quella dei salvati.

Due tipi di pacchetto:

1. **«Dal case manager»**, con la data. Sotto il titolo, un breve commento scritto dal case manager (testo in «Dati dello scenario»). Poi la lista unica dei servizi proposti, ciascuno con la voce CANE; non c'è più la divisione «Per tuo padre» / «Per te» del primo brief.
2. **Un pacchetto per ogni ricerca in chat**, distinto dal primo. Titolo con le etichette CANE della ricerca e la data. A pacchetto aperto, sotto il titolo, un breve paragrafo in seconda persona che riassume la ricerca, poi la lista dei servizi trovati. Se il figlio corregge le etichette nella chat, il pacchetto si aggiorna: titolo, paragrafo e servizi seguono l'ultima risposta (una conversazione, un pacchetto).

## Salvare

- Dalla scheda del marker: pulsante «Salva».
- Dalla chat: un'icona a segnalibro accanto a ogni nome di servizio nella risposta.
- Un servizio salvato passa nel tab «I miei luoghi» ed esce dal pacchetto dei consigliati in cui si trovava.

## La chat

**Barra di testo.** A riposo mostra l'invito in grigio «Che cosa stai cercando?». Al clic sulla barra compare la domanda dello scenario; Andrea clicca invio e la conversazione parte.

> Cerco qualcosa vicino a casa per far muovere un po' mio padre e fargli incontrare altre persone.

**Arrivo della risposta.** Tre puntini di attesa per circa un secondo, poi il testo si compone parola per parola. Etichette, riga della fonte e marker compaiono a risposta finita.

**Etichette dei bisogni interpretati.** Sotto la risposta, una per bisogno, con il solo nome della voce CANE: «Attività diurne» e «Compagnia e relazioni sociali». Ogni etichetta ha una «×» funzionante: togliendola, la chat aggiunge in coda una nuova risposta (con attesa e testo progressivo) e il pacchetto della ricerca si aggiorna. Vanno preparate le correzioni per tutte e due le etichette.

**Riga della fonte.** In fondo a ogni risposta, piccola: «Dal repertorio dei servizi del territorio · gruppi di cammino ATS Milano».

**Nomi dei servizi nella risposta.**
- Hover sul nome: si accende il marker corrispondente; hover sul marker: si evidenzia il nome nella risposta.
- Clic sul nome: si apre la scheda del marker nella tendina destra; i rami restano spenti e si accendono solo dal selettore.
- Accanto a ogni nome, l'icona a segnalibro per salvare.

**Sulla mappa.** I servizi trovati compaiono come «consigliati», con la stessa forma dei consigliati del case manager.

La risposta non richiama la proposta del case manager.

## Dati dello scenario (ID del modello dati)

Tempi a piedi da calcolare con la funzione già esistente; tra parentesi i valori attesi da `tempi_domicilio_iniziale.json`.

**Già salvati all'apertura («I miei luoghi»)**

| Ente | ID ente | Servizio | Bisogni |
|---|---|---|---|
| Poliambulatorio P.le Accursio (11 min) | E027 | O0370@E027 Visite specialistiche ed esami ambulatoriali | B06 |
| Casa di comunità Monreale (37 min) | E110 | O0127-1 Punto di accesso e orientamento ai servizi sanitari e sociosanitari | B08, C01 |

**Pacchetto «Dal case manager»**

| Ente | ID ente | Servizio | Bisogno |
|---|---|---|---|
| Biblioteca comunale Villapizzone (15 min) | E273 | O0205 Gruppo di lettura | B16 |
| Biblioteca comunale Accursio (12 min) | E253 | O0165 Gruppo di lettura | B16 |
| Biblioteca comunale Gallaratese (27 min) | E250 | O0160-2 Incontri per caregiver | C02 |
| Centro di Psicologia e Pedagogia Sociosfera (22 min) | E045 | O0054 Supporto psicologico per caregiver | C02 |

Commento del case manager:

> Ti ho segnato due gruppi di lettura vicino a casa, dove tuo padre può passare del tempo in compagnia, e due possibilità di sostegno pensate per te. Ne parliamo al prossimo incontro.

**Relazioni** (invariate rispetto al primo brief), partendo da Villapizzone (E273):
- «Simili a questo»: verso E253 e E259 (Biblioteca comunale Dergano-Bovisa, O0177);
- «Anche per te»: verso E250, E045 e E203 (CDI Simone de' Beauvoir, O0361@E203).

**Risposta principale** (etichette: Attività diurne, Compagnia e relazioni sociali)

> Vicino a casa ci sono tre gruppi di cammino guidati da un volontario formato dall'ATS: a **Boldinasco**, a circa 5 minuti a piedi, al **Centro Ricreativo Culturale 77** di via Sapri, a circa 16, e al **Parco Montestella**, a circa 18. Sono camminate di gruppo all'aperto, che uniscono il movimento allo stare in compagnia.

Servizi: E359 (O0326, O0327), E358 (O0324, O0325), E357 (O0322, O0323). Rispetto al primo brief si aggiunge E358.

Paragrafo del pacchetto:

> Hai cercato attività vicino a casa per far muovere tuo padre e fargli incontrare altre persone. Sono emersi tre gruppi di cammino, il più vicino a Boldinasco.

**Correzione: tolta «Compagnia e relazioni sociali»** (resta Attività diurne)

> Se cerchi soprattutto un modo per far muovere tuo padre, oltre ai gruppi di cammino c'è il **Centro Aldini**, a circa 28 minuti a piedi, che propone ginnastica dolce, yoga e balli di gruppo, con iscrizione.

Servizi: i tre gruppi di cammino (solo le camminate O0326, O0324, O0322) più E344 (O0296).

Paragrafo del pacchetto:

> Hai cercato attività vicino a casa per far muovere tuo padre. Oltre ai gruppi di cammino, è emerso il Centro Aldini.

**Correzione: tolta «Attività diurne»** (resta Compagnia e relazioni sociali)

> Se cerchi soprattutto occasioni di compagnia, i gruppi di cammino restano le più vicine. A circa 13 minuti c'è anche il **centro diurno Simone de' Beauvoir**, dove tuo padre potrebbe passare la giornata con altre persone, con assistenza e attività di animazione; il servizio è a pagamento.

Servizi: i tre gruppi di cammino (solo la socializzazione O0327, O0325, O0323) più E203 (O0360@E203).

Paragrafo del pacchetto:

> Hai cercato occasioni di compagnia per tuo padre vicino a casa. Oltre ai gruppi di cammino, è emerso il centro diurno Simone de' Beauvoir.

Tutti questi dati stanno in `data/scenario-caregiver.json`, scritto a mano. I file generati dal modello dati non vanno toccati.

## Stati dei marker (classi o variabili raccolte in un unico punto, come nel primo brief)

- salvato (nel tab «I miei luoghi»);
- consigliato (pacchetti del tab «Consigliati», sia del case manager sia della chat);
- scoperto (trovato con le relazioni, per esempio Dergano-Bovisa e il CDI Simone de' Beauvoir);
- selezionato («servizio presso ente», con il fumetto);
- attenuato (tutti gli altri enti del repertorio).

La distinzione «per il padre» / «per il figlio» del primo brief non serve più sui marker. La grafica resta provvisoria e la decide Andrea.

## I sei stati della tesi

Devono restare raggiungibili con le interazioni normali, nella nuova disposizione:

- **Ricevere a**: clic sul tab «Consigliati»; il pacchetto «Dal case manager» è aperto e acceso, i suoi quattro servizi in evidenza sulla mappa.
- **Ricevere b**: hover su una voce del pacchetto (per esempio Biblioteca Gallaratese): marker in evidenza, linea tratteggiata dal domicilio con il tempo a piedi e l'icona della persona a piedi.
- **Esplorare a**: clic sul marker di Villapizzone: scheda del marker nella tendina destra, si accende «Simili a questo»; Accursio resta consigliato, Dergano-Bovisa compare come scoperto.
- **Esplorare b**: «Anche per te» nel selettore della scheda; come nel primo brief.
- **Conversare a**: domanda e risposta principale nella tendina sinistra; i tre gruppi di cammino compaiono come consigliati e nasce il pacchetto della ricerca.
- **Conversare b**: clic su «Boldinasco» nella risposta: scheda del marker nella tendina destra, nome evidenziato nella risposta, rami spenti.

La correzione delle etichette e il salvataggio sono possibilità in più del prototipo e non fanno parte di questi sei stati.

## Scelte ancora aperte (da chiedere ad Andrea, non da decidere)

- Con il tab «I miei luoghi» attivo, il resto del repertorio è attenuato come oggi o non compare affatto?
- Dopo una correzione, l'altra etichetta si può ancora togliere? Se sì, che cosa risponde la chat quando non resta nessuna etichetta?
- Le date dei pacchetti: quali date fisse usare per la proposta del case manager e per la ricerca in chat.
- Forma dei marker «salvato» e «consigliato», icona di salvataggio, aspetto delle etichette e dell'interruttore dei pacchetti.

## Da non fare

- Nessuna chiamata API a modelli di linguaggio.
- Nessuna scelta grafica definitiva.
- Nessuna modifica ai dati generati: tutto ciò che è inventato per lo scenario sta in `data/scenario-caregiver.json`.
- Nessuna modifica alla pagina del case manager e al livello di presentazione.
