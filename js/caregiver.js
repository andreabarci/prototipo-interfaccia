// Prototipo · pagina del caregiver, scenario A (vedi brief-caregiver-claude-code-2.md, che aggiorna il
// primo brief). Riusa i dati, lo stile della mappa e le funzioni comuni in js/condiviso.js; non
// modifica js/app.js. Disposizione: tendina sinistra sempre aperta con due tab («I miei luoghi»,
// «Consigliati») o la scheda del marker, mappa al centro, chat nella tendina destra (comprimibile).

// ---------- marker: allineati al case manager (js/app.js, che resta il riferimento). Tutti gli enti
// sono puntini chiusi della stessa taglia; quelli accesi (proposta del case manager attiva, luoghi
// salvati, pacchetto della chat, collegati da un ramo) a piena intensità, gli altri attenuati. Senza
// niente di acceso, tutti i puntini sono accesi. Al clic il marker si apre: un cerchio con l'icona,
// centrato sul luogo, senza gambetta e senza anello a tacche (l'anello resta al case manager).
const PUNTINO_RAGGIO = 8; // px, come PUNTINO_RAGGIO del case manager
const OPACITA_ATTENUATA = 0.3; // più visibili che nel case manager (0,1): sulla mappa del caregiver sparivano
// Il marker aperto: stesse misure del case manager (cresce con lo zoom, fra le fermate 10 e 14).
const TESTA_RAGGIO = { 10: 8.75 * 0.84, 14: 17.5 * 0.84 };
const TESTA_BORDO = 3 * 0.84; // bordo bianco
const TESTA_SCALA_ICONA = 0.55;
// Il domicilio resta la puntina nera con la casa.
const SCALA_CAREGIVER = 0.7 * 1.2;
const RAGGIO_DOMICILIO = { 10: 8.75 * SCALA_CAREGIVER, 14: 17.5 * SCALA_CAREGIVER };
const BORDO_DOMICILIO = 3 * SCALA_CAREGIVER;
const SCALA_ICONA_DOMICILIO = 0.55;
const AGO_LUNGHEZZA = 12; // px, la gambetta del domicilio
const AGO_SPESSORE = 1.5; // px
const AGO_COLORE = "#5C554D";
// Foto degli enti (cartella foto/), per id ente: le stesse del case manager (FOTO_ENTI in js/app.js,
// da tenere allineate finché non andranno in un file comune). Gli altri hanno il segnaposto.
const FOTO_DEGLI_ENTI = {
  E273: "foto/biblioteca-villapizzone.jpeg",
  E203: "foto/cdi-beauvoir.jpg",
  E250: "foto/biblioteca-gallaratese.jpg",
  E259: "foto/biblioteca-dergano-bovisa.jpg",
  E357: "foto/gdc-stella.jpg", // Gruppo di cammino ATS — Parco Montestella (ritagliata in 4:3, 800×600)
};
// raggioAZoom (raggio in px a uno zoom qualsiasi) è in js/condiviso.js.

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
// La linea dei minuti a piedi e la sua pillola sono comuni alle due pagine: vedi LINEA_MINUTI in
// js/condiviso.js.
// Inclinazione della vista: 0 = dritta dall'alto (la vista standard); fino a 60 = «a volo d'uccello».
const VISTA_INCLINAZIONE = 0; // gradi
const METRI_AL_MINUTO = 83;
const QUARTIERE_MINUTI = [5, 10, 15, 20, 25, 30]; // i valori del controllo − / +
const QUARTIERE_MINUTI_INIZIALI = 15;
// Due elementi, dal basso: un velo scuro fuori dal cerchio (bordo netto; dentro la mappa resta
// normale) e la traccia del bordo a puntini.
const VELO_COLORE = "#8A6A4A"; // il marrone dell'ombra del rilievo nella palette della mappa (ombra_rilievo)
const VELO_OPACITA = 0.11;
// Traccia del bordo: una linea di puntini leggera. I puntini sono trattini lunghi zero con le
// estremità arrotondate.
const BORDO_QUARTIERE_COLORE = "#A3A3A3"; // grigio neutro, più chiaro
const BORDO_QUARTIERE_OPACITA = 0.6;
const BORDO_QUARTIERE_PUNTINO = 1.5; // diametro del puntino, px
const BORDO_QUARTIERE_SPAZIO = 4; // spazio fra due puntini, in multipli del diametro (4 × 1,5 = 6 px)
const QUARTIERE_TRANSIZIONE_MS = 500; // il cerchio che si allarga o si stringe
const QUARTIERE_VISTA_MS = 1200; // la vista che si adatta al nuovo cerchio, più lenta
// px attorno al cerchio, uguale su tutti i lati: il cerchio, e quindi il domicilio, resta al centro
// della mappa, sulla verticale della pillola del raggio (e le lascia posto in basso).
const QUARTIERE_VISTA_MARGINE = 70;
const metriPerMinuti = (minuti) => minuti * METRI_AL_MINUTO;

// Lo stesso domicilio del case manager (js/condiviso.js), qui fisso al centro della mappa.
const DOMICILIO = DOMICILIO_INIZIALE;

window.startApp = async function () {
  aggiungiTastoSegreto("case-manager"); // in basso a sinistra, invisibile: porta al case manager
  const mapEl = document.getElementById("map");
  const appEl = document.getElementById("app");
  const panelDx = document.getElementById("panel-luoghi");
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
  // Tutti i servizi che si raggiungono presso un ente (quelli a domicilio non hanno marker).
  const serviziPresso = (enteId) => servizi.filter((s) => s.sede === enteId && !s.a_domicilio).map((s) => s.id);

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
    // Gli enti fuori dallo scenario (aperti dal clic su un marker non pertinente) usano i tempi di
    // riserva, calcolati dallo stesso domicilio.
    const t = tempoPerEnte[enteId] || (tempiRiserva[enteId] ? { stato: "ok", ...tempiRiserva[enteId] } : null);
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
    tab: "consigliati", // «Consigliati» attivo all'apertura, con la proposta del case manager spenta
    novitaConsigliati: true, // la proposta del case manager arriva come novità
    pacchetti: [{
      id: "case-manager", tipo: "case-manager", nome: cm.titolo, data: cm.data, testo: cm.commento,
      voci: cm.servizi.map((v) => ({ servizio: v.servizio, bisogni: [v.bisogno] })),
      aperto: true, acceso: false,
    }],
    scheda: null, // { enteId, servizio } quando la tendina sinistra mostra la scheda dell'ente (servizio: null) o del servizio
    tipoRelazione: null, // "simili" | "anche_per_te" | null (rami spenti)
  };
  const isSalvato = (id) => stato.salvati.includes(id);
  const vociVisibili = (p) => p.voci.filter((v) => !isSalvato(v.servizio)); // un salvato esce dal pacchetto

  // Enti "scoperti" dalla relazione attiva (sono scoperti solo se non sono già salvati o consigliati).
  let scopertiRelazione = new Map(); // enteId -> servizio della relazione

  // Quali enti sono accesi: con «Consigliati» i servizi dei pacchetti attivi, con «I miei luoghi» i
  // salvati; in più gli enti collegati da un ramo. Se niente è attivo (all'apertura: «Consigliati» con
  // la proposta spenta) non si attenua nulla: tutti i puntini sono accesi.
  function luciEnti() {
    const accesi = new Set();
    let attenua = false;
    if (stato.tab === "consigliati") {
      for (const p of stato.pacchetti) {
        if (!p.acceso) continue;
        attenua = true;
        for (const v of p.voci) accesi.add(enteDi(v.servizio));
      }
    } else {
      attenua = true;
      for (const id of stato.salvati) accesi.add(enteDi(id));
    }
    if (scopertiRelazione.size) {
      attenua = true;
      for (const enteId of scopertiRelazione.keys()) accesi.add(enteId);
    }
    return { accesi, attenua };
  }

  // ---------- mappa
  // Inquadratura iniziale: il domicilio al centro e, attorno, abbastanza spazio da far stare tutti gli
  // enti dello scenario (riquadro simmetrico rispetto al domicilio, così il centro non si sposta).
  const scartoLon = Math.max(...entiScenario.map((id) => Math.abs(enteById[id].lon - DOMICILIO.lon)));
  const scartoLat = Math.max(...entiScenario.map((id) => Math.abs(enteById[id].lat - DOMICILIO.lat)));
  mapboxgl.accessToken = CONFIG.mapboxToken;
  const map = new mapboxgl.Map({
    container: "map", style: CONFIG.mapStyle,
    bounds: [[DOMICILIO.lon - scartoLon, DOMICILIO.lat - scartoLat], [DOMICILIO.lon + scartoLon, DOMICILIO.lat + scartoLat]],
    fitBoundsOptions: { padding: 50, pitch: VISTA_INCLINAZIONE },
    pitch: VISTA_INCLINAZIONE,
    minZoom: CONFIG.minZoom, maxZoom: CONFIG.maxZoom, language: "it",
    attributionControl: false, logoPosition: "bottom-right", // l'angolo in basso a sinistra è della legenda
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
  // Note di Mapbox e OpenStreetMap in forma compatta: un pulsante «i» che le apre al clic. Non si
  // possono togliere del tutto (le chiedono le condizioni d'uso di Mapbox e la licenza di OSM).
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
  let mappaPronta = false;

  // Legenda in basso a sinistra, con lo sfondo, come nel case manager (stesse classi .cm-legenda).
  const iconaCasa = (colore, lato) => `<svg width="${lato}" height="${lato}" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 4 L21 11 V20 H14 V14 H10 V20 H3 Z" fill="${colore}"></path></svg>`;
  document.getElementById("legenda").innerHTML = `
    <div class="cm-legenda__riga">
      <span class="cm-legenda__voce"><span class="cm-legenda__punto" style="background:${COLORI.sanitario}"></span>Sanitario</span>
      <span class="cm-legenda__voce"><span class="cm-legenda__punto" style="background:${COLORI.sociosanitario}"></span>Sociosanitario</span>
      <span class="cm-legenda__voce"><span class="cm-legenda__punto" style="background:${COLORI.sociale}"></span>Sociale</span>
    </div>
    <div class="cm-legenda__riga cm-legenda__riga--seconda">
      <span class="cm-legenda__voce"><span class="cm-legenda__casa">${iconaCasa("#FFFFFF", 8)}</span>Domicilio</span>
    </div>`;

  const featureIndexPerEnte = {};
  sullaMappa.forEach((e, i) => { featureIndexPerEnte[e.id] = i; });
  const chiaveColore = (e) => (COLORI[e.macro_dominio] ? e.macro_dominio : "altro");
  const geojsonEnti = {
    type: "FeatureCollection",
    features: sullaMappa.map((e, i) => ({
      type: "Feature", id: i,
      geometry: { type: "Point", coordinates: [e.lon, e.lat] },
      properties: { id: e.id, macro_dominio: e.macro_dominio, nome: e.nome },
    })),
  };

  const immaginiIcone = {}; // icone di categoria già caricate, per nome
  // Le proprietà che decidono l'aspetto di ogni marker, ricalcolate a ogni cambio di stato: acceso o
  // attenuato, e aperto (l'ente della scheda) con l'immagine della sua testa.
  function aggiornaMappa() {
    const { accesi, attenua } = luciEnti();
    const apertoId = stato.scheda ? stato.scheda.enteId : null;
    for (const f of geojsonEnti.features) {
      const e = enteById[f.properties.id];
      f.properties.acceso = !attenua || accesi.has(e.id) || e.id === apertoId;
      f.properties.aperto = e.id === apertoId;
      f.properties.testa = e.id === apertoId ? ["testa", chiaveColore(e), ICONA_PER_CATEGORIA[e.categoria_origine] || ""].join("|") : null;
    }
    if (!mappaPronta) return;
    for (const f of geojsonEnti.features) if (f.properties.testa) assicuraTesta(f.properties.testa);
    map.getSource("enti").setData(geojsonEnti);
  }
  aggiornaMappa();

  // La testa del marker aperto, disegnata su canvas alla taglia di zoom 14 (poi scalata con lo zoom):
  // bordo bianco, cerchio nel colore del dominio, icona di categoria. Come nel case manager.
  function assicuraTesta(nome) {
    if (map.hasImage(nome)) return;
    const [, chiave, icona] = nome.split("|");
    const colore = chiave === "altro" ? COLORE_CLUSTER : COLORI[chiave];
    const PR = 3, R = TESTA_RAGGIO[14];
    const lato = Math.ceil((R + TESTA_BORDO + 1) * 2), c = lato / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = lato * PR;
    const ctx = canvas.getContext("2d");
    ctx.scale(PR, PR);
    ctx.beginPath(); ctx.arc(c, c, R + TESTA_BORDO, 0, 2 * Math.PI); ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.beginPath(); ctx.arc(c, c, R, 0, 2 * Math.PI); ctx.fillStyle = colore; ctx.fill();
    const img = immaginiIcone[icona];
    if (img) { const d = 2 * R * TESTA_SCALA_ICONA; ctx.drawImage(img, c - d / 2, c - d / 2, d, d); }
    map.addImage(nome, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: PR });
  }

  // Fumetto «servizio presso ente»: componente comune (vedi creaFumetto in js/condiviso.js).
  const fumetto = creaFumetto(map);

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
      pitch: map.getPitch(), // mantiene l'inclinazione della vista
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

    // Linea dei minuti (domicilio → marker), sotto rami e marker: componente comune (condiviso.js).
    aggiungiLineeMinuti(map, "tempo-linea");

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

    // Domicilio: anche lui una puntina, come i marker dei servizi. Testa nera con il bordo bianco e
    // l'icona della casa, su un ago la cui punta cade sulle coordinate. Disegnato su canvas alla
    // taglia di zoom 14, poi scalato con lo zoom.
    map.addSource("domicilio", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "Point", coordinates: [DOMICILIO.lon, DOMICILIO.lat] }, properties: {} },
    });
    try {
      const casa = await caricaImmagine("icons/domicilio.png");
      const PR = 3;
      const R = RAGGIO_DOMICILIO[14];
      const lato = Math.ceil((R + BORDO_DOMICILIO + 1) * 2);
      const c = lato / 2;
      const altezza = Math.ceil(c + R + BORDO_DOMICILIO + AGO_LUNGHEZZA);
      const canvas = document.createElement("canvas");
      canvas.width = lato * PR;
      canvas.height = altezza * PR;
      const ctx = canvas.getContext("2d");
      ctx.scale(PR, PR);
      ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c, altezza);
      ctx.lineWidth = AGO_SPESSORE; ctx.strokeStyle = AGO_COLORE; ctx.stroke();
      ctx.beginPath(); ctx.arc(c, c, R + BORDO_DOMICILIO, 0, 2 * Math.PI); ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.beginPath(); ctx.arc(c, c, R, 0, 2 * Math.PI); ctx.fillStyle = "#000000"; ctx.fill();
      const d = 2 * R * SCALA_ICONA_DOMICILIO;
      ctx.drawImage(casa, c - d / 2, c - d / 2, d, d);
      map.addImage("domicilio-puntina", ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: PR });
      map.addLayer({
        id: "domicilio-icona", type: "symbol", source: "domicilio",
        layout: {
          "icon-image": "domicilio-puntina",
          "icon-anchor": "bottom", // la punta dell'ago sulle coordinate
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, RAGGIO_DOMICILIO[10] / R, 14, 1],
          "icon-allow-overlap": true, "icon-ignore-placement": true,
        },
      });
    } catch (err) { console.warn(err.message); }

    // Icone di categoria degli enti dello scenario: servono a disegnare le immagini dei marker.
    // Tutte le icone: anche un marker non pertinente, se cliccato, si apre con la sua icona.
    const nomiIcone = new Set(sullaMappa.map((e) => ICONA_PER_CATEGORIA[e.categoria_origine]).filter(Boolean));
    await Promise.all([...nomiIcone].map(async (nome) => {
      try {
        immaginiIcone[nome] = await caricaImmagine(`icons/2x/icon-${nome}@2x.png`);
      } catch (err) { console.warn(err.message); }
    }));

    // Enti: puntini chiusi (accesi o attenuati) e, sopra, il marker aperto. Tutta la rete resta
    // visibile in ogni tab, dentro e fuori dal cerchio allo stesso modo (il cerchio agisce solo sul
    // piano cartografico).
    map.addSource("enti", { type: "geojson", data: geojsonEnti });
    const coloreDominio = ["match", ["get", "macro_dominio"],
      "sanitario", COLORI.sanitario, "sociosanitario", COLORI.sociosanitario, "sociale", COLORI.sociale, COLORE_CLUSTER];
    map.addLayer({
      id: "enti-punti", type: "circle", source: "enti",
      paint: {
        // Il marker aperto non ha puntino: al suo posto la testa (livello "enti-aperto").
        "circle-radius": ["case", ["boolean", ["get", "aperto"], false], 0, PUNTINO_RAGGIO],
        "circle-color": coloreDominio,
        "circle-opacity": ["case", ["boolean", ["get", "acceso"], true], 1, OPACITA_ATTENUATA],
      },
    });
    map.addLayer({
      id: "enti-aperto", type: "symbol", source: "enti",
      filter: ["==", ["typeof", ["get", "testa"]], "string"],
      layout: {
        "icon-image": ["get", "testa"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 10, TESTA_RAGGIO[10] / TESTA_RAGGIO[14], 14, 1],
        "icon-allow-overlap": true, "icon-ignore-placement": true,
      },
    });

    mappaPronta = true;
    aggiornaRelazione();
    aggiornaMappa();
    if (stato.scheda) mostraLinea(lineaScelta, stato.scheda.enteId);

    // Hover su un puntino: il fumetto con il nome dell'ente (e la linea dei minuti); clic: si apre la
    // scheda dell'ente. Su un punto vuoto il clic chiude la scheda e torna ai tab.
    map.on("mousemove", "enti-punti", (ev) => {
      const f = ev.features[0];
      map.getCanvas().style.cursor = "pointer";
      if (evidenza !== f.properties.id) evidenzia(f.properties.id, { linea: true, fumetto: true });
    });
    map.on("mouseleave", "enti-punti", () => {
      map.getCanvas().style.cursor = "";
      spegniEvidenza();
    });
    mapEl.addEventListener("mouseleave", spegniEvidenza); // uscendo dalla mappa, anche sopra il fumetto
    map.on("click", (ev) => {
      const f = map.queryRenderedFeatures(ev.point, { layers: ["enti-punti"] })[0];
      if (f) apriScheda(f.properties.id);
      else if (!map.queryRenderedFeatures(ev.point, { layers: ["enti-aperto"] }).length) chiudiScheda();
    });

    // Il domicilio sopra a tutto (marker e rami compresi).
    if (map.getLayer("domicilio-icona")) map.moveLayer("domicilio-icona");
  });

  // ---------- evidenza (hover): voci delle liste e nomi nella chat evidenziati; con { linea: true }
  // anche la linea tratteggiata dal domicilio con il tempo a piedi (Ricevere b), con { fumetto: true }
  // (solo dal marker sulla mappa) il fumetto con il nome dell'ente. I marker non crescono in hover.
  let evidenza = null;

  // Due linee del tempo possibili insieme: quella del marker selezionato (resta finché è selezionato)
  // e quella del marker in hover. Ognuna ha la sua pillola (componente comune, vedi condiviso.js).
  function creaLinea(id) {
    // Pillola sintetica («11 min»), come nel case manager.
    return { id, pillola: creaPillolaMinuti(map, { sintetica: true }), ente: null, feature: null, timeout: null };
  }
  const lineaScelta = creaLinea(0);
  const lineaHover = creaLinea(1);
  const pubblicaLinee = () => map.getSource("tempo-linea").setData({
    type: "FeatureCollection", features: [lineaScelta, lineaHover].map((l) => l.feature).filter(Boolean),
  });

  // Ricalcola la linea e la posizione della pillola: gli estremi stanno a pochi pixel dalle punte
  // degli aghi (domicilio ed ente), che restano gli stessi a ogni zoom ma vanno riproiettati.
  function tracciaLinea(l) {
    const ente = enteById[l.ente];
    // Da punta d'ago a punta d'ago: dal luogo del domicilio al luogo dell'ente.
    const punti = arcoMinuti(map, [DOMICILIO.lon, DOMICILIO.lat], [ente.lon, ente.lat]);
    l.feature = { type: "Feature", id: l.id, properties: {}, geometry: { type: "LineString", coordinates: punti } };
    l.pillola.sposta(posizioniPilloleMinuti(map, [punti])[0]); // la pillola a metà dell'arco
  }
  function mostraLinea(l, enteId, { dissolvenza = true } = {}) {
    if (!mappaPronta) return;
    if (l.timeout) { clearTimeout(l.timeout); l.timeout = null; }
    l.ente = enteId;
    tracciaLinea(l);
    pubblicaLinee();
    l.pillola.mostra(posizioniPilloleMinuti(map, [l.feature.geometry.coordinates])[0], testoMinuti(minuti(enteId), { sintetica: true }));
    if (dissolvenza) {
      map.setFeatureState({ source: "tempo-linea", id: l.id }, { comparso: false });
      requestAnimationFrame(() => { if (l.ente === enteId) map.setFeatureState({ source: "tempo-linea", id: l.id }, { comparso: true }); });
    } else {
      map.setFeatureState({ source: "tempo-linea", id: l.id }, { comparso: true });
    }
  }
  function nascondiLinea(l, { subito = false } = {}) {
    if (l.ente == null) return;
    l.ente = null;
    map.setFeatureState({ source: "tempo-linea", id: l.id }, { comparso: false });
    l.pillola.nascondi();
    if (l.timeout) clearTimeout(l.timeout);
    const togli = () => { l.timeout = null; if (l.ente == null) { l.feature = null; pubblicaLinee(); } };
    if (subito) togli();
    else l.timeout = setTimeout(togli, TEMPO_LINEA_DISSOLVENZA_MS);
  }
  map.on("zoom", () => {
    const attive = [lineaScelta, lineaHover].filter((l) => l.ente != null);
    if (!attive.length) return;
    attive.forEach(tracciaLinea);
    pubblicaLinee();
  });

  function segnaElementi(enteId, attivo) {
    document.querySelectorAll(`.voce[data-ente="${enteId}"], .chat-nome[data-ente="${enteId}"]`)
      .forEach((el) => el.classList.toggle("in-evidenza", attivo));
  }
  function evidenzia(enteId, { linea, fumetto = false }) {
    spegniEvidenza();
    evidenza = enteId;
    segnaElementi(enteId, true);
    if (!mappaPronta) return;
    const selezionatoId = stato.scheda ? stato.scheda.enteId : null;
    // Il selezionato ha già la sua linea: niente seconda linea sopra la stessa.
    if (linea && enteId !== selezionatoId) mostraLinea(lineaHover, enteId);
    if (fumetto) mostraFumetto(enteId);
  }
  function spegniEvidenza() {
    if (evidenza == null) return;
    segnaElementi(evidenza, false);
    evidenza = null;
    if (!mappaPronta) return;
    nascondiLinea(lineaHover);
    fumetto.nascondi();
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
    const rel = stato.scheda && stato.scheda.servizio && tipo ? scenario.relazioni.find((r) => r.da === stato.scheda.enteId) : null;
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

  // ---------- fumetto in hover sul marker: il solo nome dell'ente, nel colore del suo dominio, con lo
  // stesso componente del case manager (fumettoServizio, creaFumetto). Non sul marker aperto.
  function mostraFumetto(enteId) {
    if (stato.scheda && stato.scheda.enteId === enteId) return;
    const ente = enteById[enteId];
    const linee = [lineaScelta.feature, lineaHover.feature, ...ramiCorrenti.features].filter(Boolean).map((f) => f.geometry.coordinates);
    fumetto.mostra([ente.lon, ente.lat], `<span style="color:${COLORI[ente.macro_dominio] || COLORE_CLUSTER}">${ente.nome}</span>`,
      { altezza: 0, raggio: PUNTINO_RAGGIO }, linee);
  }

  // ---------- schede (come nel case manager): dell'ente al clic su un marker, su una voce o su un
  // nome nella chat; del servizio al clic su un servizio della scheda dell'ente (rami accesi su
  // «Simili a questo»). La freccia indietro torna all'ente (rami spenti); la × chiude.
  function apriScheda(enteId) {
    if (stato.scheda && stato.scheda.enteId === enteId && !stato.scheda.servizio) return;
    stato.scheda = { enteId, servizio: null };
    stato.tipoRelazione = null;
    stato.infoAperte = false;
    aggiornaRelazione();
    aggiornaMappa();
    disegnaPannello();
    aggiornaChat();
    if (!mappaPronta) return;
    // Al clic il fumetto sparisce e compare la linea del tempo, che resta finché la scheda è aperta.
    fumetto.nascondi();
    const giaInHover = lineaHover.ente === enteId;
    nascondiLinea(lineaHover, { subito: true });
    nascondiLinea(lineaScelta, { subito: true });
    mostraLinea(lineaScelta, enteId, { dissolvenza: !giaInHover });
  }
  function scegliServizio(servizioId) {
    stato.scheda.servizio = servizioId;
    stato.tipoRelazione = "simili";
    aggiornaRelazione();
    aggiornaMappa();
    disegnaPannello();
  }
  function tornaAllEnte() {
    stato.scheda.servizio = null;
    stato.tipoRelazione = null;
    aggiornaRelazione();
    aggiornaMappa();
    disegnaPannello();
  }
  function chiudiScheda() {
    if (!stato.scheda) return;
    stato.scheda = null;
    stato.tipoRelazione = null;
    fumetto.nascondi();
    if (mappaPronta) nascondiLinea(lineaScelta);
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

  // ---------- tendina sinistra: due tab, oppure la scheda
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

  // ---------- schede dell'ente e del servizio: stesso markup e stesse classi del case manager (.cm-*,
  // sezione «Case manager» di css/style.css), dentro la tendina sinistra.
  const svgChiudi = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="#57554F" stroke-width="2" stroke-linecap="round"></path></svg>';
  const svgChevron = '<svg class="cm-servizio__freccia" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6 L15 12 L9 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const svgPedone = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2" fill="currentColor"></circle><path d="M9 21 L11 14 L14 16 L14 21 M11 14 L12 8 L16 11 L19 12 M12 8 L8 10 L7 13" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const svgIndicazioni = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L22 12 L12 22 L2 12 Z" stroke="#57554F" stroke-width="1.8" fill="none" stroke-linejoin="round"></path><path d="M9 14 V11 H15 M13 9 L15 11 L13 13" stroke="#57554F" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const svgSito = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="#57554F" stroke-width="1.8" fill="none"></circle><path d="M3 12 H21 M12 3 C 8 7, 8 17, 12 21 M12 3 C 16 7, 16 17, 12 21" stroke="#57554F" stroke-width="1.6" fill="none"></path></svg>';
  const svgFoto = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#6B6A65" stroke-width="1.6" fill="none"></rect><circle cx="9" cy="10" r="1.8" fill="#6B6A65"></circle><path d="M4 18 L10 13 L14 16 L17 13 L21 17" stroke="#6B6A65" stroke-width="1.6" fill="none" stroke-linejoin="round"></path></svg>';
  const svgIndietro = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 L9 12 L15 18" stroke="#57554F" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const svgFreccia = (su) => `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="${su ? "M6 15 L12 9 L18 15" : "M6 9 L12 15 L18 9"}" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  const etichetteCane = (ids, grandi) => `<div class="cm-etichette${grandi ? " cm-etichette--grandi" : ""}">${ids.map((b) => `<span class="cm-tag">${nomeBisogno(b)}</span>`).join("")}</div>`;
  // I servizi dell'ente, una volta sola ciascuno, nell'ordine dei bisogni del CANE.
  function serviziEnte(enteId) {
    const lista = servizi.filter((sv) => sv.sede === enteId);
    const ordine = bisogni.map((b) => b.id);
    const primo = (sv) => Math.min(...sv.bisogni.map((b) => (ordine.indexOf(b) + 1) || 999), 999);
    return lista.slice().sort((a, b) => primo(a) - primo(b));
  }
  const testoTempoScheda = (enteId) => `${minuti(enteId) ?? "—"} min a piedi dal domicilio`;

  function htmlSchedaEnte() {
    const e = enteById[stato.scheda.enteId];
    const lista = serviziEnte(e.id);
    const foto = FOTO_DEGLI_ENTI[e.id];
    const card = (sv) => `
      <button type="button" class="cm-servizio" data-servizio="${sv.id}">
        <span class="cm-servizio__testo">
          <span class="cm-servizio__nome">${titoloServizio(sv.id)}</span>
          ${etichetteCane(sv.bisogni, false)}
        </span>${svgChevron}
      </button>`;
    return `<div class="cm-scheda__pagina"><div class="cm-scheda__scorri">
      <div class="cm-intestazione">
        <div class="cm-intestazione__blocco">
          <div class="cm-intestazione__riga">
            <div class="cm-sopratitolo">${e.categoria_origine || e.categoria || ""}</div>
            <button type="button" class="cm-chiudi" data-azione="chiudi" aria-label="Chiudi la scheda">${svgChiudi}</button>
          </div>
          <h2 class="cm-titolo cm-titolo--ente">${e.nome}</h2>
          <div class="cm-indirizzo">${e.indirizzo || "[Indirizzo dell'ente], Milano"}</div>
        </div>
        <div class="cm-intestazione__azioni">
          <span class="cm-tempo">${svgPedone}${testoTempoScheda(e.id)}</span>
          <div class="cm-tondi">
            <button type="button" class="cm-tondo" aria-label="Indicazioni">${svgIndicazioni}</button>
            <button type="button" class="cm-tondo" aria-label="Sito dell'ente">${svgSito}</button>
          </div>
        </div>
      </div>
      <div class="cm-foto">${foto ? `<img class="cm-foto__immagine" src="${foto}" alt="${e.nome}">` : `${svgFoto}Foto dell'ente`}</div>
      <div class="cm-servizi-titolo"><span>Servizi offerti</span><span class="cm-servizi-titolo__conta">${lista.length}</span></div>
      ${lista.length ? `<div class="cm-lista cm-lista--ultima">${lista.map(card).join("")}</div>` : '<p class="cm-vuoto">Nessun servizio registrato per questo ente.</p>'}
      <div class="cm-info">
        <button type="button" class="cm-info__testata" data-azione="info" aria-expanded="${!!stato.infoAperte}">
          <span class="cm-info__titoli"><span class="cm-info__titolo">Informazioni sull'ente</span><span class="cm-info__sottotitolo">Orari, contatti, descrizione</span></span>
          <span class="cm-info__freccia">${svgFreccia(stato.infoAperte)}</span>
        </button>
        ${stato.infoAperte ? `<div class="cm-righe cm-righe--info">
          <div class="cm-righe__riga"><span>Orari</span><span>[Giorni e orari di apertura]</span></div>
          <div class="cm-righe__riga"><span>Contatti</span><span>[Telefono · email]</span></div>
          <div class="cm-righe__riga"><span>Descrizione</span><span>[Breve descrizione dell'ente]</span></div>
        </div>` : ""}
      </div>
    </div></div>`;
  }

  // Le relazioni del caregiver nel riquadro della scheda del servizio, con il campione del ramo
  // come nel case manager: «Simili a questo» = l'equivalenza (freccia doppia), «Anche per te» =
  // «Anche per chi assiste» (tratteggio tenue).
  const RELAZIONI_CAREGIVER = [
    { tipo: "simili", nome: "Simili a questo", frecciaFine: true, frecciaInizio: true },
    { tipo: "anche_per_te", nome: "Anche per te", tratteggio: true },
  ];
  function htmlSchedaServizio() {
    const { enteId, servizio: id } = stato.scheda;
    const e = enteById[enteId];
    const sv = servizioById[id];
    const rel = scenario.relazioni.find((r) => r.da === enteId);
    const relazioni = RELAZIONI_CAREGIVER.map((r) => {
      const n = rel ? rel[r.tipo].length : 0;
      const attiva = stato.tipoRelazione === r.tipo;
      return `<button type="button" class="cm-relazione${attiva ? " attiva" : ""}" data-relazione="${r.tipo}" aria-pressed="${attiva}">
        <svg class="cm-relazione__campione" width="40" height="12" viewBox="0 0 40 12" aria-hidden="true">
          <path d="M3 6 H37" stroke="currentColor" stroke-width="2.2" fill="none"${r.tratteggio ? ' stroke-dasharray="4 3" opacity="0.7"' : ""}></path>
          ${r.frecciaFine ? '<path d="M32 2 L37 6 L32 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>' : ""}
          ${r.frecciaInizio ? '<path d="M8 2 L3 6 L8 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>' : ""}
        </svg>
        <span class="cm-relazione__nome">${r.nome}</span>
        <span class="cm-relazione__conta">${n} ${n === 1 ? "collegato" : "collegati"}</span>
      </button>`;
    }).join("");
    const salvato = isSalvato(id);
    return `<div class="cm-scheda__pagina"><div class="cm-scheda__scorri">
      <div class="cm-servizio-testata">
        <button type="button" class="cm-indietro" data-azione="indietro">${svgIndietro}${e.nome}</button>
        <button type="button" class="cm-chiudi" data-azione="chiudi" aria-label="Chiudi la scheda">${svgChiudi}</button>
      </div>
      <div class="cm-intestazione cm-intestazione--servizio">
        <div class="cm-intestazione__blocco">
          <div class="cm-sopratitolo">Servizio · ${e.categoria_origine || e.categoria || ""}</div>
          <h2 class="cm-titolo">${titoloServizio(id)}</h2>
        </div>
        ${etichetteCane(sv.bisogni, true)}
        <button type="button" class="scheda__salva" data-azione="salva"${salvato ? " disabled" : ""}>${iconaSegnalibro(salvato)} ${salvato ? "Salvato" : "Salva"}</button>
      </div>
      <div class="cm-relazioni">
        <div class="cm-gruppo-titolo cm-gruppo-titolo--relazioni">Relazioni sulla mappa</div>
        ${relazioni}
      </div>
      <div class="cm-righe">
        <div class="cm-righe__riga"><span>Orari</span><span>[Giorni e orari del servizio]</span></div>
        <div class="cm-righe__riga"><span>Contatti</span><span>[Referente · telefono · email]</span></div>
        <div class="cm-righe__riga"><span>Descrizione</span><span>${sv.descrizione || "[Breve descrizione del servizio]"}</span></div>
      </div>
    </div></div>`;
  }

  function disegnaPannello() {
    spegniEvidenza();
    if (stato.scheda) {
      const e = enteById[stato.scheda.enteId];
      panelDx.style.setProperty("--dominio", COLORI[e.macro_dominio] || COLORE_CLUSTER);
      panelDx.innerHTML = stato.scheda.servizio ? htmlSchedaServizio() : htmlSchedaEnte();
    } else {
      const tab = (id, testo, extra = "") =>
        `<button type="button" class="tab${stato.tab === id ? " attivo" : ""}" role="tab" aria-selected="${stato.tab === id}" data-tab="${id}">${testo}${extra}</button>`;
      const novita = stato.novitaConsigliati ? '<span class="tab__novita" title="Novità"></span>' : "";
      panelDx.innerHTML = `
        <div class="tabs" role="tablist">
          ${tab("consigliati", "Consigliati", novita)}
          ${tab("luoghi", "I miei luoghi")}
        </div>
        <div class="tab-corpo">
          ${stato.tab === "luoghi" ? htmlLuoghi() : stato.pacchetti.map(htmlPacchetto).join("")}
        </div>`;
    }
  }

  // Un solo gestore per tutta la tendina sinistra (il suo contenuto viene riscritto a ogni cambio).
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
    // Clic sulla proposta (la sua testata o l'interruttore): si attiva o si spegne sulla mappa.
    if (p && (t.closest(".interruttore") || t.closest(".pacchetto__titolo"))) {
      p.acceso = !p.acceso;
      if (p.acceso) p.aperto = true;
      aggiornaMappa();
      disegnaPannello();
      return;
    }
    const voce = t.closest(".voce");
    if (voce) { apriScheda(voce.dataset.ente); return; }
    const azione = t.closest("[data-azione]");
    if (azione) {
      const a = azione.dataset.azione;
      if (a === "chiudi") chiudiScheda();
      else if (a === "indietro") tornaAllEnte();
      else if (a === "info") { stato.infoAperte = !stato.infoAperte; disegnaPannello(); }
      else if (a === "salva") salva([stato.scheda.servizio]);
      return;
    }
    const servizio = t.closest("[data-servizio]");
    if (servizio) { scegliServizio(servizio.dataset.servizio); return; }
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

  // ---------- chat (tendina destra): si comprime verso destra
  chatComprimi.addEventListener("click", () => {
    const chiusa = appEl.classList.toggle("chat-chiusa");
    chatComprimi.textContent = chiusa ? "‹" : "›";
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

  // Un nome nella risposta: nel colore del dominio dell'ente, in grassetto, senza sfondo; hover →
  // evidenza; clic → scheda dell'ente; segnalibro → salva.
  function nomeServizio(risposta, enteId, testo) {
    const ids = serviziRispostaAEnte(risposta, enteId);
    const span = document.createElement("span");
    span.className = "chat-nome";
    span.dataset.ente = enteId;
    span.dataset.servizi = ids.join(",");
    span.innerHTML = `<button type="button" class="chat-nome__testo" style="color:${COLORI[enteById[enteId].macro_dominio] || COLORE_CLUSTER}">${testo}</button>`
      + `<button type="button" class="segnalibro" aria-label="Salva ${testo}" title="Salva">${iconaSegnalibro(false)}</button>`;
    const [btnNome, btnSalva] = span.children;
    btnNome.addEventListener("mouseenter", () => evidenzia(enteId, { linea: false }));
    btnNome.addEventListener("mouseleave", spegniEvidenza);
    btnNome.addEventListener("click", () => apriScheda(enteId));
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
