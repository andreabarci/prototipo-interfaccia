// Prototipo · pagina del caregiver, scenario A (vedi brief-caregiver-claude-code-2.md, che aggiorna il
// primo brief). Riusa i dati, lo stile della mappa e le funzioni comuni in js/condiviso.js; non
// modifica js/app.js. Disposizione: tendina sinistra sempre aperta con due tab («I miei luoghi»,
// «Consigliati») o la scheda del marker, mappa al centro, chat nella tendina destra (comprimibile).

// ---------- marker: stati e grafica provvisoria, tutti qui perché Andrea possa ritoccarli a mano
// senza toccare la logica. Cinque stati (vedi il brief): salvato, consigliato, scoperto,
// selezionato, attenuato. Salvato e scoperto sono cerchi, consigliato è un rombo (forma diversa dai
// salvati, come chiede il brief); il selezionato tiene la sua forma e prende un bordo nero.
// Nome dell'ente accanto al marker non pertinente in hover: stesso carattere, taglia e contorno
// delle etichette della mappa (vedi strumenti/crea_stile_caregiver.py), colore del macrodominio.
const NOME_ATTENUATO_CARATTERE = ["Open Sans Regular", "Arial Unicode MS Regular"];
const NOME_ATTENUATO_DIMENSIONE = 11; // px, come i luoghi di contesto della mappa
const NOME_ATTENUATO_CONTORNO = "#F6F1E7"; // il fondo della mappa
const NOME_ATTENUATO_CONTORNO_SPESSORE = 1.2;
const NOME_ATTENUATO_MARGINE = 4; // px fra il bordo del marker e il nome
const MARKER_RAGGIO_ATTENUATO = 4 * 1.2; // il resto della rete: piccolo, fisso (4 px + 20%)
// Misure riprese dal case manager (js/app.js), copiate qui perché le due pagine non condividono
// queste costanti, e poi ridotte tutte insieme di SCALA_CAREGIVER (raggi e bordi; non l'ingrandimento
// in hover, che è un rapporto). Il raggio cresce con lo zoom fra le due fermate 10 e 14, come là.
const SCALA_CAREGIVER = 0.7 * 1.2; // −30% rispetto al marker cliccato del case manager, poi +20%
const MARKER_RAGGIO = { 10: 8.75 * SCALA_CAREGIVER, 14: 17.5 * SCALA_CAREGIVER }; // RAGGIO_GRANDE del case manager
const MARKER_FATTORE_HOVER = 1.15; // = FATTORE_HOVER_MARKER: in hover, e da selezionato
const RAGGIO_DOMICILIO = { 10: 8.75 * SCALA_CAREGIVER, 14: 17.5 * SCALA_CAREGIVER }; // RAGGIO_GRANDE
const BORDO_DOMICILIO = 3 * SCALA_CAREGIVER; // BORDO_GRANDE
const SCALA_ICONA_DOMICILIO = 0.55; // = SCALA_ICONA
const MARKER_BORDO = 3 * SCALA_CAREGIVER; // BORDO_GRANDE, bianco: salvato e consigliato
const MARKER_ROMBO_RAPPORTO = 1.4; // mezza diagonale del rombo / raggio del cerchio, a pari area visiva
const MARKER_OPACITA_ATTENUATA = 1; // pieni, nessuna trasparenza: si distinguono solo per la taglia
const MARKER_OPACITA_SCOPERTO = 0.85; // pieno ma un poco meno dei salvati, senza bordo
const MARKER_BORDO_SELEZIONATO = 3 * SCALA_CAREGIVER;
const MARKER_COLORE_SELEZIONATO = "#1d2428";
const MARKER_SCALA_ICONA = 0.55; // quanta parte del diametro occupa l'icona di categoria
// Marker dei servizi a puntina: la testa (cerchio o rombo, con l'icona) poggia su un ago, la cui
// punta cade esattamente sulle coordinate. I marker non pertinenti restano cerchietti piatti.
const AGO_LUNGHEZZA = 12; // px visibili sotto la testa, alla taglia di zoom 14 (poi scala con il marker)
const AGO_SPESSORE = 1.5; // px
const AGO_COLORE = "#5C554D"; // il marrone scuro del testo delle pillole
// Distanza fra la punta dell'ago e il centro della testa, alla taglia di zoom 14: fissa per forma
// (il bordo più spesso, quello del selezionato, così la testa non salta quando lo si seleziona).
const altezzaTesta = (forma) =>
  (forma === "rombo" ? MARKER_RAGGIO[14] * MARKER_ROMBO_RAPPORTO : MARKER_RAGGIO[14]) + MARKER_BORDO_SELEZIONATO + AGO_LUNGHEZZA;
// Raggio in px a uno zoom qualsiasi, fra le fermate 10 e 14 (come l'interpolazione di Mapbox).
const raggioAZoom = (fermate, zoom) => {
  const t = Math.max(0, Math.min(1, (zoom - 10) / 4));
  return fermate[10] + (fermate[14] - fermate[10]) * t;
};

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
// Linea dei minuti a piedi (domicilio → marker), solo in questa pagina: leggermente arcuata e
// sempre convessa verso l'alto (un arco, qualunque sia la direzione), a trattini, spessa come il
// contorno della pillola, di colore doppio rispetto alla traccia del cerchio (stessa opacità, grigio più scuro: il
// doppio di "inchiostro" sul fondo). La pillola è in css/style.css (.pillola-tempo--caregiver): il suo
// contorno è nel grigio con cui la linea appare a schermo (più chiaro del suo colore, perché la
// mappa ammorbidisce i bordi delle linee sottili): se cambi LINEA_MINUTI_COLORE, ritoccalo a occhio.
const LINEA_MINUTI_CURVATURA = 0.11; // i rami ne hanno 0,15: questa è un po' meno arcuata
const LINEA_MINUTI_COLORE = "#474747"; // doppio del grigio della traccia del cerchio (#A3A3A3)
const LINEA_MINUTI_OPACITA = 1; // nessuna trasparenza
const LINEA_MINUTI_SPESSORE = 0.75; // px
const LINEA_MINUTI_TRATTO = 2; // px
const LINEA_MINUTI_VUOTO = 2; // px
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
    tab: "luoghi", // «I miei luoghi» attivo all'apertura
    novitaConsigliati: true, // la proposta del case manager arriva come novità
    pacchetti: [{
      id: "case-manager", tipo: "case-manager", nome: cm.titolo, data: cm.data, testo: cm.commento,
      voci: cm.servizi.map((v) => ({ servizio: v.servizio, bisogni: [v.bisogno] })),
      aperto: true, acceso: true,
    }],
    scheda: null, // { enteId, servizi: [id, ...] } quando la tendina sinistra mostra la scheda del marker
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
    fitBoundsOptions: { padding: 50, pitch: VISTA_INCLINAZIONE },
    pitch: VISTA_INCLINAZIONE,
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
      properties: { id: e.id, macro_dominio: e.macro_dominio, nome: e.nome },
    })),
  };

  // Ente in hover (marker, voce di una lista, nome nella chat): il suo marker si ingrandisce.
  let enteInHover = null;
  const immaginiIcone = {}; // icone di categoria già caricate, per nome
  // Nome dell'immagine di un marker in vista: forma (cerchio, o rombo se consigliato), colore,
  // bordo (selezionato nero, salvato e consigliato bianco, scoperto senza) e icona di categoria.
  function nomeImmagineMarker(e, s, selezionato) {
    const forma = s === "consigliato" ? "rombo" : "cerchio";
    const bordo = selezionato ? "sel" : s === "scoperto" ? "nudo" : "bianco";
    return ["marker", forma, chiaveColore(e), bordo, ICONA_PER_CATEGORIA[e.categoria_origine] || ""].join("|");
  }
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
      // Ingrandito: in hover, e da selezionato resta così anche quando il cursore se ne va.
      f.properties.ingrandito = inVista && (selezionato || e.id === enteInHover);
      // Il marker in vista è un'immagine unica (forma, bordo e icona insieme): così due marker vicini
      // si sovrappongono interi, senza che l'icona dell'uno finisca sopra la forma dell'altro.
      f.properties.immagine = inVista ? nomeImmagineMarker(e, s, selezionato) : null;
    }
    if (!mappaPronta) return;
    for (const f of geojsonEnti.features) if (f.properties.immagine) assicuraImmagineMarker(f.properties.immagine);
    map.getSource("enti").setData(geojsonEnti);
  }
  aggiornaMappa();
  const inVista = (f) => f.properties.stato !== "attenuato" || f.properties.selezionato;

  // Disegna su canvas l'immagine di un marker, alla taglia di zoom 14 (poi scalata con icon-size).
  function assicuraImmagineMarker(nome) {
    if (map.hasImage(nome)) return;
    const [, forma, chiave, bordoTipo, icona] = nome.split("|");
    const colore = chiave === "altro" ? COLORE_CLUSTER : COLORI[chiave];
    const bordo = bordoTipo === "sel" ? MARKER_BORDO_SELEZIONATO : bordoTipo === "bianco" ? MARKER_BORDO : 0;
    const coloreBordo = bordoTipo === "sel" ? MARKER_COLORE_SELEZIONATO : "#ffffff";
    const PR = 3; // definizione alta: l'immagine viene anche ingrandita in hover
    const R = MARKER_RAGGIO[14];
    const meta = R * MARKER_ROMBO_RAPPORTO;
    // Larghezza: la testa più grande possibile; altezza: dalla cima della testa alla punta dell'ago,
    // che è il bordo inferiore dell'immagine (icon-anchor "bottom" = le coordinate).
    const lato = Math.ceil((meta + MARKER_BORDO_SELEZIONATO + 1) * 2);
    const c = lato / 2;
    const altezza = Math.ceil(c + altezzaTesta(forma));
    const canvas = document.createElement("canvas");
    canvas.width = lato * PR;
    canvas.height = altezza * PR;
    const ctx = canvas.getContext("2d");
    ctx.scale(PR, PR);
    const cy = altezza - altezzaTesta(forma); // centro della testa
    // L'ago, sotto la testa.
    ctx.beginPath();
    ctx.moveTo(c, cy);
    ctx.lineTo(c, altezza);
    ctx.lineWidth = AGO_SPESSORE;
    ctx.strokeStyle = AGO_COLORE;
    ctx.stroke();
    ctx.translate(0, cy - c); // da qui in poi la testa si disegna come prima, centrata in (c, c)
    ctx.beginPath();
    if (forma === "rombo") {
      ctx.moveTo(c, c - meta); ctx.lineTo(c + meta, c); ctx.lineTo(c, c + meta); ctx.lineTo(c - meta, c);
      ctx.closePath();
      ctx.fillStyle = colore;
      ctx.fill();
      if (bordo) { ctx.lineJoin = "round"; ctx.lineWidth = bordo; ctx.strokeStyle = coloreBordo; ctx.stroke(); }
    } else {
      // Come il circle-stroke di Mapbox: il bordo sta tutto fuori dal raggio.
      if (bordo) { ctx.arc(c, c, R + bordo, 0, 2 * Math.PI); ctx.fillStyle = coloreBordo; ctx.fill(); ctx.beginPath(); }
      ctx.arc(c, c, R, 0, 2 * Math.PI);
      ctx.fillStyle = colore;
      ctx.fill();
    }
    const img = immaginiIcone[icona];
    if (img) {
      const d = 2 * R * MARKER_SCALA_ICONA;
      ctx.drawImage(img, c - d / 2, c - d / 2, d, d);
    }
    map.addImage(nome, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: PR });
  }

  const popupServizio = new mapboxgl.Popup({
    closeButton: false, closeOnClick: false, focusAfterOpen: false,
    // Simmetrico, con la punta al centro di un lato del marker: quale lato lo sceglie
    // ancoraggioFumetto, la distanza mostraFumetto.
    anchor: "bottom", className: "popup-servizio popup-servizio--caregiver",
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

    // Linea dei minuti (domicilio → marker): appena arcuata, a trattini, sotto rami e marker.
    map.addSource("tempo-linea", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "tempo-linea", type: "line", source: "tempo-linea", layout: { "line-cap": "butt", "line-join": "round" },
      paint: {
        "line-color": LINEA_MINUTI_COLORE,
        "line-width": LINEA_MINUTI_SPESSORE,
        "line-dasharray": [LINEA_MINUTI_TRATTO / LINEA_MINUTI_SPESSORE, LINEA_MINUTI_VUOTO / LINEA_MINUTI_SPESSORE],
        "line-opacity": ["case", ["boolean", ["feature-state", "comparso"], false], LINEA_MINUTI_OPACITA, 0],
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

    // Enti: cerchietti attenuati sotto, marker in vista sopra (un'immagine ciascuno). Tutta la
    // rete resta visibile in ogni tab: gli enti senza un altro stato sono attenuati, dentro e fuori dal
    // cerchio allo stesso modo (il cerchio agisce solo sul piano cartografico).
    map.addSource("enti", { type: "geojson", data: geojsonEnti });
    const ingrandito = ["boolean", ["get", "ingrandito"], false];
    // Scala dell'immagine del marker (disegnata alla taglia di zoom 14), per fermata di zoom: base,
    // oppure × MARKER_FATTORE_HOVER se ingrandito. Lo scatto è immediato, senza transizione, come nel
    // case manager. Lo zoom deve restare il livello più esterno dell'espressione (regola di Mapbox).
    const fermata = (z) => ["case", ingrandito,
      (MARKER_RAGGIO[z] / MARKER_RAGGIO[14]) * MARKER_FATTORE_HOVER, MARKER_RAGGIO[z] / MARKER_RAGGIO[14]];
    const coloreDominio = ["match", ["get", "macro_dominio"],
      "sanitario", COLORI.sanitario, "sociosanitario", COLORI.sociosanitario, "sociale", COLORI.sociale, COLORE_CLUSTER];
    // Il marker non pertinente in hover (feature-state "hover"): un po' più grande, sempre cerchio
    // senza icona, con il nome dell'ente accanto (livello "enti-nome", più sotto).
    const attenuatoInHover = ["boolean", ["feature-state", "hover"], false];
    map.addLayer({
      id: "enti-cerchio", type: "circle", source: "enti",
      filter: ["==", ["typeof", ["get", "immagine"]], "null"],
      paint: {
        "circle-radius": ["case", attenuatoInHover, MARKER_RAGGIO_ATTENUATO * MARKER_FATTORE_HOVER, MARKER_RAGGIO_ATTENUATO],
        "circle-color": coloreDominio,
        "circle-opacity": MARKER_OPACITA_ATTENUATA,
      },
    });
    map.addLayer({
      id: "enti-marker", type: "symbol", source: "enti",
      filter: ["==", ["typeof", ["get", "immagine"]], "string"],
      layout: {
        "icon-image": ["get", "immagine"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 10, fermata(10), 14, fermata(14)],
        "icon-anchor": "bottom", // la punta dell'ago sulle coordinate
        "icon-allow-overlap": true, "icon-ignore-placement": true,
        // Il marker ingrandito (hover o selezionato) sta sopra gli altri.
        "symbol-sort-key": ["case", ingrandito, 1, 0],
        "symbol-z-order": "source",
      },
      paint: { "icon-opacity": ["case", ["==", ["get", "stato"], "scoperto"], MARKER_OPACITA_SCOPERTO, 1] },
    });
    // Area sensibile al mouse: un cerchio invisibile grande quanto il marker. Le immagini, da sole,
    // rispondono su un'area più piccola di quella che si vede. Stesso ordine dei marker (sort key).
    // Sta sulla testa della puntina, sopra le coordinate: uno per forma, perché la testa del rombo
    // è più alta. (Lo spostamento non può dipendere dal dato, solo dallo zoom.)
    const raggioArea = (z) => ["case", ingrandito,
      MARKER_RAGGIO[z] * MARKER_FATTORE_HOVER + MARKER_BORDO, MARKER_RAGGIO[z] + MARKER_BORDO];
    for (const forma of ["cerchio", "rombo"]) {
      const su = (z) => [0, -altezzaTesta(forma) * (MARKER_RAGGIO[z] / MARKER_RAGGIO[14])];
      map.addLayer({
        id: "enti-area-" + forma, type: "circle", source: "enti",
        filter: ["all", ["==", ["typeof", ["get", "immagine"]], "string"],
          [forma === "rombo" ? "==" : "!=", ["get", "stato"], "consigliato"]],
        layout: { "circle-sort-key": ["case", ingrandito, 1, 0] },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, raggioArea(10), 14, raggioArea(14)],
          "circle-translate": ["interpolate", ["linear"], ["zoom"], 10, ["literal", su(10)], 14, ["literal", su(14)]],
          "circle-opacity": 0,
        },
      });
    }
    map.addLayer({
      id: "enti-nome", type: "symbol", source: "enti",
      filter: ["==", ["typeof", ["get", "immagine"]], "null"],
      layout: {
        "text-field": ["get", "nome"],
        "text-font": NOME_ATTENUATO_CARATTERE,
        "text-size": NOME_ATTENUATO_DIMENSIONE,
        "text-anchor": "left",
        "text-justify": "left", // su due righe, allineate a sinistra verso il marker
        "text-offset": [(MARKER_RAGGIO_ATTENUATO * MARKER_FATTORE_HOVER + NOME_ATTENUATO_MARGINE) / NOME_ATTENUATO_DIMENSIONE, 0],
        "text-max-width": 14,
        "text-allow-overlap": true, "text-ignore-placement": true,
      },
      paint: {
        "text-color": coloreDominio,
        "text-halo-color": NOME_ATTENUATO_CONTORNO,
        "text-halo-width": NOME_ATTENUATO_CONTORNO_SPESSORE,
        "text-opacity": ["case", attenuatoInHover, 1, 0],
      },
    });

    mappaPronta = true;
    aggiornaRelazione();
    aggiornaMappa();
    if (stato.scheda) mostraLinea(lineaScelta, stato.scheda.enteId);

    // Hover e clic sui marker in vista (gli attenuati non rispondono).
    const LAYER_MARKER = ["enti-area-cerchio", "enti-area-rombo"];
    const markerSotto = (ev) => (ev.features || []).find(inVista);
    map.on("mousemove", LAYER_MARKER, (ev) => {
      const f = markerSotto(ev);
      map.getCanvas().style.cursor = f ? "pointer" : "";
      if (!f) { spegniEvidenza(); return; }
      if (evidenza !== f.properties.id) evidenzia(f.properties.id, { linea: true, fumetto: true });
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
    // Hover su un marker non pertinente: si ingrandisce e mostra il nome dell'ente. Al clic si apre
    // come gli altri (marker con icona e scheda nella tendina sinistra, con tutti i servizi presso
    // l'ente). Se sotto il cursore c'è anche un marker in vista, vince quello.
    let attenuatoHover = null;
    const spegniAttenuato = () => {
      if (attenuatoHover == null) return;
      map.setFeatureState({ source: "enti", id: attenuatoHover }, { hover: false });
      attenuatoHover = null;
    };
    map.on("mousemove", (ev) => {
      const sopraInVista = map.queryRenderedFeatures(ev.point, { layers: LAYER_MARKER }).some(inVista);
      const f = sopraInVista ? null : map.queryRenderedFeatures(ev.point, { layers: ["enti-cerchio"] })[0];
      const id = f ? f.id : null;
      if (!sopraInVista) map.getCanvas().style.cursor = id != null ? "pointer" : "";
      if (id === attenuatoHover) return;
      spegniAttenuato();
      if (id != null) { attenuatoHover = id; map.setFeatureState({ source: "enti", id }, { hover: true }); }
    });
    mapEl.addEventListener("mouseleave", spegniAttenuato);
    // Clic: su un marker non pertinente lo apre; su un punto vuoto chiude la scheda e torna al tab.
    map.on("click", (ev) => {
      const sotto = map.queryRenderedFeatures(ev.point, { layers: LAYER_MARKER }).filter(inVista);
      if (sotto.length) return;
      const f = map.queryRenderedFeatures(ev.point, { layers: ["enti-cerchio"] })[0];
      const serviziQui = f ? serviziPresso(f.properties.id) : [];
      if (serviziQui.length) { spegniAttenuato(); apriScheda(f.properties.id, serviziQui, { rami: true }); }
      else chiudiScheda();
    });
  });

  // ---------- evidenza (hover): marker ingrandito, voci delle liste e nomi nella chat evidenziati;
  // con { linea: true } anche la linea tratteggiata dal domicilio con il tempo a piedi (Ricevere b),
  // con { fumetto: true } (solo dal marker sulla mappa) il fumetto con il nome del servizio.
  let evidenza = null;

  // Due linee del tempo possibili insieme: quella del marker selezionato (resta finché è selezionato)
  // e quella del marker in hover. Ognuna ha la sua pillola. La pillola sta dentro un contenitore:
  // Mapbox scrive un'opacità in linea sull'elemento del marker, che vincerebbe sulla classe .mostra.
  function creaLinea(id) {
    const pillola = Object.assign(document.createElement("div"), { className: "pillola-tempo pillola-tempo--caregiver" });
    const contenitore = Object.assign(document.createElement("div"), { className: "pillola-contenitore" });
    contenitore.append(pillola);
    const etichetta = new mapboxgl.Marker({ element: contenitore, anchor: "center" }).setLngLat([0, 0]).addTo(map);
    return { id, pillola, etichetta, ente: null, feature: null, timeout: null };
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
    const seg = segmentoLineaTempo(map, [DOMICILIO.lon, DOMICILIO.lat], 0,
      [ente.lon, ente.lat], 0); // arriva alla punta dell'ago, cioè al luogo
    const [a, b] = seg.geometry.coordinates;
    // campionaCurva piega verso destra guardando da a verso b: per avere sempre la pancia verso
    // l'alto, si inverte il verso quando andando da a a b si va verso est (la destra è il sud).
    const versoEst = map.project(b).x > map.project(a).x;
    const punti = versoEst ? campionaCurva(b, a, LINEA_MINUTI_CURVATURA).reverse() : campionaCurva(a, b, LINEA_MINUTI_CURVATURA);
    l.feature = { ...seg, id: l.id, geometry: { type: "LineString", coordinates: punti } };
    l.etichetta.setLngLat(punti[Math.floor(punti.length / 2)]); // la pillola a metà dell'arco
  }
  function mostraLinea(l, enteId, { dissolvenza = true } = {}) {
    if (!mappaPronta) return;
    if (l.timeout) { clearTimeout(l.timeout); l.timeout = null; }
    l.ente = enteId;
    tracciaLinea(l);
    pubblicaLinee();
    const m = minuti(enteId);
    l.pillola.innerHTML = pillolaTempoHtml(m == null ? "—" : "a " + m + " min");
    l.pillola.classList.add("mostra");
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
    l.pillola.classList.remove("mostra");
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
    enteInHover = enteId;
    segnaElementi(enteId, true);
    if (!mappaPronta) return;
    aggiornaMappa();
    const selezionatoId = stato.scheda ? stato.scheda.enteId : null;
    // Il selezionato ha già la sua linea: niente seconda linea sopra la stessa.
    if (linea && enteId !== selezionatoId) mostraLinea(lineaHover, enteId);
    if (fumetto) mostraFumetto(enteId);
  }
  function spegniEvidenza() {
    if (evidenza == null) return;
    segnaElementi(evidenza, false);
    evidenza = null;
    enteInHover = null;
    if (!mappaPronta) return;
    aggiornaMappa();
    nascondiLinea(lineaHover);
    popupServizio.remove();
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

  // Da che lato del marker esce il fumetto: sopra, sotto, a destra o a sinistra, quello che copre
  // meno la linea dei minuti e i rami che arrivano al marker. A parità, sopra. Evita anche i lati in
  // cui il fumetto uscirebbe dalla mappa.
  const FUMETTO_LATI = [ // "anchor" di Mapbox = il lato del fumetto agganciato al marker
    { anchor: "bottom", v: [0, -1] }, // fumetto sopra
    { anchor: "top", v: [0, 1] }, // sotto
    { anchor: "left", v: [1, 0] }, // a destra
    { anchor: "right", v: [-1, 0] }, // a sinistra
  ];
  const FUMETTO_MARGINE_BASSO = 60; // px in fondo alla mappa riservati alla pillola del quartiere
  const FUMETTO_SOTTO_AGO = 4; // px fra la punta dell'ago e il fumetto, quando esce sotto
  // ingombro: larghezza e altezza vere del fumetto, misurate dopo averlo disegnato.
  function ancoraggioFumetto(ente, testa, ingombro) {
    const p = map.project([ente.lon, ente.lat]); // la punta dell'ago
    const raggio = testa.raggio;
    // Direzioni (dal marker) delle linee che partono o arrivano qui: un punto un po' dentro la linea.
    const direzioni = [];
    const linee = [lineaScelta.feature, lineaHover.feature, ...ramiCorrenti.features].filter(Boolean);
    for (const f of linee) {
      const c = f.geometry.coordinates;
      for (const [capo, verso] of [[0, 1], [c.length - 1, -1]]) {
        const q0 = map.project(c[capo]);
        if (Math.hypot(q0.x - p.x, q0.y - p.y) > raggio + 12) continue;
        const q = map.project(c[capo + verso * Math.max(1, Math.round(c.length * 0.15))]);
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d > 0) direzioni.push([(q.x - p.x) / d, (q.y - p.y) / d]);
      }
    }
    const { width: W, height: H } = map.getCanvas().getBoundingClientRect();
    const fuori = {
      bottom: p.y - testa.altezza - raggio - ingombro.altezza < 0,
      top: p.y + FUMETTO_SOTTO_AGO + ingombro.altezza > H - FUMETTO_MARGINE_BASSO,
      left: p.x + raggio + ingombro.larghezza > W,
      right: p.x - raggio - ingombro.larghezza < 0,
    };
    let migliore = null;
    for (const lato of FUMETTO_LATI) {
      // Quanto il lato "guarda" verso la linea più vicina: 1 = proprio sopra, −1 = dalla parte opposta.
      let punteggio = direzioni.reduce((m, d) => Math.max(m, lato.v[0] * d[0] + lato.v[1] * d[1]), -1);
      if (fuori[lato.anchor]) punteggio += 2;
      if (!migliore || punteggio < migliore.punteggio - 0.01) migliore = { anchor: lato.anchor, punteggio };
    }
    return migliore.anchor;
  }

  // Fumetto con il nome del servizio: solo in hover sul marker (non al clic).
  function mostraFumetto(enteId) {
    const ente = enteById[enteId];
    const servizi = stato.scheda && stato.scheda.enteId === enteId ? stato.scheda.servizi : serviziInVistaAEnte(enteId);
    if (!servizi.length) return;
    // La testa della puntina (ingrandita, in hover): quanto sta sopra la punta e quanto è larga.
    const f = geojsonEnti.features[featureIndexPerEnte[enteId]];
    const forma = f.properties.stato === "consigliato" ? "rombo" : "cerchio";
    const scala = (raggioAZoom(MARKER_RAGGIO, map.getZoom()) / MARKER_RAGGIO[14]) * MARKER_FATTORE_HOVER;
    const testa = {
      altezza: altezzaTesta(forma) * scala,
      raggio: (forma === "rombo" ? MARKER_RAGGIO[14] * MARKER_ROMBO_RAPPORTO : MARKER_RAGGIO[14]) * scala + MARKER_BORDO,
    };
    // La punta del fumetto tocca la testa: sopra, a destra o a sinistra; oppure sta sotto l'ago.
    const offset = {
      bottom: [0, -(testa.altezza + testa.raggio)],
      top: [0, FUMETTO_SOTTO_AGO],
      left: [testa.raggio, -testa.altezza],
      right: [-testa.raggio, -testa.altezza],
    };
    // Prima lo si disegna per misurarlo, poi si sceglie il lato (Mapbox non ha un setAnchor: si
    // cambia l'opzione e si riposiziona).
    popupServizio.options.anchor = "bottom";
    popupServizio.setOffset(offset).setLngLat([ente.lon, ente.lat])
      .setHTML(fumettoServizio({ titolo: titoloServizio(servizi[0]) }, ente)).addTo(map);
    const r = popupServizio.getElement().getBoundingClientRect();
    const lato = ancoraggioFumetto(ente, testa, { larghezza: r.width, altezza: r.height });
    if (lato !== "bottom") { popupServizio.options.anchor = lato; popupServizio.setLngLat([ente.lon, ente.lat]); }
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
    if (!mappaPronta) return;
    // Al clic il fumetto sparisce (torna ripassando sopra il marker) e compare la linea del tempo,
    // che resta finché il marker è selezionato. Se la linea c'era già per l'hover, passa senza scatti.
    popupServizio.remove();
    const giaInHover = lineaHover.ente === enteId;
    nascondiLinea(lineaHover, { subito: true });
    nascondiLinea(lineaScelta, { subito: true });
    mostraLinea(lineaScelta, enteId, { dissolvenza: !giaInHover });
  }
  function chiudiScheda() {
    if (!stato.scheda) return;
    stato.scheda = null;
    stato.tipoRelazione = null;
    popupServizio.remove();
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
