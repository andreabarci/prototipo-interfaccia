// Impostazioni del prototipo.
// Il token è quello PUBBLICO di Mapbox (inizia con "pk.").
// Finisce online insieme alla pagina: è normale per i token pubblici,
// ma va limitato agli indirizzi del progetto dal pannello di Mapbox.

const CONFIG = {
  mapboxToken: "pk.eyJ1IjoiYWJhcmNpIiwiYSI6ImNtdzBoMHIxNzFiejg0ZHM5M2h2ZzN0NzUifQ.Z8ZYG4KbaMFKViVYj9gk3Q",

  // Stile di base: per ora uno stile chiaro di Mapbox.
  // Quando disegnerai il tuo in Mapbox Studio, qui andrà il suo indirizzo
  // (mapbox://styles/<utente>/<id-stile>).
  mapStyle: "mapbox://styles/mapbox/light-v11",

  // Vista iniziale su Milano
  center: [9.19, 45.4642], // [longitudine, latitudine]
  zoom: 11.5
};
