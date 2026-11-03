// Prototipo · scenario A, Momento 1 ("La cartella della persona").
// Mostra il domicilio e tutti gli enti come punti; al clic la tendina destra
// elenca i servizi che si trovano presso quell'ente.
// Grafica provvisoria: colori, forme e testi verranno progettati dopo.

// La mappa parte solo dopo la password (vedi js/gate.js).
// Colori provvisori per macrodominio (da ridisegnare)
const COLORI = { sanitario: "#2f6f9f", sociosanitario: "#6a5ba8", sociale: "#2b8a7f" };

// Bisogni della cartella di questa persona (scenario A, vedi CLAUDE.md):
// B16 Compagnia e relazioni sociali (persona), C02 sofferenza psicologica (caregiver).
const BISOGNI_CARTELLA = ["B16", "C02"];

// Domicilio inventato, zona Monte Stella / QT8 — Municipio 8 di Milano.
// Non corrisponde a un indirizzo reale: vedi la regola sui dati in CLAUDE.md.
// Si può spostare scrivendo un indirizzo nella tendina sinistra.
let DOMICILIO = { lat: 45.4809, lon: 9.1385 };

window.startApp = async function () {
  const mapEl = document.getElementById("map");
  const appEl = document.getElementById("app");
  const panelSx = document.getElementById("panel-sx");
  const panelDxContent = document.getElementById("panel-dx-content");
  const panelDxClose = document.getElementById("panel-dx-close");

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

  // ---------- tendina sinistra: cartella della persona (domicilio e bisogni)
  const bisogniPersona = BISOGNI_CARTELLA.map((id) => bisognoById[id]).filter(Boolean);
  panelSx.innerHTML = `
    <p class="eyebrow">Cartella della persona</p>
    <p class="nota">Scenario A · persona e domicilio inventati per il prototipo.</p>

    <div class="blocco">
      <p class="eyebrow">Domicilio</p>
      <form class="domicilio-form" id="form-domicilio">
        <input type="text" id="domicilio-indirizzo" placeholder="Scrivi un indirizzo…" autocomplete="off">
        <button type="submit">Vai</button>
      </form>
      <p class="meta" id="domicilio-stato">Posizione attuale (inventata): ${DOMICILIO.lat.toFixed(4)}, ${DOMICILIO.lon.toFixed(4)}</p>
    </div>

    <div class="blocco">
      <p class="eyebrow">Bisogni espressi e validati</p>
      <ul class="bisogni">
        ${bisogniPersona.map((b) => `<li><span class="bis-dim">${b.dimensione}</span>${b.nome}</li>`).join("")}
      </ul>
    </div>`;

  // ---------- mappa
  mapboxgl.accessToken = CONFIG.mapboxToken;
  const map = new mapboxgl.Map({
    container: "map", style: CONFIG.mapStyle, center: CONFIG.center, zoom: CONFIG.zoom, language: "it",
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

  // Marker del domicilio: provvisorio, solo per distinguerlo dagli enti (icona definitiva da disegnare).
  const domicilioMarker = new mapboxgl.Marker({
    element: Object.assign(document.createElement("div"), { className: "domicilio-marker", title: "Domicilio" }),
    anchor: "bottom",
  }).setLngLat([DOMICILIO.lon, DOMICILIO.lat]).addTo(map);

  let scelto = null; // id numerico della feature "enti-punti" attualmente selezionata

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

    map.on("click", "enti-punti", (ev) => {
      const f = ev.features[0];
      if (scelto !== null) map.setFeatureState({ source: "enti", id: scelto }, { scelto: false });
      scelto = f.id;
      map.setFeatureState({ source: "enti", id: scelto }, { scelto: true });
      mostraEnte(f.properties.id);
    });
    map.on("mouseenter", "enti-punti", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "enti-punti", () => (map.getCanvas().style.cursor = ""));

    // Fumetto al passaggio del mouse: nome dell'ente.
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    map.on("mousemove", "enti-punti", (ev) => {
      const f = ev.features[0];
      popup.setLngLat(f.geometry.coordinates).setHTML(`<strong>${f.properties.nome}</strong>`).addTo(map);
    });
    map.on("mouseleave", "enti-punti", () => popup.remove());
  });

  // ---------- tendina destra: servizi presso l'ente (si apre solo con un marker selezionato)
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
    panelDxContent.innerHTML = `
      <p class="eyebrow">${e.categoria || ""}</p>
      <h2>${e.nome}</h2>
      <p class="meta">${e.indirizzo || ""}</p>
      <p class="eyebrow">${lista.length} servizi</p>
      <ul class="servizi">${righe}</ul>`;
    appEl.classList.remove("dx-closed");
  }

  panelDxClose.addEventListener("click", () => {
    appEl.classList.add("dx-closed");
    if (scelto !== null) {
      map.setFeatureState({ source: "enti", id: scelto }, { scelto: false });
      scelto = null;
    }
  });

  // ---------- domicilio: spostarlo scrivendo un indirizzo
  const formDomicilio = document.getElementById("form-domicilio");
  const inputIndirizzo = document.getElementById("domicilio-indirizzo");
  const statoDomicilio = document.getElementById("domicilio-stato");

  // Geocodifica con Mapbox, con preferenza per l'area di Milano.
  async function geocodifica(testo) {
    const url = "https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(testo) + ".json"
      + "?access_token=" + CONFIG.mapboxToken
      + "&language=it&limit=1&country=IT"
      + "&proximity=" + CONFIG.center[0] + "," + CONFIG.center[1]
      + "&bbox=9.01,45.38,9.33,45.55"; // area di Milano, per non trovare indirizzi altrove
    const risposta = await fetch(url);
    const dati = await risposta.json();
    return (dati.features && dati.features[0]) || null;
  }

  formDomicilio.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const testo = inputIndirizzo.value.trim();
    if (!testo) return;
    statoDomicilio.textContent = "Cerco…";
    let trovato;
    try {
      trovato = await geocodifica(testo);
    } catch {
      statoDomicilio.textContent = "Errore nella ricerca dell'indirizzo.";
      return;
    }
    if (!trovato) {
      statoDomicilio.textContent = "Indirizzo non trovato.";
      return;
    }
    const [lon, lat] = trovato.center;
    DOMICILIO = { lat, lon };
    domicilioMarker.setLngLat([lon, lat]);
    map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 14) });
    statoDomicilio.textContent = "Domicilio impostato: " + trovato.place_name;
  });
};
