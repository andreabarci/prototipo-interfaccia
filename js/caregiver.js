// Prototipo · pagina del caregiver, scenario A (vedi brief-caregiver-claude-code-1.md).
// Riusa i dati, lo stile della mappa e le funzioni comuni in js/condiviso.js; non modifica js/app.js.
//
// I sei stati del brief sono tutti qui: Ricevere a/b, Esplorare a/b, Conversare a/b.

// ---------- stati dei marker: valori provvisori e neutri, raccolti qui perché Andrea possa
// ritoccarli a mano senza toccare la logica (vedi il brief).
const CAREGIVER_OPACITA_ATTENUATA = 0.12;
const CAREGIVER_OPACITA_SCOPERTO = 0.85; // pieno ma un poco meno dei proposti, per non confondersi
const CAREGIVER_RAGGIO_NORMALE = 4; // attenuato
const CAREGIVER_RAGGIO_PROPOSTO = 7; // proposto, scoperto e selezionato: tutti "in vista" alla stessa taglia
const CAREGIVER_BORDO_PROPOSTO = 2; // bianco
const CAREGIVER_BORDO_SELEZIONATO = 3; // nero, il più marcato di tutti — il "servizio di partenza"
const CAREGIVER_COLORE_SELEZIONATO = "#1d2428";
const CAREGIVER_SCALA_ICONA = 0.55;
const CAREGIVER_RAGGIO_DOMICILIO = 10;
// In hover (marker o voce della tendina sinistra, vedi Ricevere b nel brief) un marker proposto
// cresce leggermente, sulla taglia che ha già — stesso trattamento del case manager.
const CAREGIVER_FATTORE_HOVER = 1.15;

// Rami verso i legami del servizio selezionato (vedi Esplorare a/b nel brief): curve come nel case
// manager (campionaCurva, condivisa), ma con una grafica propria, provvisoria e indipendente da
// quella di js/app.js — Andrea potrà ritoccarle senza toccare l'altro strumento.
const CAREGIVER_RAMO_COLORE = "#aab1b6";
const CAREGIVER_RAMO_SPESSORE = 0.75;
const CAREGIVER_RAMO_OPACITA = 0.9;
const CAREGIVER_RAMO_DISSOLVENZA_MS = 200;
// «Anche per te» (vedi Esplorare b nel brief): stessi rami, ma tratteggiati e più tenui — l'unico
// modo per distinguerli da «Simili a questo» senza un colore diverso (ancora da decidere con Andrea).
const CAREGIVER_RAMO_OPACITA_TENUE = 0.45;
const CAREGIVER_RAMO_TRATTO_PIENO = 3; // px
const CAREGIVER_RAMO_TRATTO_VUOTO = 3; // px

// Raggio del cerchio dei 15 minuti a piedi: 15 minuti per la velocità media implicita nei tempi già
// calcolati con la Mapbox Matrix API per tutto il repertorio enti (vedi
// data/tempi_domicilio_iniziale.json) — circa 83 metri al minuto, cioè quasi 5 km/h. Non è
// un'isocrona reale, che seguirebbe le strade: è una stima visiva, dichiaratamente approssimata
// (vedi cerchioGeodetico in js/condiviso.js).
const RAGGIO_15_MIN_METRI = 1245;

// Il domicilio è lo stesso del case manager (DOMICILIO_INIZIALE, in js/condiviso.js) ma qui resta
// fisso al centro della mappa: la pagina del caregiver non offre un modo per spostarlo.
const DOMICILIO = DOMICILIO_INIZIALE;

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
  const [enti, servizi, scenario] = await Promise.all(
    ["data/enti.json", "data/servizi.json", "data/scenario-caregiver.json"]
      .map((u) => fetch(u).then((r) => r.json()))
  );
  const enteById = Object.fromEntries(enti.map((e) => [e.id, e]));
  const servizioById = Object.fromEntries(servizi.map((s) => [s.id, s]));
  const sullaMappa = enti.filter((e) => e.lat != null);

  const proposti = scenario.proposti.map((p) => ({
    gruppo: p.gruppo, servizio: servizioById[p.servizio], ente: enteById[p.ente],
  }));
  const gruppoPerEnte = Object.fromEntries(proposti.map((p) => [p.ente.id, p.gruppo]));

  // Tempi a piedi: solo per gli enti dello scenario (gli altri non li mostrano da nessuna parte in
  // questo passo, quindi non serve interrogare la API per tutto il repertorio come nel case manager).
  const relazione = scenario.relazioni[0];
  const idEntiScenario = Array.from(new Set([
    ...scenario.proposti.map((p) => p.ente),
    relazione.da, ...relazione.simili.map((s) => s.ente), ...relazione.anche_per_te.map((s) => s.ente),
    ...scenario.conversazione.risultati.map((r) => r.ente),
  ]));
  const risultatiTempi = await richiediTempiAPiedi(
    [DOMICILIO.lon, DOMICILIO.lat], idEntiScenario.map((id) => [enteById[id].lon, enteById[id].lat]), CONFIG.mapboxToken
  );
  const tempoPerEnte = {};
  idEntiScenario.forEach((id, idx) => { tempoPerEnte[id] = risultatiTempi[idx]; });

  function testoTempo(enteId) {
    const t = tempoPerEnte[enteId];
    return t && t.stato === "ok" ? t.minuti + " min a piedi" : "tempo a piedi non disponibile";
  }
  // Versione corta per la pillola sulla linea del tempo (icona + minuti): "…" mentre il calcolo è in
  // corso (qui non succede: si aspettano tutti i tempi prima di mostrare la pagina), "—" se è un errore.
  function testoPillola(enteId) {
    const t = tempoPerEnte[enteId];
    if (!t) return "…";
    if (t.stato !== "ok") return "—";
    return t.minuti + " min";
  }

  // ---------- tendina sinistra: la proposta del case manager, in due gruppi
  function vociGruppo(gruppo) {
    return proposti.filter((p) => p.gruppo === gruppo).map((p) => `
      <button class="proposta-voce" type="button" data-ente="${p.ente.id}">
        <span class="proposta-voce__servizio">${p.servizio.titolo}</span>
        <span class="proposta-voce__ente">${p.ente.nome}</span>
        <span class="proposta-voce__tempo">${testoTempo(p.ente.id)}</span>
      </button>`).join("");
  }
  panelSx.innerHTML = `
    <p class="eyebrow">La proposta del case manager</p>
    <p class="nota">Scenario A · persona, domicilio e proposta inventati per il prototipo.</p>
    <div class="proposta-gruppo">
      <p class="eyebrow">Per tuo padre</p>
      <div class="servizi">${vociGruppo("padre")}</div>
    </div>
    <div class="proposta-gruppo">
      <p class="eyebrow">Per te</p>
      <div class="servizi">${vociGruppo("figlio")}</div>
    </div>
  `;

  // ---------- mappa
  mapboxgl.accessToken = CONFIG.mapboxToken;
  const map = new mapboxgl.Map({
    container: "map", style: CONFIG.mapStyle, center: [DOMICILIO.lon, DOMICILIO.lat], zoom: 14.5,
    minZoom: CONFIG.minZoom, maxZoom: CONFIG.maxZoom, language: "it",
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

  // id ente -> indice della sua feature nella source "enti": serve per setFeatureState (hover).
  const featureIndexPerEnte = {};
  sullaMappa.forEach((e, i) => { featureIndexPerEnte[e.id] = i; });

  const geojsonEnti = {
    type: "FeatureCollection",
    features: sullaMappa.map((e, i) => {
      const proposto = gruppoPerEnte[e.id] != null;
      return {
        type: "Feature",
        id: i,
        geometry: { type: "Point", coordinates: [e.lon, e.lat] },
        properties: {
          id: e.id,
          macro_dominio: e.macro_dominio,
          proposto,
          icona_categoria: proposto ? (ICONA_PER_CATEGORIA[e.categoria_origine] || null) : null,
        },
      };
    }),
  };

  map.on("load", async () => {
    // Cerchio dei 15 minuti a piedi, fisso, sempre centrato sul domicilio.
    map.addSource("cerchio-15min", {
      type: "geojson", data: cerchioGeodetico(DOMICILIO.lat, DOMICILIO.lon, RAGGIO_15_MIN_METRI),
    });
    map.addLayer({
      id: "cerchio-15min-riempimento", type: "fill", source: "cerchio-15min",
      paint: { "fill-color": "#1d2428", "fill-opacity": 0.04 },
    });
    map.addLayer({
      id: "cerchio-15min-bordo", type: "line", source: "cerchio-15min",
      paint: { "line-color": "#8a9299", "line-width": 1, "line-dasharray": [2, 2] },
    });

    // Linea del tempo (domicilio → marker in hover, vedi Ricevere b nel brief): retta e tratteggiata,
    // mai curva (le curve sono i rami, non ancora disegnati in questo passo). Sotto a domicilio e
    // enti, aggiunta qui apposta, prima dei loro livelli. "comparso" segue lo stesso schema del case
    // manager: parte falso, passa a vero un istante dopo, per la dissolvenza (vedi mostraLineaTempo).
    map.addSource("tempo-linea", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "tempo-linea", type: "line", source: "tempo-linea",
      layout: { "line-cap": "butt" },
      paint: {
        "line-color": TEMPO_LINEA_COLORE,
        "line-width": TEMPO_LINEA_SPESSORE,
        "line-dasharray": [TEMPO_LINEA_TRATTO_PIENO / TEMPO_LINEA_SPESSORE, TEMPO_LINEA_TRATTO_VUOTO / TEMPO_LINEA_SPESSORE],
        "line-opacity": ["case", ["boolean", ["feature-state", "comparso"], false], TEMPO_LINEA_OPACITA, 0],
        "line-opacity-transition": { duration: TEMPO_LINEA_DISSOLVENZA_MS },
      },
    });
    const etichettaTempo = new mapboxgl.Marker({
      element: Object.assign(document.createElement("div"), { className: "pillola-tempo pillola-tempo--enfasi" }),
      anchor: "center",
    }).setLngLat([0, 0]).addTo(map);

    // Rami verso i legami del servizio selezionato (vedi Esplorare a/b nel brief): archi curvi fra i
    // marker (campionaCurva, condivisa con il case manager), sopra le linee del tempo, sotto i marker.
    map.addSource("rami", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "rami", type: "line", source: "rami",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": CAREGIVER_RAMO_COLORE,
        "line-width": CAREGIVER_RAMO_SPESSORE,
        "line-opacity": ["case", ["boolean", ["feature-state", "comparso"], false], CAREGIVER_RAMO_OPACITA, 0],
        "line-opacity-transition": { duration: CAREGIVER_RAMO_DISSOLVENZA_MS },
      },
    });

    // Domicilio: stessa icona del case manager, taglia fissa (qui non cresce con lo zoom).
    map.addSource("domicilio", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [DOMICILIO.lon, DOMICILIO.lat] }, properties: {} }] },
    });
    map.addLayer({
      id: "domicilio-cerchio", type: "circle", source: "domicilio",
      paint: { "circle-radius": CAREGIVER_RAGGIO_DOMICILIO, "circle-color": "#000000", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
    });
    try {
      const immagineDomicilio = await caricaImmagine("icons/domicilio.png");
      map.addImage("domicilio", immagineDomicilio, { pixelRatio: 2 });
      const nativoDomicilio = immagineDomicilio.width / 2; // px logici a icon-size 1
      map.addLayer({
        id: "domicilio-icona", type: "symbol", source: "domicilio",
        layout: {
          "icon-image": "domicilio",
          "icon-size": (2 * CAREGIVER_RAGGIO_DOMICILIO * CAREGIVER_SCALA_ICONA) / nativoDomicilio,
          "icon-allow-overlap": true, "icon-ignore-placement": true,
        },
      });
    } catch (err) { console.warn(err.message); }

    // Enti: tutti sulla mappa, i quattro proposti in evidenza, gli altri attenuati (non spariscono).
    map.addSource("enti", { type: "geojson", data: geojsonEnti });
    const coloreEnte = ["match", ["get", "macro_dominio"],
      "sanitario", COLORI.sanitario, "sociosanitario", COLORI.sociosanitario, "sociale", COLORI.sociale,
      COLORE_CLUSTER];
    map.addLayer({
      id: "enti-cerchio", type: "circle", source: "enti",
      paint: {
        "circle-radius": ["case",
          ["boolean", ["feature-state", "inEvidenza"], false], CAREGIVER_RAGGIO_PROPOSTO * CAREGIVER_FATTORE_HOVER,
          ["get", "proposto"], CAREGIVER_RAGGIO_PROPOSTO,
          ["boolean", ["feature-state", "scoperto"], false], CAREGIVER_RAGGIO_PROPOSTO,
          CAREGIVER_RAGGIO_NORMALE],
        "circle-color": coloreEnte,
        "circle-opacity": ["case",
          ["get", "proposto"], 1,
          ["boolean", ["feature-state", "scoperto"], false], CAREGIVER_OPACITA_SCOPERTO,
          CAREGIVER_OPACITA_ATTENUATA],
        "circle-stroke-color": ["case",
          ["boolean", ["feature-state", "selezionato"], false], CAREGIVER_COLORE_SELEZIONATO,
          "#ffffff"],
        "circle-stroke-width": ["case",
          ["boolean", ["feature-state", "selezionato"], false], CAREGIVER_BORDO_SELEZIONATO,
          ["get", "proposto"], CAREGIVER_BORDO_PROPOSTO,
          0],
        "circle-stroke-opacity": ["case",
          ["any", ["get", "proposto"], ["boolean", ["feature-state", "selezionato"], false]], 1,
          CAREGIVER_OPACITA_ATTENUATA],
      },
    });

    // Icone di categoria: si caricano solo quelle che servono ai quattro marker proposti (le icone
    // dei marker attenuati non si vedono in questo passo, non serve caricarle tutte come in app.js).
    const categorieProposte = Array.from(new Set(
      proposti.map((p) => ICONA_PER_CATEGORIA[p.ente.categoria_origine]).filter(Boolean)
    ));
    await Promise.all(categorieProposte.map(async (nome) => {
      try {
        const immagine = await caricaImmagine(`icons/2x/icon-${nome}@2x.png`);
        map.addImage(nome, immagine, { pixelRatio: 2 });
      } catch (err) { console.warn(err.message); }
    }));
    map.addLayer({
      id: "enti-icona", type: "symbol", source: "enti",
      layout: {
        "icon-image": ["get", "icona_categoria"],
        "icon-size": (2 * CAREGIVER_RAGGIO_PROPOSTO * CAREGIVER_SCALA_ICONA) / 128, // icone a 128px fisici (pixelRatio 2), vedi app.js
        "icon-allow-overlap": true, "icon-ignore-placement": true,
      },
    });

    // ---------- Ricevere b: hover su una voce della tendina sinistra o sul marker corrispondente
    // (vale nei due sensi). Il marker proposto va in evidenza e compare la linea tratteggiata dal
    // domicilio, col tempo a piedi e l'icona della persona a piedi (vedi il brief).
    let lineaTempoVisibile = false;
    let timeoutLineaTempoUscita = null;

    function mostraLineaTempo(enteId) {
      const ente = enteById[enteId];
      if (timeoutLineaTempoUscita) { clearTimeout(timeoutLineaTempoUscita); timeoutLineaTempoUscita = null; }
      const seg = segmentoLineaTempo(
        map, [DOMICILIO.lon, DOMICILIO.lat], CAREGIVER_RAGGIO_DOMICILIO,
        [ente.lon, ente.lat], CAREGIVER_RAGGIO_PROPOSTO * CAREGIVER_FATTORE_HOVER
      );
      map.removeFeatureState({ source: "tempo-linea" });
      map.getSource("tempo-linea").setData({ type: "FeatureCollection", features: [{ ...seg, id: 0 }] });
      requestAnimationFrame(() => map.setFeatureState({ source: "tempo-linea", id: 0 }, { comparso: true }));

      const [a, b] = seg.geometry.coordinates;
      etichettaTempo.getElement().innerHTML = pillolaTempoHtml(testoPillola(enteId));
      etichettaTempo.setLngLat([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      etichettaTempo.getElement().classList.add("mostra");
      lineaTempoVisibile = true;
    }

    function nascondiLineaTempo() {
      if (!lineaTempoVisibile) return;
      lineaTempoVisibile = false;
      map.setFeatureState({ source: "tempo-linea", id: 0 }, { comparso: false });
      etichettaTempo.getElement().classList.remove("mostra");
      if (timeoutLineaTempoUscita) clearTimeout(timeoutLineaTempoUscita);
      timeoutLineaTempoUscita = setTimeout(() => {
        map.getSource("tempo-linea").setData({ type: "FeatureCollection", features: [] });
        timeoutLineaTempoUscita = null;
      }, TEMPO_LINEA_DISSOLVENZA_MS);
    }

    const bottoniPerEnte = {};
    panelSx.querySelectorAll(".proposta-voce").forEach((btn) => {
      (bottoniPerEnte[btn.dataset.ente] ||= []).push(btn);
    });

    function attivaEvidenza(enteId) {
      const idx = featureIndexPerEnte[enteId];
      if (idx == null) return;
      map.setFeatureState({ source: "enti", id: idx }, { inEvidenza: true });
      (bottoniPerEnte[enteId] || []).forEach((b) => b.classList.add("in-evidenza"));
      mostraLineaTempo(enteId);
    }
    function spegniEvidenza(enteId) {
      const idx = featureIndexPerEnte[enteId];
      if (idx != null) map.setFeatureState({ source: "enti", id: idx }, { inEvidenza: false });
      (bottoniPerEnte[enteId] || []).forEach((b) => b.classList.remove("in-evidenza"));
      nascondiLineaTempo();
    }

    panelSx.querySelectorAll(".proposta-voce").forEach((btn) => {
      const enteId = btn.dataset.ente;
      btn.addEventListener("mouseenter", () => attivaEvidenza(enteId));
      btn.addEventListener("mouseleave", () => spegniEvidenza(enteId));
    });

    let enteInEvidenzaMappa = null;
    map.on("mousemove", "enti-cerchio", (ev) => {
      const f = ev.features[0];
      if (!f.properties.proposto) {
        map.getCanvas().style.cursor = "";
        if (enteInEvidenzaMappa) { spegniEvidenza(enteInEvidenzaMappa); enteInEvidenzaMappa = null; }
        return;
      }
      map.getCanvas().style.cursor = "pointer";
      const enteId = f.properties.id;
      if (enteInEvidenzaMappa !== enteId) {
        if (enteInEvidenzaMappa) spegniEvidenza(enteInEvidenzaMappa);
        enteInEvidenzaMappa = enteId;
        attivaEvidenza(enteId);
      }
    });
    map.on("mouseleave", "enti-cerchio", () => {
      map.getCanvas().style.cursor = "";
      if (enteInEvidenzaMappa) { spegniEvidenza(enteInEvidenzaMappa); enteInEvidenzaMappa = null; }
    });

    // ---------- Esplorare a/b: clic su un marker proposto → "servizio presso ente", tendina destra
    // con il selettore delle relazioni. «Simili a questo» è il tipo acceso di default (vedi il brief).
    const popupServizio = new mapboxgl.Popup({
      closeButton: false, closeOnClick: false, focusAfterOpen: false,
      anchor: "bottom-left", offset: 14, className: "popup-servizio",
    });
    let enteSelezionatoId = null;
    let tipoRelazioneAttivo = "simili";
    let ramiCorrenti = { type: "FeatureCollection", features: [] };
    let timeoutRamiUscita = null;

    function infoRelazione(enteId) {
      return scenario.relazioni.find((r) => r.da === enteId) || null;
    }
    function destinazioniRelazione(rel, tipo) {
      if (!rel) return [];
      return tipo === "anche_per_te" ? rel.anche_per_te : rel.simili;
    }

    // "scoperto" ha due origini indipendenti, che possono sovrapporsi sullo stesso ente: l'esplorare
    // (legata al servizio selezionato e al tipo di relazione attivo: cambia o si spegne con quelli,
    // vedi attivaRelazione) e il conversare (resta scoperto una volta trovato in chat, vedi più sotto
    // — Conversare a/b nel brief — finché non si ricarica la pagina). Il marker è "scoperto" se lo è
    // per almeno una delle due.
    const scopertiEsplorazione = new Set();
    const scopertiConversazione = new Set();
    function aggiornaStatoScoperto(enteId) {
      const attivo = scopertiEsplorazione.has(enteId) || scopertiConversazione.has(enteId);
      map.setFeatureState({ source: "enti", id: featureIndexPerEnte[enteId] }, { scoperto: attivo });
    }
    function segnaScopertoEsplorazione(enteId) {
      scopertiEsplorazione.add(enteId);
      aggiornaStatoScoperto(enteId);
    }
    function spegniScopertiEsplorazione() {
      const precedenti = Array.from(scopertiEsplorazione);
      scopertiEsplorazione.clear();
      precedenti.forEach(aggiornaStatoScoperto);
    }
    function segnaScopertoConversazione(enteId) {
      scopertiConversazione.add(enteId);
      aggiornaStatoScoperto(enteId);
    }

    function mostraRami(coordOrigine, coordDestinazioni) {
      if (timeoutRamiUscita) { clearTimeout(timeoutRamiUscita); timeoutRamiUscita = null; }
      ramiCorrenti = {
        type: "FeatureCollection",
        features: coordDestinazioni.map((coord, i) => ({
          type: "Feature", id: i,
          geometry: { type: "LineString", coordinates: campionaCurva(coordOrigine, coord) },
          properties: {},
        })),
      };
      map.removeFeatureState({ source: "rami" });
      map.getSource("rami").setData(ramiCorrenti);
      requestAnimationFrame(() => {
        ramiCorrenti.features.forEach((f) => map.setFeatureState({ source: "rami", id: f.id }, { comparso: true }));
      });
    }

    function nascondiRami() {
      if (!ramiCorrenti.features.length) return;
      ramiCorrenti.features.forEach((f) => map.setFeatureState({ source: "rami", id: f.id }, { comparso: false }));
      if (timeoutRamiUscita) clearTimeout(timeoutRamiUscita);
      timeoutRamiUscita = setTimeout(() => {
        ramiCorrenti = { type: "FeatureCollection", features: [] };
        map.getSource("rami").setData(ramiCorrenti);
        timeoutRamiUscita = null;
      }, CAREGIVER_RAMO_DISSOLVENZA_MS);
    }

    // Stile dei rami: «Simili a questo» pieno e a piena intensità, «Anche per te» tratteggiato e
    // più tenue (vedi Esplorare b nel brief) — stessa funzione e livello "rami" per entrambi, come
    // equivalenza/adiacenza nel case manager.
    function aggiornaStileRamo(tipo) {
      const tenue = tipo === "anche_per_te";
      map.setPaintProperty("rami", "line-opacity", ["case",
        ["boolean", ["feature-state", "comparso"], false], tenue ? CAREGIVER_RAMO_OPACITA_TENUE : CAREGIVER_RAMO_OPACITA,
        0]);
      map.setPaintProperty("rami", "line-dasharray", tenue
        ? [CAREGIVER_RAMO_TRATTO_PIENO / CAREGIVER_RAMO_SPESSORE, CAREGIVER_RAMO_TRATTO_VUOTO / CAREGIVER_RAMO_SPESSORE]
        : null);
    }

    function aggiornaPulsantiRelazione() {
      panelDxContent.querySelectorAll(".selettore-relazioni__pulsante").forEach((btn) => {
        btn.classList.toggle("attivo", btn.dataset.tipo === tipoRelazioneAttivo);
      });
    }

    // Gli enti della relazione attiva diventano "scoperto" (se non sono già "proposto") e ricevono
    // un ramo dal servizio selezionato; tutti gli altri "scoperto" di prima tornano attenuati. Se
    // l'ente scelto non ha questa relazione nei dati dello scenario, semplicemente non compare ramo.
    function attivaRelazione(tipo) {
      tipoRelazioneAttivo = tipo;
      aggiornaPulsantiRelazione();
      aggiornaStileRamo(tipo);
      spegniScopertiEsplorazione();
      nascondiRami();
      const rel = infoRelazione(enteSelezionatoId);
      const lista = destinazioniRelazione(rel, tipo);
      if (!lista.length) return;
      const ente = enteById[enteSelezionatoId];
      const destinazioni = lista.map((s) => enteById[s.ente]);
      destinazioni.forEach((d) => {
        if (!gruppoPerEnte[d.id]) segnaScopertoEsplorazione(d.id);
      });
      mostraRami([ente.lon, ente.lat], destinazioni.map((d) => [d.lon, d.lat]));
    }

    // Il servizio "principale" di un ente selezionato: quello proposto, se l'ente è un proposto; se
    // invece è uno dei due gruppi di cammino trovati in conversazione (vedi Conversare a/b più
    // sotto), il primo dei suoi servizi — ne hanno due, uno per bisogno (movimento e compagnia): non
    // ancora deciso con Andrea quale dei due "guida", qui restano entrambi, il secondo come riga in
    // più nel pannello (vedi apriPannelloServizio).
    const risultatoPerEnte = Object.fromEntries(
      scenario.conversazione.risultati.map((r) => [r.ente, r.servizi.map((id) => servizioById[id])])
    );
    function infoServizioEnte(enteId) {
      const p = proposti.find((x) => x.ente.id === enteId);
      if (p) return { servizio: p.servizio, altriServizi: [] };
      const servizi = risultatoPerEnte[enteId];
      if (servizi) return { servizio: servizi[0], altriServizi: servizi.slice(1) };
      return null;
    }

    function apriPannelloServizio(servizio, ente, altriServizi) {
      const righeAltri = (altriServizi || []).map((s) => `<p class="meta">Anche: ${s.titolo}</p>`).join("");
      panelDxContent.innerHTML = `
        <p class="eyebrow">Il luogo selezionato</p>
        <h2>${servizio.titolo}</h2>
        <p class="meta">${ente.nome}${ente.indirizzo ? " — " + ente.indirizzo : ""}</p>
        <p class="meta">${testoTempo(ente.id)}</p>
        ${servizio.descrizione ? `<p>${servizio.descrizione}</p>` : ""}
        ${righeAltri}
        <div class="selettore-relazioni" id="selettore-relazioni">
          <button type="button" class="selettore-relazioni__pulsante" data-tipo="simili">Simili a questo</button>
          <button type="button" class="selettore-relazioni__pulsante" data-tipo="anche_per_te">Anche per te</button>
        </div>`;
      appEl.classList.remove("dx-closed");
      panelDxContent.querySelectorAll(".selettore-relazioni__pulsante").forEach((btn) => {
        btn.addEventListener("click", () => attivaRelazione(btn.dataset.tipo));
      });
    }

    function deselezionaEnte() {
      if (enteSelezionatoId == null) return;
      map.setFeatureState({ source: "enti", id: featureIndexPerEnte[enteSelezionatoId] }, { selezionato: false });
      enteSelezionatoId = null;
      tipoRelazioneAttivo = "simili"; // torna al tipo di default, come alla prima selezione
      popupServizio.remove();
      nascondiRami();
      spegniScopertiEsplorazione(); // i "scoperto" della conversazione, se ce ne sono, restano
      appEl.classList.add("dx-closed");
    }

    function selezionaEnte(enteId) {
      if (enteSelezionatoId === enteId) return;
      const info = infoServizioEnte(enteId);
      if (!info) return;
      deselezionaEnte();
      enteSelezionatoId = enteId;
      map.setFeatureState({ source: "enti", id: featureIndexPerEnte[enteId] }, { selezionato: true });

      const ente = enteById[enteId];
      popupServizio.setLngLat([ente.lon, ente.lat]).setHTML(fumettoServizio(info.servizio, ente)).addTo(map);

      apriPannelloServizio(info.servizio, ente, info.altriServizi);
      attivaRelazione("simili");
    }

    // Un ente è cliccabile per diventare "servizio presso ente" se è un proposto (Esplorare a) o se
    // è stato scoperto in conversazione (Conversare b) — non se è solo attenuato o scoperto
    // dall'esplorazione di un altro servizio (quello non è ancora "il suo turno").
    map.on("click", "enti-cerchio", (ev) => {
      const f = ev.features[0];
      const enteId = f.properties.id;
      if (f.properties.proposto || scopertiConversazione.has(enteId)) selezionaEnte(enteId);
    });
    // Clic su un punto vuoto della mappa (nessun ente sotto il cursore): azzera la selezione, come
    // richiesto dal brief ("un modo semplice per azzerare la pagina allo stato di Ricevere a").
    map.on("click", (ev) => {
      const sottoCursore = map.queryRenderedFeatures(ev.point, { layers: ["enti-cerchio"] });
      if (!sottoCursore.length) deselezionaEnte();
    });

    panelDxClose.addEventListener("click", deselezionaEnte);

    // ---------- Conversare a/b: il figlio scrive (il campo è già precompilato) e invia; dopo un
    // breve ritardo arriva sempre la stessa risposta simulata, con i nomi cliccabili (vedi il brief).
    const conversazioneForm = document.getElementById("conversazione-form");
    const conversazioneInput = document.getElementById("conversazione-input");
    const conversazioneRisposta = document.getElementById("conversazione-risposta");
    const conversazioneBottone = conversazioneForm.querySelector("button");
    let conversazioneInviata = false;

    function minutiTesto(enteId) {
      const t = tempoPerEnte[enteId];
      return t && t.stato === "ok" ? t.minuti + " minuti" : "qualche minuto";
    }

    conversazioneForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (conversazioneInviata) return; // una sola risposta per sessione, come da scenario fisso
      conversazioneInviata = true;
      conversazioneInput.disabled = true;
      conversazioneBottone.disabled = true;

      conversazioneRisposta.hidden = false;
      conversazioneRisposta.className = "conversazione__risposta scrivendo";
      conversazioneRisposta.textContent = "Sta scrivendo…";

      setTimeout(() => {
        const [a, b] = scenario.conversazione.risultati;
        conversazioneRisposta.className = "conversazione__risposta";
        conversazioneRisposta.innerHTML = `
          <p>Vicino a casa ci sono due gruppi di cammino guidati da un accompagnatore dell'ATS: a
          <button type="button" class="conversazione__nome" data-ente="${a.ente}">${a.nome}</button>,
          a circa ${minutiTesto(a.ente)} a piedi, e al
          <button type="button" class="conversazione__nome" data-ente="${b.ente}">${b.nome}</button>,
          a circa ${minutiTesto(b.ente)}. Sono attività all'aperto che uniscono il movimento allo
          stare in compagnia.</p>
          <div class="conversazione__bisogni">
            ${scenario.conversazione.etichette_bisogni.map((e) => `<span class="conversazione__bisogno">${e}</span>`).join("")}
          </div>`;

        // Sulla mappa: i due gruppi di cammino in evidenza come "scoperti", i proposti invariati,
        // gli altri attenuati, rami spenti (vedi Conversare a nel brief).
        deselezionaEnte();
        scenario.conversazione.risultati.forEach((r) => segnaScopertoConversazione(r.ente));

        // I nomi sono cliccabili (Conversare b): selezionano il marker ed evidenziano il nome.
        conversazioneRisposta.querySelectorAll(".conversazione__nome").forEach((btn) => {
          btn.addEventListener("click", () => {
            conversazioneRisposta.querySelectorAll(".conversazione__nome")
              .forEach((b) => b.classList.remove("evidenziato"));
            btn.classList.add("evidenziato");
            selezionaEnte(btn.dataset.ente);
          });
        });
      }, 900);
    });
  });
};
