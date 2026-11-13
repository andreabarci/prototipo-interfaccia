# Prototipo · strumenti cartografici del case manager e del caregiver

Prototipo esemplificativo della tesi magistrale in Design della Comunicazione (Politecnico di Milano, 2026). Mostra lo scenario A di due strumenti cartografici collegati: quello del case manager e quello del caregiver. Tutti i dati sono di esempio.

## Struttura

- `index.html` · il livello di presentazione: le due schede per passare da uno strumento all'altro
- `case-manager.html` / `caregiver.html` · i due strumenti, ciascuno nel suo iframe
- `css/style.css` · stili dei due strumenti (quelli di `index.html` sono inline, è una pagina a parte)
- `js/config.js` · token di Mapbox, stile e vista iniziale
- `js/condiviso.js` · funzioni comuni ai due strumenti
- `js/app.js` / `js/caregiver.js` · logica di ciascuno strumento
- `data/` · dati in JSON (solo dati di esempio, il repository è pubblico)

## Lavorare in locale

Aprire la cartella in Visual Studio Code e avviare la pagina con l'estensione Live Server ("Go Live"). Aprendo `index.html` con un doppio clic i dati in `data/` non si caricano.
