# Brief per Claude Code: il cerchio del quartiere

Secondo brief sul piano cartografico del caregiver, dopo `brief-mappa-caregiver-claude-code-1.md` (lo stile). Riguarda solo la pagina del caregiver.

## Obiettivo

Il cerchio intorno al domicilio diventa il «quartiere» del caregiver. Oggi il cerchio è grigio e fuori ha il colore naturale; va rovesciato. Dentro il cerchio la mappa deve essere più viva e luminosa, fuori più tenue. Il messaggio è che ciò che è vicino è qui e il resto della città resta come contesto, senza pesare.

Lavora su tutto senza fermarti a chiedere conferma passo per passo; Andrea rivedrà alla fine. Alla fine dai un elenco breve di che cosa hai fatto e delle scelte provvisorie. Niente commit né push finché Andrea non ha rivisto.

## Il cerchio

Resta un **cerchio geometrico** centrato sul domicilio, dichiaratamente approssimato (non un'isocrona). Il raggio si ricava dai minuti con la stessa velocità implicita nei tempi già calcolati, circa 83 metri al minuto (oggi `RAGGIO_15_MIN_METRI = 1245` in `caregiver.js`). La costante dei 15 minuti va sostituita da un calcolo minuti → metri.

Tre elementi, in quest'ordine dal basso:

1. **Velo esterno.** Una superficie che copre tutta la mappa tranne il cerchio (un poligono con il cerchio come foro), riempita con il colore del fondo dello stile (`#F6F1E7`) all'**opacità 35% circa**. Fuori dal cerchio strade, parchi e nomi restano leggibili, ma un passo indietro.
2. **Luce calda interna.** Il cerchio riempito con una velatura dorata molto tenue, come una zona illuminata dal sole. Valore provvisorio da regolare a occhio, per esempio un oro chiaro intorno a `#F5D9A0` con opacità bassa (10-15%). Non deve cambiare la lettura dei colori della palette, solo scaldarli.
3. **Bordo tratteggiato.** Linea sottile tratteggiata nel colore delle etichette dello stile (`#8C8378`), come quella di oggi: dice che il confine è una stima, non un limite reale.

Il grigio attuale dentro il cerchio va tolto.

I tre elementi stanno sopra i livelli dello stile di base e **sotto** tutto ciò che è informazione: marker, rami, linee tratteggiate del tempo a piedi, fumetti, domicilio.

Tutti i valori (opacità del velo, colore e opacità della luce, colore, spessore e tratteggio del bordo) vanno raccolti in costanti in cima a `caregiver.js`, insieme agli altri valori provvisori, così Andrea li può ritoccare.

## I marker

Tutti i marker della rete tornano visibili e **attenuati come prima**, in ogni tab (anche in «I miei luoghi»). L'attenuazione è la stessa dentro e fuori dal cerchio: il cerchio agisce solo sul piano cartografico e i marker non cambiano quando cambia il raggio (principio dei due piani). Gli altri stati (salvato, consigliato, scoperto, selezionato) restano come sono.

## Il controllo del raggio

- Una **pillola** sulla mappa, in basso a destra, accanto alla tendina destra senza toccarla: «−  15 min a piedi  +». Si può usare l'icona della persona a piedi già presente in `condiviso.js`.
- Valori: **5, 10, 15, 20, 25, 30 minuti**, a passi di 5. Valore iniziale **15**.
- Ai due estremi il pulsante corrispondente resta cliccabile ma non fa nulla e appare più tenue (niente pulsanti disabilitati).
- Stile sobrio e coerente con le tendine: fondo chiaro, testo piccolo, nessun colore forte.

## Il cambio del raggio

Al clic su − o +:
- il cerchio si allarga o si stringe con una **transizione morbida** (circa mezzo secondo), con velo, luce e bordo che si muovono insieme;
- nello stesso tempo la vista si adatta per contenere tutto il cerchio, tenendo conto dello spazio occupato dalle due tendine, con un movimento lento e morbido.

Il raggio è solo visivo: non filtra marker né servizi, e non cambia i testi della chat, che riportano i minuti di ciascun servizio.

## Da non fare

- Nessuna isocrona e nessuna chiamata a servizi esterni per il cerchio.
- Nessuna modifica alla pagina del case manager.
- Nessuna modifica a tendine, chat e logica degli stati dei marker, oltre al ritorno degli attenuati descritto sopra.
- Nessuna scelta grafica definitiva: tutti i valori restano provvisori e raccolti in costanti.
