// Impostazioni del prototipo.
// Il token è quello PUBBLICO di Mapbox (inizia con "pk.").
// Finisce online insieme alla pagina: è normale per i token pubblici,
// ma va limitato agli indirizzi del progetto dal pannello di Mapbox.

const CONFIG = {
  mapboxToken: "pk.eyJ1IjoiYWJhcmNpIiwiYSI6ImNtdzBoMHIxNzFiejg0ZHM5M2h2ZzN0NzUifQ.Z8ZYG4KbaMFKViVYj9gk3Q",

  // Stile di base, uno per pagina.
  // Case manager: per ora uno stile chiaro di Mapbox.
  mapStyleCaseManager: "mapbox://styles/mapbox/light-v11",
  // Caregiver: file del progetto generato da strumenti/crea_stile_caregiver.py
  // (non modificarlo a mano: cambia la palette nello script e rilancialo).
  mapStyleCaregiver: "data/stile-caregiver.json",

  // Vista iniziale su Milano
  center: [9.19, 45.4642], // [longitudine, latitudine]
  zoom: 12,

  // Quanto ci si può allontanare/avvicinare
  minZoom: 11,
  maxZoom: 24
};
