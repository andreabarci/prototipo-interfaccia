// Avvio della mappa. Per ora serve solo a verificare che tutto funzioni:
// token, stile, caricamento dei dati e pubblicazione.

// La mappa parte solo dopo la password (vedi js/gate.js).
window.startApp = function () {
  const mapEl = document.getElementById("map");

  if (!CONFIG.mapboxToken || CONFIG.mapboxToken.startsWith("INCOLLA")) {
    mapEl.innerHTML =
      '<p style="padding:24px">Manca il token di Mapbox: incollalo in <code>js/config.js</code>.</p>';
    return;
  }

  mapboxgl.accessToken = CONFIG.mapboxToken;

  const map = new mapboxgl.Map({
    container: "map",
    style: CONFIG.mapStyle,
    center: CONFIG.center,
    zoom: CONFIG.zoom,
    language: "it"
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

  map.on("load", async () => {
    // Punto di prova: se lo vedi sulla mappa, il caricamento dei dati funziona.
    const res = await fetch("data/prova.geojson");
    const data = await res.json();

    map.addSource("prova", { type: "geojson", data });
    map.addLayer({
      id: "prova-punti",
      type: "circle",
      source: "prova",
      paint: {
        "circle-radius": 7,
        "circle-color": "#1d2428",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff"
      }
    });

    map.on("click", "prova-punti", (e) => {
      const p = e.features[0].properties;
      document.getElementById("panel-dx").innerHTML =
        '<p class="eyebrow">Tendina destra</p><p><b>' + p.nome + "</b></p>";
    });
    map.on("mouseenter", "prova-punti", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "prova-punti", () => (map.getCanvas().style.cursor = ""));
  });
};
