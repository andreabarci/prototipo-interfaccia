// Pagina di prova del marker composto (marker-composto.html), con le regole dello strumento del
// case manager: stessa base mappa e stessi dati delle altre due pagine, l'anello di tacche di
// js/marker-composto.js, una tendina destra minima per provare hover e clic sui servizi. Pagina da
// togliere prima della presentazione insieme alla sua scheda.
//
// Fasi: rete (nessun bisogno: tondini, nessun anello) → ventaglio (bisogno scelto nel pannello:
// anello sui marker che rispondono, gli altri attenuati) → servizio scelto (clic su un servizio
// nella tendina: anello solo sul marker selezionato, rami di equivalenza verso i collegati, che
// restano puntine senza anello, fumetto fisso del servizio).
//
// Le misure delle puntine sono quelle del caregiver (js/caregiver.js), ricopiate qui perché la
// pagina di prova non deve toccare le altre due: quando il marker composto entrerà nelle pagine,
// il disegno della puntina andrà spostato in un modulo comune.

const PROVA_SCALA = 0.7 * 1.2; // come SCALA_CAREGIVER
const PUNTINA_RAGGIO = { 10: 8.75 * PROVA_SCALA, 14: 17.5 * PROVA_SCALA };
const PUNTINA_BORDO = 3 * PROVA_SCALA;
const PUNTINA_SCALA_ICONA = 0.55;
const PUNTINA_AGO = { lunghezza: 12, spessore: 1.5, colore: "#5C554D" };
const TONDINO_RAGGIO = 4 * 1.2;
const OPACITA_ATTENUATA = 0.1; // come gli attenuati del case manager
const DOMICILIO_RAGGIO = { 10: 8.75 * PROVA_SCALA, 14: 17.5 * PROVA_SCALA };
const DOMICILIO_BORDO = 3 * PROVA_SCALA;
// Rami di equivalenza: come nel case manager (RAMO_* in js/app.js).
const PROVA_RAMO = { colore: "#aab1b6", spessore: 0.75, opacita: 0.9 };
// Bisogni della cartella dello scenario A (come nel case manager): decidono l'ordine della tendina.
const PROVA_BISOGNI_CARTELLA = ["B16", "C02"];

// Distanza fra il luogo (punta dell'ago) e il centro della testa di una puntina senza anello,
// alla taglia di zoom 14 (poi scala con la puntina).
const altezzaPuntina14 = () => PUNTINA_RAGGIO[14] + PUNTINA_BORDO + PUNTINA_AGO.lunghezza;

window.startApp = async function () {
  const [enti, servizi, bisogni] = await Promise.all(
    ["data/enti.json", "data/servizi.json", "data/bisogni.json"].map((u) => fetch(u).then((r) => r.json()))
  );
  const enteById = Object.fromEntries(enti.map((e) => [e.id, e]));
  const servizioById = Object.fromEntries(servizi.map((s) => [s.id, s]));
  const bisognoById = Object.fromEntries(bisogni.map((b) => [b.id, b]));
  const sullaMappa = enti.filter((e) => e.lat != null);
  const DOMICILIO = DOMICILIO_INIZIALE;
  const serviziPerSede = {};
  for (const s of servizi) (serviziPerSede[s.sede] ||= []).push(s);

  // ---------- stato della prova
  const stato = {
    bisogno: null, // null = rete
    enteAperto: null, // ente nella tendina destra
    servizioScelto: null, // servizio scelto nella tendina
    servizioInHover: null, // servizio sotto il mouse nella tendina
    collegati: new Map(), // id ente -> servizio equivalente (rami)
  };

  // I gruppi della tendina destra, come nel case manager: prima i bisogni della cartella, poi gli
  // altri nell'ordine del CANE; il bisogno selezionato, se l'ente vi risponde, va in cima.
  function gruppiEnte(enteId) {
    const lista = serviziPerSede[enteId] || [];
    const presenti = new Set(lista.flatMap((s) => s.bisogni));
    const ordine = [
      ...PROVA_BISOGNI_CARTELLA.filter((b) => presenti.has(b)),
      ...bisogni.map((b) => b.id).filter((b) => presenti.has(b) && !PROVA_BISOGNI_CARTELLA.includes(b)),
    ];
    if (stato.bisogno && ordine.includes(stato.bisogno)) ordine.unshift(...ordine.splice(ordine.indexOf(stato.bisogno), 1));
    return ordine.map((b) => ({ bisogno: b, servizi: lista.filter((s) => s.bisogni.includes(b)) }));
  }

  // ---------- pannello di prova
  const pannello = document.getElementById("pannello");
  const selBisogno = document.getElementById("bisogno");
  selBisogno.innerHTML = '<option value="">— nessuno (rete)</option>'
    + bisogni.map((b) => `<option value="${b.id}">${b.id} · ${b.nome}</option>`).join("");
  function leggiPannello() {
    ANELLO.soglia = Math.max(1, Number(document.getElementById("soglia").value) || 8);
    ANELLO.spazio = Number(document.getElementById("spazio").value);
    document.getElementById("spazio-valore").textContent = ANELLO.spazio + " px";
  }
  leggiPannello();

  // ---------- mappa
  // Vista di partenza: il domicilio, il CDI Simone de' Beauvoir (E203, 3 servizi), un ente con un
  // solo servizio vicino al domicilio (E273) e il Centro Consulenza Famiglia di via Strozzi (E230,
  // 9 servizi: uno dei due enti con più servizi; l'altro, E290, è a 7 km).
  const casi = ["E203", "E273", "E230"].map((id) => enteById[id]);
  const lon = [DOMICILIO.lon, ...casi.map((e) => e.lon)], lat = [DOMICILIO.lat, ...casi.map((e) => e.lat)];
  mapboxgl.accessToken = CONFIG.mapboxToken;
  const map = new mapboxgl.Map({
    container: "map", style: CONFIG.mapStyle,
    bounds: [[Math.min(...lon), Math.min(...lat)], [Math.max(...lon), Math.max(...lat)]],
    fitBoundsOptions: { padding: { top: 80, bottom: 80, left: 290, right: 80 } }, // a sinistra c'è il pannello
    minZoom: CONFIG.minZoom, maxZoom: CONFIG.maxZoom, language: "it", attributionControl: false,
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
  const fumetto = creaFumetto(map);
  const immaginiIcone = {};
  let mappaPronta = false;

  const coloreDi = (e) => COLORI[e.macro_dominio] || COLORE_CLUSTER;
  const geojson = {
    type: "FeatureCollection",
    features: sullaMappa.map((e, i) => ({ type: "Feature", id: i, geometry: { type: "Point", coordinates: [e.lon, e.lat] }, properties: { id: e.id } })),
  };

  // Testa del marker (cerchio con bordo bianco e icona), con o senza l'ago sotto. Con l'ago è la
  // puntina del caregiver (punta = bordo inferiore dell'immagine); senza, è la testa che si posa
  // dentro l'anello (centro = centro dell'immagine).
  function assicuraTesta(nome) {
    if (map.hasImage(nome)) return;
    const [tipo, colore, icona] = nome.split("|");
    const conAgo = tipo === "puntina";
    const PR = 3, R = PUNTINA_RAGGIO[14], bordo = PUNTINA_BORDO;
    const lato = Math.ceil((R + bordo + 1) * 2);
    const c = lato / 2;
    const altezza = conAgo ? Math.ceil(c + altezzaPuntina14()) : lato;
    const canvas = document.createElement("canvas");
    canvas.width = lato * PR; canvas.height = altezza * PR;
    const ctx = canvas.getContext("2d");
    ctx.scale(PR, PR);
    const cy = conAgo ? altezza - altezzaPuntina14() : c;
    if (conAgo) {
      ctx.beginPath(); ctx.moveTo(c, cy); ctx.lineTo(c, altezza);
      ctx.lineWidth = PUNTINA_AGO.spessore; ctx.strokeStyle = PUNTINA_AGO.colore; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(c, cy, R + bordo, 0, 2 * Math.PI); ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.beginPath(); ctx.arc(c, cy, R, 0, 2 * Math.PI); ctx.fillStyle = colore; ctx.fill();
    const img = immaginiIcone[icona];
    if (img) { const d = 2 * R * PUNTINA_SCALA_ICONA; ctx.drawImage(img, c - d / 2, cy - d / 2, d, d); }
    map.addImage(nome, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: PR });
  }

  const rispondeAlBisogno = (enteId) => (serviziPerSede[enteId] || []).some((s) => s.bisogni.includes(stato.bisogno));

  // L'anello di un ente nello stato corrente: tacche accese/spente, tacca evidenziata.
  function anelloDi(e) {
    const tacche = tacchePerAnello(gruppiEnte(e.id), stato.bisogno);
    if (!tacche.length) return null;
    const qui = stato.enteAperto === e.id;
    const scelto = qui && stato.servizioScelto ? tacche.findIndex((t) => t.servizio.id === stato.servizioScelto) : -1;
    // Servizio scelto: la sua tacca resta accesa ed evidenziata, le altre si spengono.
    const stati = tacche.map((t, i) => (scelto >= 0 ? (i === scelto ? "a" : "s") : (t.accesa ? "a" : "s"))).join("");
    const inHover = qui && stato.servizioInHover ? tacche.findIndex((t) => t.servizio.id === stato.servizioInHover) : -1;
    return nomeAnello({ colore: coloreDi(e), stati, evidenza: inHover >= 0 ? inHover : scelto });
  }

  // Le proprietà di ogni marker nello stato corrente.
  function aggiorna() {
    for (const f of geojson.features) {
      const e = enteById[f.properties.id];
      const p = f.properties;
      const icona = ICONA_PER_CATEGORIA[e.categoria_origine] || "";
      p.colore = coloreDi(e);
      p.opacita = 1; p.anello = null; p.testa = null; p.puntina = null;
      if (!stato.bisogno) continue; // rete: tondini pieni, nessun anello
      if (stato.servizioScelto) {
        if (e.id === stato.enteAperto) { p.testa = ["testa", p.colore, icona].join("|"); p.anello = anelloDi(e); }
        else if (stato.collegati.has(e.id)) p.puntina = ["puntina", p.colore, icona].join("|"); // collegato: senza anello
        else p.opacita = OPACITA_ATTENUATA;
        continue;
      }
      if (rispondeAlBisogno(e.id)) { p.testa = ["testa", p.colore, icona].join("|"); p.anello = anelloDi(e); }
      else p.opacita = OPACITA_ATTENUATA;
    }
    if (!mappaPronta) return;
    for (const f of geojson.features) {
      const p = f.properties;
      if (p.testa) assicuraTesta(p.testa);
      if (p.puntina) assicuraTesta(p.puntina);
      if (p.anello) assicuraAnello(map, p.anello);
    }
    map.getSource("enti").setData(geojson);
    aggiornaRami();
    aggiornaFumetto();
  }

  // Rami di equivalenza, come nel case manager (trovaLegami in js/app.js): stesso bisogno, ente
  // della stessa categoria semplificata, servizio che risponde («R»), un ramo per ente.
  function trovaCollegati(servizio, bisognoContesto) {
    const origine = enteById[servizio.sede];
    const perSede = new Map();
    for (const altro of servizi) {
      if (altro.id === servizio.id || altro.sede === servizio.sede) continue;
      if (altro.risposta !== "R" || !altro.bisogni.includes(bisognoContesto)) continue;
      const enteAltro = enteById[altro.sede];
      if (!enteAltro || enteAltro.lat == null || enteAltro.categoria !== origine.categoria) continue;
      if (!perSede.has(altro.sede)) perSede.set(altro.sede, altro);
    }
    return perSede;
  }
  let ramiCorrenti = [];
  function aggiornaRami() {
    ramiCorrenti = [];
    if (stato.servizioScelto) {
      const o = enteById[stato.enteAperto];
      for (const id of stato.collegati.keys()) {
        const d = enteById[id];
        ramiCorrenti.push(campionaCurva([o.lon, o.lat], [d.lon, d.lat]));
      }
    }
    map.getSource("rami").setData({
      type: "FeatureCollection",
      features: ramiCorrenti.map((c) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: c } })),
    });
  }

  function aggiornaFumetto() {
    if (!stato.servizioScelto) { fumetto.nascondi(); return; }
    const e = enteById[stato.enteAperto];
    const s = servizioById[stato.servizioScelto];
    fumetto.mostra([e.lon, e.lat], fumettoServizio(s, e), { altezza: ANELLO_ALTEZZA(), raggio: anelloBordoEsterno() + 2 }, ramiCorrenti);
  }

  // ---------- tendina destra minima (come nel case manager: bisogno selezionato in cima e aperto)
  const tendina = document.getElementById("tendina");
  const tendinaContenuto = document.getElementById("tendina-contenuto");
  function apriEnte(enteId) {
    stato.enteAperto = enteId;
    stato.servizioScelto = null;
    stato.servizioInHover = null;
    stato.collegati = new Map();
    const e = enteById[enteId];
    const blocchi = gruppiEnte(enteId).map((g) => {
      const aperto = g.bisogno === stato.bisogno;
      const righe = g.servizi.map((s) => `<li><button type="button" class="servizio-btn" data-id="${s.id}"><b>${s.titolo || "Servizio"}</b></button></li>`).join("");
      return `<div class="bisogno-gruppo${aperto ? " attivo" : ""}">
        <button type="button" class="bisogno-intestazione" aria-expanded="${aperto}">
          <span class="bisogno-intestazione__nome">${bisognoById[g.bisogno] ? bisognoById[g.bisogno].nome : g.bisogno}</span>
          <span class="bisogno-intestazione__conta">(${g.servizi.length})</span>
          <span class="bisogno-intestazione__freccia">▾</span>
        </button>
        <div class="bisogno-corpo${aperto ? " aperto" : ""}"><ul class="servizi">${righe}</ul></div>
      </div>`;
    }).join("");
    tendinaContenuto.innerHTML = `<p class="eyebrow">${e.categoria || ""}</p><h2>${e.nome}</h2>
      <p class="meta">${e.indirizzo || ""}</p>${blocchi || '<p class="nota">Nessun servizio registrato.</p>'}`;
    tendina.hidden = false;
    aggiorna();
  }
  function chiudiEnte() {
    stato.enteAperto = null; stato.servizioScelto = null; stato.servizioInHover = null; stato.collegati = new Map();
    tendina.hidden = true;
    aggiorna();
  }
  tendinaContenuto.addEventListener("click", (ev) => {
    const intest = ev.target.closest(".bisogno-intestazione");
    if (intest) {
      const corpo = intest.nextElementSibling;
      const apri = !corpo.classList.contains("aperto");
      corpo.classList.toggle("aperto", apri);
      intest.setAttribute("aria-expanded", String(apri));
      return;
    }
    const btn = ev.target.closest(".servizio-btn");
    if (!btn) return;
    // Clic sul servizio già scelto: lo deseleziona (come nel case manager).
    if (stato.servizioScelto === btn.dataset.id) { stato.servizioScelto = null; stato.collegati = new Map(); }
    else {
      const s = servizioById[btn.dataset.id];
      stato.servizioScelto = s.id;
      stato.collegati = trovaCollegati(s, s.bisogni.includes(stato.bisogno) ? stato.bisogno : s.bisogni[0]);
    }
    tendinaContenuto.querySelectorAll(".servizio-btn").forEach((b) => b.classList.toggle("selezionato", b.dataset.id === stato.servizioScelto));
    aggiorna();
  });
  // Hover su un servizio: la sua tacca si evidenzia sul marker.
  tendinaContenuto.addEventListener("mouseover", (ev) => {
    const btn = ev.target.closest(".servizio-btn");
    const id = btn ? btn.dataset.id : null;
    if (id === stato.servizioInHover) return;
    stato.servizioInHover = id;
    aggiorna();
  });
  tendinaContenuto.addEventListener("mouseleave", () => { if (stato.servizioInHover) { stato.servizioInHover = null; aggiorna(); } });
  document.getElementById("tendina-chiudi").addEventListener("click", chiudiEnte);

  // ---------- clic sulla mappa: sulla testa di un marker (non sulle tacche) apre la tendina
  function markerSotto(point) {
    const z = map.getZoom();
    const scala = raggioAZoom(PUNTINA_RAGGIO, z) / PUNTINA_RAGGIO[14];
    const raggioTesta = raggioAZoom(PUNTINA_RAGGIO, z) + PUNTINA_BORDO;
    let migliore = null;
    for (const f of geojson.features) {
      const p = f.properties;
      if (!p.testa && !p.puntina) continue;
      const q = map.project(f.geometry.coordinates);
      const su = p.testa ? ANELLO_ALTEZZA() : altezzaPuntina14() * scala;
      const d = Math.hypot(point.x - q.x, point.y - (q.y - su));
      if (d <= raggioTesta && (!migliore || d < migliore.d)) migliore = { id: p.id, d };
    }
    return migliore ? migliore.id : null;
  }

  map.on("load", async () => {
    try {
      const casa = await caricaImmagine("icons/domicilio.png");
      const PR = 3, R = DOMICILIO_RAGGIO[14];
      const lato = Math.ceil((R + DOMICILIO_BORDO + 1) * 2), c = lato / 2;
      const altezza = Math.ceil(c + R + DOMICILIO_BORDO + PUNTINA_AGO.lunghezza);
      const canvas = document.createElement("canvas");
      canvas.width = lato * PR; canvas.height = altezza * PR;
      const ctx = canvas.getContext("2d");
      ctx.scale(PR, PR);
      ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c, altezza);
      ctx.lineWidth = PUNTINA_AGO.spessore; ctx.strokeStyle = PUNTINA_AGO.colore; ctx.stroke();
      ctx.beginPath(); ctx.arc(c, c, R + DOMICILIO_BORDO, 0, 2 * Math.PI); ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.beginPath(); ctx.arc(c, c, R, 0, 2 * Math.PI); ctx.fillStyle = "#000000"; ctx.fill();
      const d = 2 * R * 0.55;
      ctx.drawImage(casa, c - d / 2, c - d / 2, d, d);
      map.addImage("domicilio-puntina", ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: PR });
    } catch (err) { console.warn(err.message); }

    const nomiIcone = new Set(sullaMappa.map((e) => ICONA_PER_CATEGORIA[e.categoria_origine]).filter(Boolean));
    await Promise.all([...nomiIcone].map(async (nome) => {
      try { immaginiIcone[nome] = await caricaImmagine(`icons/2x/icon-${nome}@2x.png`); } catch (err) { console.warn(err.message); }
    }));

    map.addSource("rami", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "rami", type: "line", source: "rami", layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": PROVA_RAMO.colore, "line-width": PROVA_RAMO.spessore, "line-opacity": PROVA_RAMO.opacita },
    });
    map.addSource("enti", { type: "geojson", data: geojson });
    map.addLayer({
      id: "tondini", type: "circle", source: "enti",
      filter: ["all", ["==", ["typeof", ["get", "testa"]], "null"], ["==", ["typeof", ["get", "puntina"]], "null"]],
      paint: { "circle-radius": TONDINO_RAGGIO, "circle-color": ["get", "colore"], "circle-opacity": ["coalesce", ["get", "opacita"], 1] },
    });
    map.addLayer({
      id: "puntine", type: "symbol", source: "enti",
      filter: ["==", ["typeof", ["get", "puntina"]], "string"],
      layout: {
        "icon-image": ["get", "puntina"], "icon-anchor": "bottom",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 10, PUNTINA_RAGGIO[10] / PUNTINA_RAGGIO[14], 14, 1],
        "icon-allow-overlap": true, "icon-ignore-placement": true,
      },
    });
    aggiungiLivelliAnello(map, "enti", {
      testaDimensione: ["interpolate", ["linear"], ["zoom"], 10, PUNTINA_RAGGIO[10] / PUNTINA_RAGGIO[14], 14, 1],
    });
    map.addSource("domicilio", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [DOMICILIO.lon, DOMICILIO.lat] }, properties: {} } });
    map.addLayer({
      id: "domicilio", type: "symbol", source: "domicilio",
      layout: {
        "icon-image": "domicilio-puntina", "icon-anchor": "bottom",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 10, DOMICILIO_RAGGIO[10] / DOMICILIO_RAGGIO[14], 14, 1],
        "icon-allow-overlap": true, "icon-ignore-placement": true,
      },
    }, "puntine");

    mappaPronta = true;
    aggiorna();

    map.on("click", (ev) => {
      const id = markerSotto(ev.point);
      if (id) apriEnte(id);
      else if (stato.enteAperto) chiudiEnte();
    });
    map.on("mousemove", (ev) => { map.getCanvas().style.cursor = markerSotto(ev.point) ? "pointer" : ""; });
    map.on("zoomend", () => { if (stato.servizioScelto) aggiornaFumetto(); });
  });

  // Cambio di bisogno: si torna al ventaglio (o alla rete), tendina chiusa.
  selBisogno.addEventListener("change", () => {
    stato.bisogno = selBisogno.value || null;
    if (stato.enteAperto) chiudiEnte(); else aggiorna();
  });
  pannello.addEventListener("input", (ev) => { if (ev.target !== selBisogno) { leggiPannello(); aggiorna(); } });
  pannello.addEventListener("submit", (ev) => ev.preventDefault());
};
