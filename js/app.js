// Prototipo · primo caricamento dei dati.
// Mostra tutti gli enti geolocalizzati come punti; al clic la tendina destra
// elenca i servizi che si trovano presso quell'ente.
// Grafica provvisoria: colori, forme e testi verranno progettati dopo.

// La mappa parte solo dopo la password (vedi js/gate.js).
// Colori provvisori per macrodominio (da ridisegnare)
const COLORI = { sanitario: "#2f6f9f", sociosanitario: "#6a5ba8", sociale: "#2b8a7f" };

window.startApp = async function () {
  const mapEl = document.getElementById("map");
  const panelSx = document.getElementById("panel-sx");
  const panelDx = document.getElementById("panel-dx");

  if (!CONFIG.mapboxToken || CONFIG.mapboxToken.startsWith("INCOLLA")) {
    mapEl.innerHTML =
      '<p style="padding:24px">Manca il token di Mapbox: incollalo in <code>js/config.js</code>.</p>';
    return;
  }

  // ---------- dati
  const [bisogni, enti, servizi] = await Promise.all(
    ["data/bisogni.json", "data/enti.json", "data/servizi.json"].map((u) => fetch(u).then((r) => r.json()))
  );
  const bisognoById = Object.fromEntries(bisogni.map((b) => [b.id, b]));
  const enteById = Object.fromEntries(enti.map((e) => [e.id, e]));
  const serviziPerSede = {};
  for (const s of servizi) (serviziPerSede[s.sede] ||= []).push(s);

  const sulla_mappa = enti.filter((e) => e.lat != null);
  const geojson = {
    type: "FeatureCollection",
    features: sulla_mappa.map((e) => ({
      type: "Feature",
      id: Number(e.id.slice(1)),
      geometry: { type: "Point", coordinates: [e.lon, e.lat] },
      properties: { id: e.id, nome: e.nome, macro_dominio: e.macro_dominio, n_servizi: (serviziPerSede[e.id] || []).length },
    })),
  };

  // ---------- tendina sinistra: riepilogo provvisorio
  const conta = (k) => sulla_mappa.filter((e) => e.macro_dominio === k).length;
  panelSx.innerHTML = `
    <p class="eyebrow">Tendina sinistra</p>
    <p><b>${sulla_mappa.length}</b> enti sulla mappa su ${enti.length} nel repertorio,
       <b>${servizi.length}</b> servizi.</p>
    <ul class="legenda">
      <li><span class="pallino" style="background:${COLORI.sanitario}"></span>Sanitario (${conta("sanitario")})</li>
      <li><span class="pallino" style="background:${COLORI.sociosanitario}"></span>Sociosanitario (${conta("sociosanitario")})</li>
      <li><span class="pallino" style="background:${COLORI.sociale}"></span>Sociale (${conta("sociale")})</li>
    </ul>
    <p class="nota">Qui andranno la cartella della persona e i bisogni.</p>`;

  // ---------- mappa
  mapboxgl.accessToken = CONFIG.mapboxToken;
  const map = new mapboxgl.Map({
    container: "map", style: CONFIG.mapStyle, center: CONFIG.center, zoom: CONFIG.zoom, language: "it",
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

  map.on("load", () => {
    map.addSource("enti", { type: "geojson", data: geojson });
    map.addLayer({
      id: "enti-punti",
      type: "circle",
      source: "enti",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 14, 7],
        "circle-color": ["match", ["get", "macro_dominio"],
          "sanitario", COLORI.sanitario,
          "sociosanitario", COLORI.sociosanitario,
          "sociale", COLORI.sociale,
          "#888888"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": ["case", ["boolean", ["feature-state", "scelto"], false], 3, 1],
      },
    });

    let scelto = null;
    map.on("click", "enti-punti", (ev) => {
      const f = ev.features[0];
      if (scelto !== null) map.setFeatureState({ source: "enti", id: scelto }, { scelto: false });
      scelto = f.id;
      map.setFeatureState({ source: "enti", id: scelto }, { scelto: true });
      mostraEnte(f.properties.id);
    });
    map.on("mouseenter", "enti-punti", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "enti-punti", () => (map.getCanvas().style.cursor = ""));
  });

  // ---------- tendina destra: servizi presso l'ente
  function nomePromotore(p) {
    if (!p) return null;
    return enteById[p] ? enteById[p].nome : p;
  }
  function mostraEnte(id) {
    const e = enteById[id];
    const lista = serviziPerSede[id] || [];
    const righe = lista.map((s) => {
      const bis = s.bisogni.map((b) => (bisognoById[b] ? bisognoById[b].nome : b)).join(", ");
      const extra = [
        s.risposta === "O" ? "orienta" : "risponde",
        s.a_domicilio ? "a domicilio" : null,
        s.ente !== id ? "di " + (enteById[s.ente] ? enteById[s.ente].nome : s.ente) : null,
        s.promotore ? "promosso da " + nomePromotore(s.promotore) : null,
      ].filter(Boolean).join(" · ");
      return `<li><b>${s.titolo || "Servizio"}</b><br><span class="meta">${extra}</span><br><span class="bis">${bis}</span></li>`;
    }).join("");
    panelDx.innerHTML = `
      <p class="eyebrow">${e.categoria || ""}</p>
      <h2>${e.nome}</h2>
      <p class="meta">${e.indirizzo || ""}</p>
      <p class="eyebrow">${lista.length} servizi</p>
      <ul class="servizi">${righe}</ul>`;
  }
};
