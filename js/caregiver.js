// Prototipo · pagina del caregiver, scenario A (vedi brief-caregiver-claude-code-2.md, che aggiorna il
// primo brief). Riusa i dati, lo stile della mappa e le funzioni comuni in js/condiviso.js; non
// modifica js/app.js. Disposizione: chat nella tendina sinistra (comprimibile), mappa al centro,
// tendina destra sempre aperta con due tab («I miei luoghi», «Consigliati») o la scheda del marker.

// ---------- marker: stati e grafica provvisoria, tutti qui perché Andrea possa ritoccarli a mano
// senza toccare la logica. Cinque stati (vedi il brief): salvato, consigliato, scoperto,
// selezionato, attenuato. Salvato e scoperto sono cerchi, consigliato è un rombo (forma diversa dai
// salvati, come chiede il brief); il selezionato tiene la sua forma e prende un bordo nero.
const MARKER_RAGGIO_ATTENUATO = 4;
const MARKER_RAGGIO = 8; // salvato, consigliato, scoperto, selezionato: tutti "in vista" alla stessa taglia
const MARKER_ROMBO_MEZZA_DIAGONALE = MARKER_RAGGIO * 1.4; // il rombo, a pari area visiva del cerchio
const MARKER_OPACITA_ATTENUATA = 0.12;
const MARKER_OPACITA_SCOPERTO = 0.85; // pieno ma un poco meno dei salvati, senza bordo
const MARKER_BORDO = 2; // bianco: salvato e consigliato
const MARKER_BORDO_SELEZIONATO = 3;
const MARKER_COLORE_SELEZIONATO = "#1d2428";
const MARKER_SCALA_ICONA = 0.55; // quanta parte del diametro occupa l'icona di categoria
// In hover (marker, voce di una lista, nome nella chat) attorno al marker compare un alone: vale per
// tutte le forme, a differenza di un ingrandimento (che Mapbox non sa fare sulle icone a rombo).
const MARKER_ALONE_RAGGIO = MARKER_RAGGIO + 6;
const MARKER_ALONE_OPACITA = 0.22;
const RAGGIO_DOMICILIO = 10;
const SCALA_ICONA_DOMICILIO = 0.55;

// Rami verso i legami del servizio selezionato: curve come nel case manager (campionaCurva,
// condivisa), con una grafica propria e provvisoria. «Simili a questo» pieno, «Anche per te»
// tratteggiato e più tenue.
const RAMO_COLORE = "#aab1b6";
const RAMO_SPESSORE = 0.75;
const RAMO_OPACITA = 0.9;
const RAMO_OPACITA_TENUE = 0.45;
const RAMO_TRATTO_PIENO = 3; // px
const RAMO_TRATTO_VUOTO = 3; // px
const RAMO_DISSOLVENZA_MS = 200;

// ---------- scelte ancora aperte nel brief: soluzioni provvisorie, da cambiare qui
// Dopo una correzione resta una sola etichetta: false = l'ultima non ha la × (non si può togliere),
// così la chat non deve rispondere "senza bisogni". Con true si può togliere ma non succede nulla.
const ULTIMA_ETICHETTA_TOGLIBILE = false;

// Chat: attesa con i tre puntini, poi il testo parola per parola.
const CHAT_ATTESA_MS = 1000;
const CHAT_MS_PER_PAROLA = 55;

// ---------- il cerchio del «quartiere» attorno al domicilio (vedi brief-mappa-caregiver-claude-code-2.md)
// Un cerchio geometrico, dichiaratamente approssimato (non un'isocrona): raggio = minuti × la velocità
// media implicita nei tempi già calcolati con la Mapbox Matrix API (data/tempi_domicilio_iniziale.json).
// Agisce solo sul piano cartografico: non filtra marker né servizi.
const METRI_AL_MINUTO = 83;
const QUARTIERE_MINUTI = [5, 10, 15, 20, 25, 30]; // i valori del controllo − / +
const QUARTIERE_MINUTI_INIZIALI = 15;
// Due elementi, dal basso: un velo scuro fuori dal cerchio (bordo netto; dentro la mappa resta
// normale) e la traccia del bordo a puntini.
const VELO_COLORE = "#000000";
const VELO_OPACITA = 0.1;
// Traccia del bordo: una linea di puntini leggera. I puntini sono trattini lunghi zero con le
// estremità arrotondate.
const BORDO_QUARTIERE_COLORE = "#8C8378"; // il colore delle etichette dello stile
const BORDO_QUARTIERE_OPACITA = 0.6;
const BORDO_QUARTIERE_PUNTINO = 2; // diametro del puntino, px
const BORDO_QUARTIERE_SPAZIO = 3; // spazio fra due puntini, in multipli del diametro (3 × 2 = 6 px)
const QUARTIERE_TRANSIZIONE_MS = 500; // il cerchio che si allarga o si stringe
const QUARTIERE_VISTA_MS = 1200; // la vista che si adatta al nuovo cerchio, più lenta
// px attorno al cerchio, uguale su tutti i lati: il cerchio, e quindi il domicilio, resta al centro
// della mappa, sulla verticale della pillola del raggio (e le lascia posto in basso).
const QUARTIERE_VISTA_MARGINE = 70;
const metriPerMinuti = (minuti) => minuti * METRI_AL_MINUTO;

// Lo stesso domicilio del case manager (js/condiviso.js), qui fisso al centro della mappa.
const DOMICILIO = DOMICILIO_INIZIALE;

window.startApp = async function () {
  const mapEl = document.getElementById("map");
  const appEl = document.getElementById("app");
  const panelDx = document.getElementById("panel-dx");
  const chatScambio = document.getElementById("chat-scambio");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatInvia = chatForm.querySelector("button");
  const chatComprimi = document.getElementById("chat-comprimi");

  if (!CONFIG.mapboxToken || CONFIG.mapboxToken.startsWith("INCOLLA")) {
    mapEl.innerHTML =
      '<p style="padding:24px">Manca il token di Mapbox: incollalo in <code>js/config.js</code>.</p>';
    return;
  }

  // ---------- dati
  const [enti, servizi, bisogni, scenario, tempiRiserva] = await Promise.all(
    ["data/enti.json", "data/servizi.json", "data/bisogni.json", "data/scenario-caregiver.json",
      "data/tempi_domicilio_iniziale.json"]
      .map((u) => fetch(u).then((r) => r.json()))
  );
  const enteById = Object.fromEntries(enti.map((e) => [e.id, e]));
  const servizioById = Object.fromEntries(servizi.map((s) => [s.id, s]));
  const bisognoById = Object.fromEntries(bisogni.map((b) => [b.id, b]));
  const sullaMappa = enti.filter((e) => e.lat != null);
  const enteDi = (servizioId) => servizioById[servizioId].sede; // il marker è dove si va

  // Tutti i servizi nominati dallo scenario: servono per i tempi a piedi e per le icone.
  const serviziScenario = new Set([
    ...scenario.salvati,
    ...scenario.pacchetto_case_manager.servizi.map((v) => v.servizio),
    ...scenario.relazioni.flatMap((r) => [...r.simili, ...r.anche_per_te].map((d) => d.servizio)),
    ...scenario.chat.risposte.flatMap((r) => r.servizi),
  ]);
  const entiScenario = Array.from(new Set(
    [...serviziScenario].map(enteDi).concat(scenario.relazioni.map((r) => r.da))
  ));

  // Tempi a piedi con la funzione condivisa; se la API non risponde, i valori di riserva.
  const risultatiTempi = await richiediTempiAPiedi(
    [DOMICILIO.lon, DOMICILIO.lat], entiScenario.map((id) => [enteById[id].lon, enteById[id].lat]), CONFIG.mapboxToken
  );
  const tempoPerEnte = {};
  entiScenario.forEach((id, i) => {
    const r = risultatiTempi[i];
    tempoPerEnte[id] = r.stato === "ok" ? r : (tempiRiserva[id] ? { stato: "ok", ...tempiRiserva[id] } : r);
  });
  function minuti(enteId) {
    const t = tempoPerEnte[enteId];
    return t && t.stato === "ok" ? t.minuti : null;
  }
  function testoTempo(enteId) {
    const m = minuti(enteId);
    return m == null ? "tempo a piedi non disponibile" : m + " min a piedi";
  }

  // ---------- piccoli aiuti per il markup
  const capitalizza = (t) => (t ? t[0].toUpperCase() + t.slice(1) : "");
  const titoloServizio = (id) => capitalizza(servizioById[id].titolo || "Servizio");
  const nomeBisogno = (id) => (bisognoById[id] ? bisognoById[id].nome : id);
  const vociCaneHtml = (ids) =>
    `<ul class="voci-cane">${ids.map((b) => `<li class="voce-cane">${nomeBisogno(b)}</li>`).join("")}</ul>`;
  function iconaSegnalibro(pieno) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">'
      + `<path d="M6 3h12v18l-6-4.5L6 21z" fill="${pieno ? "currentColor" : "none"}" `
      + 'stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  }
  const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- stato della pagina
  // Un pacchetto: { id, tipo ("case-manager" | "chat"), nome, data, testo, voci: [{ servizio, bisogni }],
  // aperto (compresso o no nel tab), acceso (visibile o no sulla mappa) }.
  const cm = scenario.pacchetto_case_manager;
  const stato = {
    salvati: [...scenario.salvati],
    tab: "luoghi", // «I miei luoghi» attivo all'apertura
    novitaConsigliati: true, // la proposta del case manager arriva come novità
    pacchetti: [{
      id: "case-manager", tipo: "case-manager", nome: cm.titolo, data: cm.data, testo: cm.commento,
      voci: cm.servizi.map((v) => ({ servizio: v.servizio, bisogni: [v.bisogno] })),
      aperto: true, acceso: true,
    }],
    scheda: null, // { enteId, servizi: [id, ...] } quando la tendina destra mostra la scheda del marker
    tipoRelazione: null, // "simili" | "anche_per_te" | null (rami spenti)
  };
  const isSalvato = (id) => stato.salvati.includes(id);
  const vociVisibili = (p) => p.voci.filter((v) => !isSalvato(v.servizio)); // un salvato esce dal pacchetto

  // Enti "scoperti" dalla relazione attiva (sono scoperti solo se non sono già salvati o consigliati).
  let scopertiRelazione = new Map(); // enteId -> servizio della relazione

  // Stato di ogni ente sulla mappa, in ordine di precedenza: salvato (sempre visibile, in tutti e due
  // i tab), consigliato (solo con «Consigliati» attivo e il pacchetto acceso), scoperto, attenuato.
  function statoEnti() {
    const st = new Map();
    for (const id of stato.salvati) st.set(enteDi(id), "salvato");
    if (stato.tab === "consigliati") {
      for (const p of stato.pacchetti) {
        if (!p.acceso) continue;
        for (const v of vociVisibili(p)) if (!st.has(enteDi(v.servizio))) st.set(enteDi(v.servizio), "consigliato");
      }
    }
    for (const enteId of scopertiRelazione.keys()) if (!st.has(enteId)) st.set(enteId, "scoperto");
    return st;
  }

  // ---------- mappa
  // Inquadratura iniziale: il domicilio al centro e, attorno, abbastanza spazio da far stare tutti gli
  // enti dello scenario (riquadro simmetrico rispetto al domicilio, così il centro non si sposta).
  const scartoLon = Math.max(...entiScenario.map((id) => Math.abs(enteById[id].lon - DOMICILIO.lon)));
  const scartoLat = Math.max(...entiScenario.map((id) => Math.abs(enteById[id].lat - DOMICILIO.lat)));
  mapboxgl.accessToken = CONFIG.mapboxToken;
  const map = new mapboxgl.Map({
    container: "map", style: CONFIG.mapStyleCaregiver,
    bounds: [[DOMICILIO.lon - scartoLon, DOMICILIO.lat - scartoLat], [DOMICILIO.lon + scartoLon, DOMICILIO.lat + scartoLat]],
    fitBoundsOptions: { padding: 50 },
    minZoom: CONFIG.minZoom, maxZoom: CONFIG.maxZoom, language: "it",
    attributionControl: false,
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
  // Note di Mapbox e OpenStreetMap in forma compatta: un pulsante «i» che le apre al clic. Non si
  // possono togliere del tutto (le chiedono le condizioni d'uso di Mapbox e la licenza di OSM).
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
  let mappaPronta = false;

  const featureIndexPerEnte = {};
  sullaMappa.forEach((e, i) => { featureIndexPerEnte[e.id] = i; });
  const chiaveColore = (e) => (COLORI[e.macro_dominio] ? e.macro_dominio : "altro");
  const geojsonEnti = {
    type: "FeatureCollection",
    features: sullaMappa.map((e, i) => ({
      type: "Feature", id: i,
      geometry: { type: "Point", coordinates: [e.lon, e.lat] },
      properties: { id: e.id, macro_dominio: e.macro_dominio },
    })),
  };

  // Le proprietà che decidono l'aspetto di ogni marker, ricalcolate a ogni cambio di stato.
  function aggiornaMappa() {
    const st = statoEnti();
    const selezionatoId = stato.scheda ? stato.scheda.enteId : null;
    for (const f of geojsonEnti.features) {
      const e = enteById[f.properties.id];
      const s = st.get(e.id) || "attenuato";
      const selezionato = e.id === selezionatoId;
      const inVista = s !== "attenuato" || selezionato;
      f.properties.stato = s;
      f.properties.selezionato = selezionato;
      f.properties.rombo = "rombo-" + chiaveColore(e) + (selezionato ? "-sel" : "");
      f.properties.icona = inVista ? (ICONA_PER_CATEGORIA[e.categoria_origine] || null) : null;
    }
    if (mappaPronta) map.getSource("enti").setData(geojsonEnti);
  }
  aggiornaMappa();
  const inVista = (f) => f.properties.stato !== "attenuato" || f.properties.selezionato;

  // Rombo del marker "consigliato", disegnato su canvas (Mapbox non ha un livello a rombo): uno per
  // colore di macrodominio, in versione normale e selezionata.
  function disegnaRombo(colore, coloreBordo, bordo) {
    const PR = 2;
    const meta = MARKER_ROMBO_MEZZA_DIAGONALE;
    const lato = Math.ceil((meta + bordo + 1) * 2);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = lato * PR;
    const ctx = canvas.getContext("2d");
    ctx.scale(PR, PR);
    const c = lato / 2;
    ctx.beginPath();
    ctx.moveTo(c, c - meta); ctx.lineTo(c + meta, c); ctx.lineTo(c, c + meta); ctx.lineTo(c - meta, c);
    ctx.closePath();
    ctx.fillStyle = colore;
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.lineWidth = bordo;
    ctx.strokeStyle = coloreBordo;
    ctx.stroke();
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  const popupServizio = new mapboxgl.Popup({
    closeButton: false, closeOnClick: false, focusAfterOpen: false,
    anchor: "bottom-left", offset: 14, className: "popup-servizio",
  });

  // ---------- il cerchio del quartiere: velo scuro fuori, mappa normale dentro
  let minutiQuartiere = QUARTIERE_MINUTI_INIZIALI;
  let raggioQuartiere = metriPerMinuti(minutiQuartiere); // il raggio disegnato, anche a metà transizione
  let animazioneQuartiere = null;
  const cerchioQuartiere = (raggio) => cerchioGeodetico(DOMICILIO.lat, DOMICILIO.lon, raggio);
  // Il velo copre tutto il mondo tranne il cerchio: un poligono con il cerchio come foro.
  function veloQuartiere(raggio) {
    const mondo = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
    const foro = cerchioQuartiere(raggio).geometry.coordinates[0].slice().reverse();
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [mondo, foro] } };
  }
  function disegnaQuartiere(raggio) {
    map.getSource("quartiere-velo").setData(veloQuartiere(raggio));
    map.getSource("quartiere-bordo").setData(cerchioQuartiere(raggio));
  }

  // Pillola «− 15 min a piedi +»: ai due estremi il pulsante resta cliccabile ma non fa nulla.
  const raggioValore = document.getElementById("raggio-valore");
  const [raggioMeno, raggioPiu] = document.querySelectorAll(".raggio__passo");
  function aggiornaPillolaRaggio() {
    raggioValore.innerHTML = iconaPersonaCheCammina() + `${minutiQuartiere} min a piedi`;
    const i = QUARTIERE_MINUTI.indexOf(minutiQuartiere);
    raggioMeno.classList.toggle("al-limite", i === 0);
    raggioPiu.classList.toggle("al-limite", i === QUARTIERE_MINUTI.length - 1);
  }
  aggiornaPillolaRaggio();

  // Il cerchio (il foro nel velo) si allarga o si stringe in modo morbido; nello stesso
  // tempo, più lentamente, la vista si adatta per contenerlo tutto. Il raggio è solo visivo.
  const morbido = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  function cambiaRaggio(passo) {
    const i = QUARTIERE_MINUTI.indexOf(minutiQuartiere) + passo;
    if (i < 0 || i >= QUARTIERE_MINUTI.length) return;
    minutiQuartiere = QUARTIERE_MINUTI[i];
    aggiornaPillolaRaggio();
    const da = raggioQuartiere;
    const a = metriPerMinuti(minutiQuartiere);
    if (!mappaPronta) { raggioQuartiere = a; return; }
    cancelAnimationFrame(animazioneQuartiere);
    const inizio = performance.now();
    const fotogramma = (ora) => {
      const t = Math.min(1, (ora - inizio) / QUARTIERE_TRANSIZIONE_MS);
      raggioQuartiere = da + (a - da) * morbido(t);
      disegnaQuartiere(raggioQuartiere);
      if (t < 1) animazioneQuartiere = requestAnimationFrame(fotogramma);
    };
    animazioneQuartiere = requestAnimationFrame(fotogramma);
    const anello = cerchioQuartiere(a).geometry.coordinates[0];
    const lon = anello.map((c) => c[0]);
    const lat = anello.map((c) => c[1]);
    // La mappa sta solo nella colonna centrale (le tendine sono colonne a parte): il margine basta.
    map.fitBounds([[Math.min(...lon), Math.min(...lat)], [Math.max(...lon), Math.max(...lat)]], {
      padding: QUARTIERE_VISTA_MARGINE, duration: QUARTIERE_VISTA_MS, easing: morbido,
    });
  }
  raggioMeno.addEventListener("click", () => cambiaRaggio(-1));
  raggioPiu.addEventListener("click", () => cambiaRaggio(1));

  map.on("load", async () => {
    // Il quartiere sta sopra lo stile di base e sotto tutto ciò che è informazione (linee del tempo,
    // rami, domicilio, marker, fumetti): per questo è aggiunto per primo.
    map.addSource("quartiere-velo", { type: "geojson", data: veloQuartiere(raggioQuartiere) });
    map.addLayer({ id: "quartiere-velo", type: "fill", source: "quartiere-velo", paint: { "fill-color": VELO_COLORE, "fill-opacity": VELO_OPACITA } });
    map.addSource("quartiere-bordo", { type: "geojson", data: cerchioQuartiere(raggioQuartiere) });
    map.addLayer({
      id: "quartiere-bordo", type: "line", source: "quartiere-bordo",
      layout: { "line-cap": "round" },
      paint: {
        "line-color": BORDO_QUARTIERE_COLORE,
        "line-opacity": BORDO_QUARTIERE_OPACITA,
        "line-width": BORDO_QUARTIERE_PUNTINO,
        "line-dasharray": [0, BORDO_QUARTIERE_SPAZIO],
      },
    });

    // Linea del tempo (domicilio → marker in hover): retta e tratteggiata, sotto rami e marker.
    map.addSource("tempo-linea", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "tempo-linea", type: "line", source: "tempo-linea", layout: { "line-cap": "butt" },
      paint: {
        "line-color": TEMPO_LINEA_COLORE,
        "line-width": TEMPO_LINEA_SPESSORE,
        "line-dasharray": [TEMPO_LINEA_TRATTO_PIENO / TEMPO_LINEA_SPESSORE, TEMPO_LINEA_TRATTO_VUOTO / TEMPO_LINEA_SPESSORE],
        "line-opacity": ["case", ["boolean", ["feature-state", "comparso"], false], TEMPO_LINEA_OPACITA, 0],
        "line-opacity-transition": { duration: TEMPO_LINEA_DISSOLVENZA_MS },
      },
    });

    // Rami: archi curvi fra i marker, sopra le linee del tempo, sotto i marker.
    map.addSource("rami", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "rami", type: "line", source: "rami", layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": RAMO_COLORE,
        "line-width": RAMO_SPESSORE,
        "line-opacity": ["case", ["boolean", ["feature-state", "comparso"], false], RAMO_OPACITA, 0],
        "line-opacity-transition": { duration: RAMO_DISSOLVENZA_MS },
      },
    });

    // Domicilio: stessa icona del case manager, taglia fissa.
    map.addSource("domicilio", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "Point", coordinates: [DOMICILIO.lon, DOMICILIO.lat] }, properties: {} },
    });
    map.addLayer({
      id: "domicilio-cerchio", type: "circle", source: "domicilio",
      paint: { "circle-radius": RAGGIO_DOMICILIO, "circle-color": "#000000", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
    });
    try {
      const img = await caricaImmagine("icons/domicilio.png");
      map.addImage("domicilio", img, { pixelRatio: 2 });
      map.addLayer({
        id: "domicilio-icona", type: "symbol", source: "domicilio",
        layout: {
          "icon-image": "domicilio",
          "icon-size": (2 * RAGGIO_DOMICILIO * SCALA_ICONA_DOMICILIO) / (img.width / 2),
          "icon-allow-overlap": true, "icon-ignore-placement": true,
        },
      });
    } catch (err) { console.warn(err.message); }

    // Immagini: rombi dei consigliati e icone di categoria degli enti dello scenario.
    for (const [chiave, colore] of [...Object.entries(COLORI), ["altro", COLORE_CLUSTER]]) {
      map.addImage("rombo-" + chiave, disegnaRombo(colore, "#ffffff", MARKER_BORDO), { pixelRatio: 2 });
      map.addImage("rombo-" + chiave + "-sel", disegnaRombo(colore, MARKER_COLORE_SELEZIONATO, MARKER_BORDO_SELEZIONATO), { pixelRatio: 2 });
    }
    const nomiIcone = new Set(entiScenario.map((id) => ICONA_PER_CATEGORIA[enteById[id].categoria_origine]).filter(Boolean));
    await Promise.all([...nomiIcone].map(async (nome) => {
      try {
        map.addImage(nome, await caricaImmagine(`icons/2x/icon-${nome}@2x.png`), { pixelRatio: 2 });
      } catch (err) { console.warn(err.message); }
    }));

    // Enti: alone (hover), cerchi (salvato, scoperto, attenuato), rombi (consigliato), icone. Tutta la
    // rete resta visibile in ogni tab: gli enti senza un altro stato sono attenuati, dentro e fuori dal
    // cerchio allo stesso modo (il cerchio agisce solo sul piano cartografico).
    map.addSource("enti", { type: "geojson", data: geojsonEnti });
    const selezionato = ["boolean", ["get", "selezionato"], false];
    map.addLayer({
      id: "enti-alone", type: "circle", source: "enti",
      paint: {
        "circle-radius": MARKER_ALONE_RAGGIO,
        "circle-color": MARKER_COLORE_SELEZIONATO,
        "circle-opacity": ["case", ["boolean", ["feature-state", "inEvidenza"], false], MARKER_ALONE_OPACITA, 0],
      },
    });
    map.addLayer({
      id: "enti-cerchio", type: "circle", source: "enti",
      filter: ["!=", ["get", "stato"], "consigliato"],
      paint: {
        "circle-radius": ["case", ["any", selezionato, ["!=", ["get", "stato"], "attenuato"]], MARKER_RAGGIO, MARKER_RAGGIO_ATTENUATO],
        "circle-color": ["match", ["get", "macro_dominio"],
          "sanitario", COLORI.sanitario, "sociosanitario", COLORI.sociosanitario, "sociale", COLORI.sociale, COLORE_CLUSTER],
        "circle-opacity": ["case",
          selezionato, 1,
          ["==", ["get", "stato"], "salvato"], 1,
          ["==", ["get", "stato"], "scoperto"], MARKER_OPACITA_SCOPERTO,
          MARKER_OPACITA_ATTENUATA],
        "circle-stroke-color": ["case", selezionato, MARKER_COLORE_SELEZIONATO, "#ffffff"],
        "circle-stroke-width": ["case", selezionato, MARKER_BORDO_SELEZIONATO, ["==", ["get", "stato"], "salvato"], MARKER_BORDO, 0],
      },
    });
    map.addLayer({
      id: "enti-rombo", type: "symbol", source: "enti",
      filter: ["==", ["get", "stato"], "consigliato"],
      layout: { "icon-image": ["get", "rombo"], "icon-allow-overlap": true, "icon-ignore-placement": true },
    });
    map.addLayer({
      id: "enti-icona", type: "symbol", source: "enti",
      filter: ["==", ["typeof", ["get", "icona"]], "string"],
      layout: {
        "icon-image": ["get", "icona"],
        "icon-size": (2 * MARKER_RAGGIO * MARKER_SCALA_ICONA) / 128, // icone a 256 px fisici, pixelRatio 2
        "icon-allow-overlap": true, "icon-ignore-placement": true,
      },
    });

    mappaPronta = true;
    aggiornaRelazione();
    aggiornaMappa();
    if (stato.scheda) mostraFumetto();

    // Hover e clic sui marker in vista (gli attenuati non rispondono).
    const LAYER_MARKER = ["enti-cerchio", "enti-rombo"];
    const markerSotto = (ev) => (ev.features || []).find(inVista);
    map.on("mousemove", LAYER_MARKER, (ev) => {
      const f = markerSotto(ev);
      map.getCanvas().style.cursor = f ? "pointer" : "";
      if (!f) { spegniEvidenza(); return; }
      if (evidenza !== f.properties.id) evidenzia(f.properties.id, { linea: true });
    });
    map.on("mouseleave", LAYER_MARKER, () => {
      map.getCanvas().style.cursor = "";
      spegniEvidenza();
    });
    mapEl.addEventListener("mouseleave", spegniEvidenza); // uscendo dalla mappa, anche sopra il fumetto
    map.on("click", LAYER_MARKER, (ev) => {
      const f = markerSotto(ev);
      if (!f) return;
      const servizi = serviziInVistaAEnte(f.properties.id);
      if (servizi.length) apriScheda(f.properties.id, servizi, { rami: true });
    });
    // Clic su un punto vuoto della mappa: si chiude la scheda e si torna al tab di prima.
    map.on("click", (ev) => {
      const sotto = map.queryRenderedFeatures(ev.point, { layers: LAYER_MARKER }).filter(inVista);
      if (!sotto.length) chiudiScheda();
    });
  });

  // ---------- evidenza (hover): marker con l'alone, voci delle liste e nomi nella chat evidenziati;
  // con { linea: true } anche la linea tratteggiata dal domicilio con il tempo a piedi (Ricevere b).
  let evidenza = null;
  let lineaVisibile = false;
  let timeoutLineaUscita = null;
  // La pillola sta dentro un contenitore: Mapbox scrive un'opacità in linea sull'elemento del marker,
  // che vincerebbe sulla classe .mostra e lascerebbe la pillola sempre visibile dopo la prima volta.
  const pillola = Object.assign(document.createElement("div"), { className: "pillola-tempo pillola-tempo--enfasi" });
  const contenitorePillola = Object.assign(document.createElement("div"), { className: "pillola-contenitore" });
  contenitorePillola.append(pillola);
  const etichettaTempo = new mapboxgl.Marker({ element: contenitorePillola, anchor: "center" })
    .setLngLat([0, 0]).addTo(map);

  function segnaElementi(enteId, attivo) {
    document.querySelectorAll(`.voce[data-ente="${enteId}"], .chat-nome[data-ente="${enteId}"]`)
      .forEach((el) => el.classList.toggle("in-evidenza", attivo));
  }
  function evidenzia(enteId, { linea }) {
    spegniEvidenza();
    evidenza = enteId;
    segnaElementi(enteId, true);
    if (!mappaPronta) return;
    map.setFeatureState({ source: "enti", id: featureIndexPerEnte[enteId] }, { inEvidenza: true });
    if (linea) mostraLineaTempo(enteId);
  }
  function spegniEvidenza() {
    if (evidenza == null) return;
    segnaElementi(evidenza, false);
    if (mappaPronta) map.setFeatureState({ source: "enti", id: featureIndexPerEnte[evidenza] }, { inEvidenza: false });
    evidenza = null;
    nascondiLineaTempo();
  }

  function mostraLineaTempo(enteId) {
    const ente = enteById[enteId];
    if (timeoutLineaUscita) { clearTimeout(timeoutLineaUscita); timeoutLineaUscita = null; }
    const seg = segmentoLineaTempo(map, [DOMICILIO.lon, DOMICILIO.lat], RAGGIO_DOMICILIO, [ente.lon, ente.lat], MARKER_RAGGIO + MARKER_BORDO);
    map.removeFeatureState({ source: "tempo-linea" });
    map.getSource("tempo-linea").setData({ type: "FeatureCollection", features: [{ ...seg, id: 0 }] });
    requestAnimationFrame(() => map.setFeatureState({ source: "tempo-linea", id: 0 }, { comparso: true }));
    const [a, b] = seg.geometry.coordinates;
    const m = minuti(enteId);
    pillola.innerHTML = pillolaTempoHtml(m == null ? "—" : m + " min");
    etichettaTempo.setLngLat([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    pillola.classList.add("mostra");
    lineaVisibile = true;
  }
  function nascondiLineaTempo() {
    if (!lineaVisibile) return;
    lineaVisibile = false;
    map.setFeatureState({ source: "tempo-linea", id: 0 }, { comparso: false });
    pillola.classList.remove("mostra");
    if (timeoutLineaUscita) clearTimeout(timeoutLineaUscita);
    timeoutLineaUscita = setTimeout(() => {
      map.getSource("tempo-linea").setData({ type: "FeatureCollection", features: [] });
      timeoutLineaUscita = null;
    }, TEMPO_LINEA_DISSOLVENZA_MS);
  }

  // ---------- rami e relazioni del servizio selezionato
  let ramiCorrenti = { type: "FeatureCollection", features: [] };
  let timeoutRamiUscita = null;

  function mostraRami(coordOrigine, coordDestinazioni) {
    if (timeoutRamiUscita) { clearTimeout(timeoutRamiUscita); timeoutRamiUscita = null; }
    ramiCorrenti = {
      type: "FeatureCollection",
      features: coordDestinazioni.map((coord, i) => ({
        type: "Feature", id: i, properties: {},
        geometry: { type: "LineString", coordinates: campionaCurva(coordOrigine, coord) },
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
    }, RAMO_DISSOLVENZA_MS);
  }

  // Ricalcola gli enti della relazione attiva e ridisegna i rami (non aggiorna i marker: lo fa
  // aggiornaMappa, sempre chiamata subito dopo).
  function aggiornaRelazione() {
    scopertiRelazione = new Map();
    const tipo = stato.tipoRelazione;
    const rel = stato.scheda && tipo ? scenario.relazioni.find((r) => r.da === stato.scheda.enteId) : null;
    const lista = rel ? (tipo === "anche_per_te" ? rel.anche_per_te : rel.simili) : [];
    lista.forEach((d) => scopertiRelazione.set(d.ente, d.servizio));
    if (!mappaPronta) return;
    if (!lista.length) { nascondiRami(); return; }
    const tenue = tipo === "anche_per_te";
    map.setPaintProperty("rami", "line-opacity", ["case",
      ["boolean", ["feature-state", "comparso"], false], tenue ? RAMO_OPACITA_TENUE : RAMO_OPACITA, 0]);
    map.setPaintProperty("rami", "line-dasharray", tenue
      ? [RAMO_TRATTO_PIENO / RAMO_SPESSORE, RAMO_TRATTO_VUOTO / RAMO_SPESSORE] : null);
    const coord = (id) => [enteById[id].lon, enteById[id].lat];
    mostraRami(coord(stato.scheda.enteId), lista.map((d) => coord(d.ente)));
  }

  // ---------- scheda del marker («servizio presso ente»)
  // I servizi che un marker in vista rappresenta in questo momento: i salvati presso quell'ente; se
  // non ce ne sono, quelli dei pacchetti accesi (tab «Consigliati»); se no, quello della relazione.
  function serviziInVistaAEnte(enteId) {
    const salvatiQui = stato.salvati.filter((id) => enteDi(id) === enteId);
    if (salvatiQui.length) return salvatiQui;
    if (stato.tab === "consigliati") {
      for (const p of stato.pacchetti) {
        if (!p.acceso) continue;
        const qui = vociVisibili(p).filter((v) => enteDi(v.servizio) === enteId).map((v) => v.servizio);
        if (qui.length) return qui;
      }
    }
    return scopertiRelazione.has(enteId) ? [scopertiRelazione.get(enteId)] : [];
  }

  function mostraFumetto() {
    const ente = enteById[stato.scheda.enteId];
    popupServizio.setLngLat([ente.lon, ente.lat])
      .setHTML(fumettoServizio({ titolo: titoloServizio(stato.scheda.servizi[0]) }, ente)).addTo(map);
  }

  // { rami: true } accende «Simili a questo» (clic su un marker o su una voce: Esplorare a); dalla
  // chat i rami restano spenti e si accendono solo dal selettore (Conversare b).
  function apriScheda(enteId, serviziQui, { rami }) {
    if (stato.scheda && stato.scheda.enteId === enteId) return;
    stato.scheda = { enteId, servizi: serviziQui };
    stato.tipoRelazione = rami ? "simili" : null;
    aggiornaRelazione();
    aggiornaMappa();
    disegnaPannello();
    aggiornaChat();
    if (mappaPronta) mostraFumetto();
  }
  function chiudiScheda() {
    if (!stato.scheda) return;
    stato.scheda = null;
    stato.tipoRelazione = null;
    popupServizio.remove();
    aggiornaRelazione();
    aggiornaMappa();
    disegnaPannello();
    aggiornaChat();
  }

  function salva(ids) {
    const nuovi = ids.filter((id) => !isSalvato(id));
    if (!nuovi.length) return;
    stato.salvati.push(...nuovi);
    aggiornaMappa();
    disegnaPannello();
    aggiornaChat();
  }

  // ---------- tendina destra: due tab, oppure la scheda
  function htmlVoce(servizioId, bisogniVoce, collezione) {
    const enteId = enteDi(servizioId);
    return `<li class="voce" data-ente="${enteId}" data-collezione="${collezione}">
      <span class="voce__servizio">${titoloServizio(servizioId)}</span>
      <span class="voce__ente">${enteById[enteId].nome}</span>
      <span class="voce__tempo">${testoTempo(enteId)}</span>
      ${vociCaneHtml(bisogniVoce)}
    </li>`;
  }

  function htmlLuoghi() {
    if (!stato.salvati.length) return '<p class="nota">Non hai ancora salvato nessun luogo.</p>';
    return `<ul class="voci">${stato.salvati.map((id) => htmlVoce(id, servizioById[id].bisogni, "salvati")).join("")}</ul>`;
  }

  function htmlPacchetto(p) {
    const voci = vociVisibili(p);
    const lista = voci.length
      ? `<ul class="voci">${voci.map((v) => htmlVoce(v.servizio, v.bisogni, p.id)).join("")}</ul>`
      : '<p class="nota">Tutti i servizi di questo pacchetto sono tra i tuoi luoghi.</p>';
    const classeTesto = p.tipo === "case-manager" ? "pacchetto__testo pacchetto__commento" : "pacchetto__testo";
    return `<section class="pacchetto${p.aperto ? " aperto" : ""}${p.acceso ? "" : " spento"}" data-pacchetto="${p.id}">
      <div class="pacchetto__testata">
        <button type="button" class="pacchetto__titolo" aria-expanded="${p.aperto}">
          <span class="pacchetto__nomi">
            <span class="pacchetto__nome">${p.nome}</span>
            <span class="pacchetto__data">${p.data}</span>
          </span>
          <svg class="pacchetto__freccia" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button type="button" class="interruttore" role="switch" aria-checked="${p.acceso}"
          aria-label="Mostra «${p.nome}» sulla mappa" title="Mostra sulla mappa"></button>
      </div>
      <div class="pacchetto__corpo">
        <p class="${classeTesto}">${p.testo}</p>
        ${lista}
      </div>
    </section>`;
  }

  function htmlScheda() {
    const { enteId, servizi: ids } = stato.scheda;
    const ente = enteById[enteId];
    const [principale, ...altri] = ids.map((id) => servizioById[id]);
    const tuttiSalvati = ids.every(isSalvato);
    const descrizione = (s) => (s.descrizione ? `<p>${s.descrizione}</p>` : "");
    const pulsante = (tipo, testo) =>
      `<button type="button" class="selettore-relazioni__pulsante${stato.tipoRelazione === tipo ? " attivo" : ""}" data-relazione="${tipo}">${testo}</button>`;
    return `<div class="scheda">
      <button type="button" class="panel__close" data-azione="chiudi" aria-label="Chiudi la scheda">×</button>
      <p class="eyebrow">Servizio presso ente</p>
      <h2>${titoloServizio(principale.id)}</h2>
      <p class="meta">${ente.nome}${ente.indirizzo ? " — " + ente.indirizzo : ""}</p>
      <p class="meta">${testoTempo(enteId)}</p>
      ${descrizione(principale)}
      ${vociCaneHtml(principale.bisogni)}
      ${altri.map((s) => `<div class="scheda__altro">
        <p class="eyebrow">Anche qui</p>
        <p><b>${titoloServizio(s.id)}</b></p>
        ${descrizione(s)}
        ${vociCaneHtml(s.bisogni)}
      </div>`).join("")}
      <button type="button" class="scheda__salva" data-azione="salva"${tuttiSalvati ? " disabled" : ""}>
        ${iconaSegnalibro(tuttiSalvati)} ${tuttiSalvati ? "Salvato" : "Salva"}
      </button>
      <div class="selettore-relazioni">
        ${pulsante("simili", "Simili a questo")}
        ${pulsante("anche_per_te", "Anche per te")}
      </div>
    </div>`;
  }

  function disegnaPannello() {
    spegniEvidenza();
    if (stato.scheda) {
      panelDx.innerHTML = htmlScheda();
    } else {
      const tab = (id, testo, extra = "") =>
        `<button type="button" class="tab${stato.tab === id ? " attivo" : ""}" role="tab" aria-selected="${stato.tab === id}" data-tab="${id}">${testo}${extra}</button>`;
      const novita = stato.novitaConsigliati ? '<span class="tab__novita" title="Novità"></span>' : "";
      panelDx.innerHTML = `
        <div class="tabs" role="tablist">
          ${tab("luoghi", "I miei luoghi")}
          ${tab("consigliati", "Consigliati", novita)}
        </div>
        <div class="tab-corpo">
          ${stato.tab === "luoghi" ? htmlLuoghi() : stato.pacchetti.map(htmlPacchetto).join("")}
        </div>`;
    }
  }

  // Un solo gestore per tutta la tendina destra (il suo contenuto viene riscritto a ogni cambio).
  panelDx.addEventListener("click", (ev) => {
    const t = ev.target;
    const tab = t.closest("[data-tab]");
    if (tab) {
      stato.tab = tab.dataset.tab;
      if (stato.tab === "consigliati") stato.novitaConsigliati = false;
      aggiornaMappa();
      disegnaPannello();
      return;
    }
    const pacchettoEl = t.closest("[data-pacchetto]");
    const p = pacchettoEl && stato.pacchetti.find((x) => x.id === pacchettoEl.dataset.pacchetto);
    if (p && t.closest(".interruttore")) {
      p.acceso = !p.acceso;
      aggiornaMappa();
      disegnaPannello();
      return;
    }
    if (p && t.closest(".pacchetto__titolo")) {
      p.aperto = !p.aperto;
      disegnaPannello();
      return;
    }
    const voce = t.closest(".voce");
    if (voce) {
      const enteId = voce.dataset.ente;
      const ids = voce.dataset.collezione === "salvati"
        ? stato.salvati.filter((id) => enteDi(id) === enteId)
        : vociVisibili(p).filter((v) => enteDi(v.servizio) === enteId).map((v) => v.servizio);
      apriScheda(enteId, ids, { rami: true });
      return;
    }
    const azione = t.closest("[data-azione]");
    if (azione && azione.dataset.azione === "chiudi") { chiudiScheda(); return; }
    if (azione && azione.dataset.azione === "salva") { salva(stato.scheda.servizi); return; }
    const rel = t.closest("[data-relazione]");
    if (rel) {
      stato.tipoRelazione = stato.tipoRelazione === rel.dataset.relazione ? null : rel.dataset.relazione;
      aggiornaRelazione();
      aggiornaMappa();
      disegnaPannello();
    }
  });
  // Hover sulle voci (Ricevere b): mouseover/mouseout risalgono dai figli, si filtra sulla voce.
  panelDx.addEventListener("mouseover", (ev) => {
    const voce = ev.target.closest(".voce");
    if (voce && evidenza !== voce.dataset.ente) evidenzia(voce.dataset.ente, { linea: true });
  });
  panelDx.addEventListener("mouseout", (ev) => {
    const voce = ev.target.closest(".voce");
    if (voce && !voce.contains(ev.relatedTarget)) spegniEvidenza();
  });

  disegnaPannello();

  // ---------- chat (tendina sinistra)
  chatComprimi.addEventListener("click", () => {
    const chiusa = appEl.classList.toggle("sx-chiusa");
    chatComprimi.textContent = chiusa ? "›" : "‹";
    chatComprimi.setAttribute("aria-label", chiusa ? "Apri la chat" : "Comprimi la chat");
    requestAnimationFrame(() => map.resize());
  });

  const chat = { inviata: false, inScrittura: false, etichette: null };

  // A riposo la barra mostra solo l'invito; al clic compare la domanda dello scenario.
  chatInput.addEventListener("focus", () => {
    if (!chat.inviata && !chatInput.value) chatInput.value = scenario.chat.domanda;
  });

  chatForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const testo = chatInput.value.trim();
    if (chat.inviata || !testo) return;
    // Una sola ricerca per sessione (una conversazione, un pacchetto): qualunque testo produce la
    // risposta principale dello scenario; poi la barra resta disattivata fino al ricaricamento.
    chat.inviata = true;
    chatInput.value = "";
    chatInput.disabled = true;
    chatInvia.disabled = true;
    const domanda = document.createElement("div");
    domanda.className = "chat-msg chat-msg--utente";
    domanda.textContent = testo;
    chatScambio.append(domanda);
    rispondi(scenario.chat.risposte.find((r) => r.id === "principale"));
  });

  const serviziRispostaAEnte = (risposta, enteId) => risposta.servizi.filter((id) => enteDi(id) === enteId);

  // Il testo di una risposta, diviso in pezzi da mostrare uno alla volta: le parole e i nomi
  // cliccabili ([[E359|Boldinasco]]); {{E359}} diventa i minuti a piedi verso quell'ente.
  function pezziRisposta(risposta) {
    const testo = risposta.testo.replace(/\{\{(\w+)\}\}/g, (_, id) => {
      const m = minuti(id);
      return m == null ? "?" : String(m);
    });
    const pezzi = [];
    const reNome = /\[\[(\w+)\|([^\]]+)\]\]/g;
    let ultimo = 0;
    let m;
    const aggiungiParole = (t) => {
      for (const parola of t.match(/\S+\s*|\s+/g) || []) pezzi.push(document.createTextNode(parola));
    };
    while ((m = reNome.exec(testo))) {
      aggiungiParole(testo.slice(ultimo, m.index));
      pezzi.push(nomeServizio(risposta, m[1], m[2]));
      ultimo = reNome.lastIndex;
    }
    aggiungiParole(testo.slice(ultimo));
    return pezzi;
  }

  // Un nome nella risposta: hover → marker acceso; clic → scheda (rami spenti); segnalibro → salva.
  function nomeServizio(risposta, enteId, testo) {
    const ids = serviziRispostaAEnte(risposta, enteId);
    const span = document.createElement("span");
    span.className = "chat-nome";
    span.dataset.ente = enteId;
    span.dataset.servizi = ids.join(",");
    span.innerHTML = `<button type="button" class="chat-nome__testo">${testo}</button>`
      + `<button type="button" class="segnalibro" aria-label="Salva ${testo}" title="Salva">${iconaSegnalibro(false)}</button>`;
    const [btnNome, btnSalva] = span.children;
    btnNome.addEventListener("mouseenter", () => evidenzia(enteId, { linea: false }));
    btnNome.addEventListener("mouseleave", spegniEvidenza);
    btnNome.addEventListener("click", () => apriScheda(enteId, ids, { rami: false }));
    btnSalva.addEventListener("click", () => salva(ids));
    return span;
  }

  // Aggiorna nella chat ciò che dipende dallo stato: il nome evidenziato (quello del marker
  // selezionato, Conversare b) e i segnalibri già salvati.
  function aggiornaChat() {
    const selezionatoId = stato.scheda ? stato.scheda.enteId : null;
    chatScambio.querySelectorAll(".chat-nome").forEach((el) => {
      el.classList.toggle("evidenziato", el.dataset.ente === selezionatoId);
      const salvato = el.dataset.servizi.split(",").every(isSalvato);
      const seg = el.querySelector(".segnalibro");
      seg.classList.toggle("salvato", salvato);
      seg.disabled = salvato;
      seg.innerHTML = iconaSegnalibro(salvato);
      seg.title = salvato ? "Salvato" : "Salva";
    });
  }

  function etichetteHtml(risposta) {
    const toglibili = risposta.etichette.length > 1 || ULTIMA_ETICHETTA_TOGLIBILE;
    return risposta.etichette.map((b) => `<span class="chat-etichetta">${nomeBisogno(b)}${toglibili
      ? `<button type="button" class="chat-etichetta__togli" data-bisogno="${b}" aria-label="Togli ${nomeBisogno(b)}">×</button>` : ""}</span>`).join("");
  }

  async function rispondi(risposta) {
    chat.inScrittura = true;
    chatScambio.querySelectorAll(".chat-etichetta__togli").forEach((b) => b.remove()); // solo l'ultima risposta si corregge
    const scorri = () => { chatScambio.scrollTop = chatScambio.scrollHeight; };
    const blocco = document.createElement("div");
    blocco.className = "chat-msg chat-msg--risposta";
    blocco.innerHTML = '<span class="chat-attesa" aria-label="Sta scrivendo"><i></i><i></i><i></i></span>';
    chatScambio.append(blocco);
    scorri();
    await attendi(CHAT_ATTESA_MS);

    const p = document.createElement("p");
    blocco.replaceChildren(p);
    for (const pezzo of pezziRisposta(risposta)) {
      p.append(pezzo);
      scorri();
      await attendi(CHAT_MS_PER_PAROLA);
    }

    // A risposta finita: etichette, riga della fonte, marker sulla mappa (pacchetto della ricerca).
    const etichette = document.createElement("div");
    etichette.className = "chat-etichette";
    etichette.innerHTML = etichetteHtml(risposta);
    etichette.querySelectorAll(".chat-etichetta__togli").forEach((b) => {
      b.addEventListener("click", () => togliEtichetta(b.dataset.bisogno));
    });
    const fonte = document.createElement("p");
    fonte.className = "chat-msg__fonte";
    fonte.textContent = scenario.chat.fonte;
    blocco.append(etichette, fonte);
    scorri();

    chat.etichette = risposta.etichette;
    chat.inScrittura = false;
    aggiornaPacchettoChat(risposta);
    aggiornaChat();
  }

  // Togliendo un'etichetta, la chat risponde con la correzione preparata per le etichette rimaste.
  function togliEtichetta(bisogno) {
    if (chat.inScrittura) return;
    const restanti = chat.etichette.filter((b) => b !== bisogno);
    const correzione = scenario.chat.risposte.find((r) =>
      r.etichette.length === restanti.length && r.etichette.every((b) => restanti.includes(b)));
    if (correzione) rispondi(correzione);
  }

  // Una conversazione, un pacchetto: nasce alla prima risposta e segue ogni correzione. Si apre il
  // tab «Consigliati» con il pacchetto aperto e acceso, perché i servizi trovati compaiano sulla mappa.
  function aggiornaPacchettoChat(risposta) {
    const dati = {
      nome: risposta.etichette.map(nomeBisogno).join(" · "),
      testo: risposta.paragrafo,
      voci: risposta.servizi.map((id) => ({ servizio: id, bisogni: servizioById[id].bisogni })),
      aperto: true,
      acceso: true,
    };
    const esistente = stato.pacchetti.find((p) => p.id === "chat");
    if (esistente) Object.assign(esistente, dati);
    else stato.pacchetti.unshift({ id: "chat", tipo: "chat", data: scenario.chat.data, ...dati }); // il più recente in cima
    stato.tab = "consigliati";
    stato.novitaConsigliati = false;
    aggiornaRelazione();
    aggiornaMappa();
    disegnaPannello();
  }
};
