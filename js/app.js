// Prototipo · scenario A, Momento 1 ("La cartella della persona").
// Mostra il domicilio e tutti gli enti come punti; al clic la tendina destra
// elenca i servizi che si trovano presso quell'ente.
// Grafica provvisoria: colori, forme e testi verranno progettati dopo.

// La mappa parte solo dopo la password (vedi js/gate.js).
// Colori provvisori per macrodominio (da ridisegnare)
const COLORI = { sanitario: "#2f6f9f", sociosanitario: "#6a5ba8", sociale: "#2b8a7f" };
// Colore provvisorio per i marker che raggruppano enti di macrodomini diversi sullo stesso punto.
const COLORE_CLUSTER = "#44484c";
// Opacità dei marker non pertinenti al bisogno scelto (attenuati, non spariscono).
const OPACITA_ATTENUATA = 0.1;

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

  // Enti diversi possono avere le stesse coordinate (stesso edificio): si raggruppano in un unico
  // marker, con il numero di enti sovrapposti; al clic si scegli a quale accedere (vedi CLAUDE.md).
  const gruppiMap = new Map();
  for (const e of sulla_mappa) {
    const chiave = e.lat.toFixed(6) + "," + e.lon.toFixed(6);
    if (!gruppiMap.has(chiave)) gruppiMap.set(chiave, []);
    gruppiMap.get(chiave).push(e);
  }
  const gruppiArray = Array.from(gruppiMap.values());

  const geojson = {
    type: "FeatureCollection",
    features: gruppiArray.map((gruppo, i) => {
      const domini = new Set(gruppo.map((e) => e.macro_dominio));
      return {
        type: "Feature",
        id: i,
        geometry: { type: "Point", coordinates: [gruppo[0].lon, gruppo[0].lat] },
        properties: {
          conta: gruppo.length,
          macro_dominio: domini.size === 1 ? gruppo[0].macro_dominio : "misto",
        },
      };
    }),
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
        ${bisogniPersona.map((b) => `
          <li>
            <button type="button" class="bisogno-btn" data-id="${b.id}">
              <span class="bis-dim">${b.dimensione}</span>${b.nome}
            </button>
          </li>`).join("")}
      </ul>
    </div>`;

  // Enti (sede) che hanno almeno un servizio pertinente a ciascun bisogno: definisce il ventaglio.
  const sediPerBisogno = {};
  for (const s of servizi) {
    for (const b of s.bisogni) (sediPerBisogno[b] ||= new Set()).add(s.sede);
  }

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
        "circle-radius": ["interpolate", ["linear"], ["zoom"],
          10, ["case", [">", ["get", "conta"], 1], 6, 3.5],
          14, ["case", [">", ["get", "conta"], 1], 10, 7]],
        "circle-color": ["match", ["get", "macro_dominio"],
          "sanitario", COLORI.sanitario,
          "sociosanitario", COLORI.sociosanitario,
          "sociale", COLORI.sociale,
          "misto", COLORE_CLUSTER,
          "#888888"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": ["case", ["boolean", ["feature-state", "scelto"], false], 3, 1],
        "circle-opacity": ["case", ["boolean", ["feature-state", "attenuato"], false], OPACITA_ATTENUATA, 1],
        "circle-stroke-opacity": ["case", ["boolean", ["feature-state", "attenuato"], false], OPACITA_ATTENUATA, 1],
      },
    });

    // Numero di enti raggruppati su uno stesso punto (visibile solo quando sono più di uno).
    map.addLayer({
      id: "enti-numero",
      type: "symbol",
      source: "enti",
      filter: [">", ["get", "conta"], 1],
      layout: {
        "text-field": ["to-string", ["get", "conta"]],
        "text-size": 11,
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-opacity": ["case", ["boolean", ["feature-state", "attenuato"], false], OPACITA_ATTENUATA, 1],
      },
    });

    function selezionaMarker(featureId, enteId) {
      if (scelto !== null) map.setFeatureState({ source: "enti", id: scelto }, { scelto: false });
      scelto = featureId;
      map.setFeatureState({ source: "enti", id: scelto }, { scelto: true });
      mostraEnte(enteId);
    }

    // Più enti sullo stesso punto: un popup fa scegliere a quale accedere.
    const popupScelta = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12 });
    function apriSceltaEnte(f, gruppo) {
      const el = document.createElement("div");
      el.innerHTML = '<p class="eyebrow">Scegli l\'ente</p>';
      const lista = document.createElement("ul");
      lista.className = "scelta-ente__lista";
      for (const e of gruppo) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = e.nome;
        btn.addEventListener("click", () => {
          selezionaMarker(f.id, e.id);
          popupScelta.remove();
        });
        li.appendChild(btn);
        lista.appendChild(li);
      }
      el.appendChild(lista);
      popupScelta.setLngLat(f.geometry.coordinates).setDOMContent(el).addTo(map);
    }

    map.on("click", "enti-punti", (ev) => {
      const f = ev.features[0];
      const gruppo = gruppiArray[f.id];
      if (gruppo.length === 1) selezionaMarker(f.id, gruppo[0].id);
      else apriSceltaEnte(f, gruppo);
    });
    map.on("mouseenter", "enti-punti", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "enti-punti", () => (map.getCanvas().style.cursor = ""));

    // Fumetto al passaggio del mouse: nome dell'ente (o degli enti, se più di uno sullo stesso punto).
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    map.on("mousemove", "enti-punti", (ev) => {
      const f = ev.features[0];
      const gruppo = gruppiArray[f.id];
      const html = gruppo.length === 1
        ? `<strong>${gruppo[0].nome}</strong>`
        : `<strong>${gruppo.length} enti in questo edificio</strong><br>${gruppo.map((e) => e.nome).join("<br>")}`;
      popup.setLngLat(f.geometry.coordinates).setHTML(html).addTo(map);
    });
    map.on("mouseleave", "enti-punti", () => popup.remove());

    // ---------- ventaglio: clic su un bisogno nella tendina sinistra
    // Un bisogno alla volta: i marker pertinenti restano come sono, gli altri si attenuano (non spariscono).
    let bisognoSelezionato = null;
    const bottoniBisogno = document.querySelectorAll(".bisogno-btn");

    function selezionaBisogno(id) {
      bisognoSelezionato = bisognoSelezionato === id ? null : id;
      const pertinenti = bisognoSelezionato ? (sediPerBisogno[bisognoSelezionato] || new Set()) : null;
      gruppiArray.forEach((gruppo, i) => {
        // Basta un ente pertinente nel gruppo per tenere acceso il marker che li rappresenta tutti.
        const attenuato = pertinenti ? !gruppo.some((e) => pertinenti.has(e.id)) : false;
        map.setFeatureState({ source: "enti", id: i }, { attenuato });
      });
      bottoniBisogno.forEach((btn) => btn.classList.toggle("attivo", btn.dataset.id === bisognoSelezionato));
    }

    bottoniBisogno.forEach((btn) => btn.addEventListener("click", () => selezionaBisogno(btn.dataset.id)));
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
