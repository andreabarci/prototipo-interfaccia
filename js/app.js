// Prototipo · scenario A, Momento 1 ("La cartella della persona").
// Mostra il domicilio e tutti gli enti come punti; al clic la tendina destra
// elenca i servizi che si trovano presso quell'ente.
// Grafica provvisoria: colori, forme e testi verranno progettati dopo.

// La mappa parte solo dopo la password (vedi js/gate.js).
// Colori provvisori per macrodominio (da ridisegnare)
const COLORI = { sanitario: "#2f6f9f", sociosanitario: "#6a5ba8", sociale: "#2b8a7f" };
// Colore di riserva (dalla palette dell'interfaccia, vedi --ink-2 in css/style.css), usato solo se
// un ente scelto dentro un cluster non ha un macrodominio riconosciuto.
const COLORE_CLUSTER = "#5a666e";
// Opacità dei marker non pertinenti al bisogno scelto (attenuati, non spariscono).
const OPACITA_ATTENUATA = 0.1;

// Taglie condivise fra marker singoli, cluster e stato selezionato: un'unica fonte di verità, così
// un cluster a riposo e un marker selezionato risultano sempre identici (stessa taglia, stesso bordo).
const RAGGIO_NORMALE = { 10: 3.5, 14: 7 }; // marker singolo a riposo, per fermata di zoom
const FATTORE_GRANDE = 2.5; // quanto più grandi sono i cluster e i marker selezionati rispetto al normale
const RAGGIO_GRANDE = { 10: RAGGIO_NORMALE[10] * FATTORE_GRANDE, 14: RAGGIO_NORMALE[14] * FATTORE_GRANDE };
const BORDO_NORMALE = 1.5;
const BORDO_GRANDE = 3;

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

  // Per ogni cluster, quanti enti per macrodominio: serve per disegnare la "torta" del marker.
  function conteggiDominio(gruppo) {
    const c = { sanitario: 0, sociosanitario: 0, sociale: 0, altro: 0 };
    for (const e of gruppo) {
      if (c[e.macro_dominio] !== undefined) c[e.macro_dominio]++;
      else c.altro++;
    }
    return c;
  }
  function nomeTorta(c) {
    return "torta-" + c.sanitario + "-" + c.sociosanitario + "-" + c.sociale + "-" + c.altro;
  }

  // Immagini da generare (una per ogni diversa composizione di cluster) e passare a map.addImage.
  const torteDaGenerare = new Map(); // nome immagine -> conteggi

  const geojson = {
    type: "FeatureCollection",
    features: gruppiArray.map((gruppo, i) => {
      if (gruppo.length === 1) {
        return {
          type: "Feature",
          id: i,
          geometry: { type: "Point", coordinates: [gruppo[0].lon, gruppo[0].lat] },
          properties: { conta: 1, macro_dominio: gruppo[0].macro_dominio, icona: null },
        };
      }
      const conteggi = conteggiDominio(gruppo);
      const icona = nomeTorta(conteggi);
      torteDaGenerare.set(icona, conteggi);
      return {
        type: "Feature",
        id: i,
        geometry: { type: "Point", coordinates: [gruppo[0].lon, gruppo[0].lat] },
        properties: { conta: gruppo.length, macro_dominio: null, icona },
      };
    }),
  };

  // Disegna la "torta" di un cluster su un canvas: una fetta colorata per enti dello stesso
  // macrodominio, bordo bianco come gli altri marker. Il numero è un livello separato (enti-numero).
  // Il canvas rappresenta, a icon-size 1, esattamente RAGGIO_GRANDE (vedi icon-size più sotto):
  // il bordo bianco è un anello interno di spessore BORDO_GRANDE, così il raggio totale e il bordo
  // combaciano esattamente con quelli dei marker a tinta piena (nessun margine a parte).
  const PIXELRATIO_TORTA = 2;
  const RISOLUZIONE_TORTA = 128; // px fisici del canvas (pixelRatio 2 → 64 px logici a icon-size 1)
  function disegnaTorta(conteggi) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = RISOLUZIONE_TORTA;
    const ctx = canvas.getContext("2d");
    const centro = RISOLUZIONE_TORTA / 2; // raggio esterno totale (bordo incluso), in px fisici
    const bordoPx = BORDO_GRANDE * PIXELRATIO_TORTA;
    const raggioFetta = centro - bordoPx; // la parte colorata, prima del bordo
    const fette = [
      ["sanitario", COLORI.sanitario],
      ["sociosanitario", COLORI.sociosanitario],
      ["sociale", COLORI.sociale],
      ["altro", "#888888"],
    ];
    const totale = conteggi.sanitario + conteggi.sociosanitario + conteggi.sociale + conteggi.altro || 1;
    let angolo = -Math.PI / 2;
    for (const [chiave, colore] of fette) {
      const n = conteggi[chiave];
      if (!n) continue;
      const quota = (n / totale) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centro, centro);
      ctx.arc(centro, centro, raggioFetta, angolo, angolo + quota);
      ctx.closePath();
      ctx.fillStyle = colore;
      ctx.fill();
      angolo += quota;
    }
    // Bordo bianco: anello esterno, da raggioFetta a centro (spessore BORDO_GRANDE).
    ctx.beginPath();
    ctx.arc(centro, centro, centro - bordoPx / 2, 0, Math.PI * 2);
    ctx.lineWidth = bordoPx;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    return ctx.getImageData(0, 0, RISOLUZIONE_TORTA, RISOLUZIONE_TORTA);
  }

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
    for (const [nome, conteggi] of torteDaGenerare) {
      if (!map.hasImage(nome)) map.addImage(nome, disegnaTorta(conteggi), { pixelRatio: PIXELRATIO_TORTA });
    }

    // Taglia condivisa: un marker normale a riposo è la base; un cluster a riposo (conta > 1) e un
    // marker selezionato (scelto, singolo o dentro un cluster) sono entrambi RAGGIO_GRANDE — non in
    // proporzione a quanti enti raggruppa il cluster. Lo spazio in più sul selezionato ospiterà una
    // piccola icona dell'ente, ancora da disegnare.
    const grande = ["any", ["boolean", ["feature-state", "scelto"], false], [">", ["get", "conta"], 1]];
    const raggio = ["interpolate", ["linear"], ["zoom"],
      10, ["case", grande, RAGGIO_GRANDE[10], RAGGIO_NORMALE[10]],
      14, ["case", grande, RAGGIO_GRANDE[14], RAGGIO_NORMALE[14]]];
    const opacitaAttenuabile = ["case", ["boolean", ["feature-state", "attenuato"], false], OPACITA_ATTENUATA, 1];

    // Ombra leggera sotto ogni marker e cluster, per distinguerli dal piano della mappa.
    map.addLayer({
      id: "enti-ombra",
      type: "circle",
      source: "enti",
      paint: {
        "circle-radius": raggio,
        "circle-color": "#000000",
        "circle-blur": 0.7,
        "circle-translate": [1, 2],
        "circle-opacity": ["case", ["boolean", ["feature-state", "attenuato"], false], 0.03, 0.22],
      },
    });

    // Marker singoli: un ente per punto, colorato per macrodominio.
    map.addLayer({
      id: "enti-punti",
      type: "circle",
      source: "enti",
      filter: ["==", ["get", "conta"], 1],
      paint: {
        "circle-radius": raggio,
        "circle-color": ["match", ["get", "macro_dominio"],
          "sanitario", COLORI.sanitario,
          "sociosanitario", COLORI.sociosanitario,
          "sociale", COLORI.sociale,
          "#888888"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": ["case", ["boolean", ["feature-state", "scelto"], false], BORDO_GRANDE, BORDO_NORMALE],
        "circle-opacity": opacitaAttenuabile,
        "circle-stroke-opacity": opacitaAttenuabile,
      },
    });

    // Cluster a riposo: la "torta" dei macrodomini raggruppati (immagine disegnata sopra).
    // L'immagine è disegnata a icon-size 1 con raggio esterno RISOLUZIONE_TORTA/2 fisici (64 logici,
    // pixelRatio 2): l'icon-size qui sotto la scala esattamente a RAGGIO_GRANDE, in modo che il
    // cluster risulti sempre della stessa taglia (e stesso bordo) di un marker selezionato.
    map.addLayer({
      id: "enti-cluster-torta",
      type: "symbol",
      source: "enti",
      filter: [">", ["get", "conta"], 1],
      layout: {
        "icon-image": ["get", "icona"],
        "icon-size": ["interpolate", ["linear"], ["zoom"],
          10, RAGGIO_GRANDE[10] / 32,
          14, RAGGIO_GRANDE[14] / 32],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        // Si nasconde quando un ente del gruppo è scelto: prende il suo posto il marker a tinta piena.
        "icon-opacity": ["case",
          ["boolean", ["feature-state", "scelto"], false], 0,
          ["boolean", ["feature-state", "attenuato"], false], OPACITA_ATTENUATA,
          1],
      },
    });

    // Cluster scelto: un ente del gruppo è stato scelto dal popup, il suo colore copre la torta.
    map.addLayer({
      id: "enti-cluster-scelto",
      type: "circle",
      source: "enti",
      filter: [">", ["get", "conta"], 1],
      paint: {
        "circle-radius": raggio,
        "circle-color": ["feature-state", "coloreScelto"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": BORDO_GRANDE,
        "circle-opacity": ["case", ["boolean", ["feature-state", "scelto"], false], 1, 0],
        "circle-stroke-opacity": ["case", ["boolean", ["feature-state", "scelto"], false], 1, 0],
      },
    });

    // Numero di enti raggruppati su uno stesso punto, al centro della torta, scritto in bianco.
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
        // Se un ente del gruppo è selezionato, il numero si nasconde: il marker di quell'ente
        // copre temporaneamente lo stack, finché non si deseleziona o si chiude la tendina destra.
        "text-opacity": ["case",
          ["boolean", ["feature-state", "scelto"], false], 0,
          ["boolean", ["feature-state", "attenuato"], false], OPACITA_ATTENUATA,
          1],
      },
    });

    const LAYER_ENTI = ["enti-punti", "enti-cluster-torta", "enti-cluster-scelto"];

    function selezionaMarker(featureId, ente) {
      if (scelto !== null) map.setFeatureState({ source: "enti", id: scelto }, { scelto: false, coloreScelto: null });
      scelto = featureId;
      map.setFeatureState({ source: "enti", id: scelto }, { scelto: true, coloreScelto: COLORI[ente.macro_dominio] || COLORE_CLUSTER });
      mostraEnte(ente.id);
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
          selezionaMarker(f.id, e);
          popupScelta.remove();
        });
        li.appendChild(btn);
        lista.appendChild(li);
      }
      el.appendChild(lista);
      popupScelta.setLngLat(f.geometry.coordinates).setDOMContent(el).addTo(map);
    }

    map.on("click", LAYER_ENTI, (ev) => {
      const f = ev.features[0];
      const gruppo = gruppiArray[f.id];
      if (gruppo.length === 1) selezionaMarker(f.id, gruppo[0]);
      else apriSceltaEnte(f, gruppo);
    });
    map.on("mouseenter", LAYER_ENTI, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", LAYER_ENTI, () => (map.getCanvas().style.cursor = ""));

    // Fumetto al passaggio del mouse: nome dell'ente (o degli enti, se più di uno sullo stesso punto).
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    map.on("mousemove", LAYER_ENTI, (ev) => {
      const f = ev.features[0];
      const gruppo = gruppiArray[f.id];
      const html = gruppo.length === 1
        ? `<strong>${gruppo[0].nome}</strong>`
        : `<strong>${gruppo.length} enti in questo edificio</strong><br>${gruppo.map((e) => e.nome).join("<br>")}`;
      popup.setLngLat(f.geometry.coordinates).setHTML(html).addTo(map);
    });
    map.on("mouseleave", LAYER_ENTI, () => popup.remove());

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
      map.setFeatureState({ source: "enti", id: scelto }, { scelto: false, coloreScelto: null });
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
