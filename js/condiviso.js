// Funzioni e costanti comuni alla pagina del case manager (js/app.js) e a quella del caregiver
// (js/caregiver.js). Caricato prima di entrambe (dopo js/config.js, vedi i rispettivi index.html /
// caregiver.html). Non contiene nulla di specifico a un solo strumento: niente tendine, niente stati.

// Domicilio condiviso tra i due strumenti (stessa casa, vedi CLAUDE.md e il brief del caregiver).
// Inventato: non corrisponde a un indirizzo reale. Nella pagina del case manager può essere spostato
// scrivendo un indirizzo (resta solo il punto di partenza); nella pagina del caregiver resta fisso.
const DOMICILIO_INIZIALE = { lat: 45.4965, lon: 9.1370 };

// Colori provvisori per macrodominio (da ridisegnare).
const COLORI = { sanitario: "#173C59", sociosanitario: "#196EB6", sociale: "#E94B1E" };
// Colore di riserva (dalla palette dell'interfaccia, vedi --ink-2 in css/style.css), usato solo se
// un ente non ha un macrodominio riconosciuto.
const COLORE_CLUSTER = "#5a666e";

// Icona per categoria_origine dell'ente (non la categoria semplificata), dalla cartella icons/.
// Mappatura provvisoria: più categorie di origine possono condividere la stessa icona.
const ICONA_PER_CATEGORIA = {
  "Associazione": "associazione",
  "Associazione / terzo settore": "associazione",
  "Associazione di promozione sociale": "associazione",
  "Associazione sportiva dilettantistica": "palestra",
  "Biblioteca comunale": "biblioteca",
  "CDI - Centro Diurno Integrato": "centro-diurno",
  "Casa di Comunità": "poliambulatorio",
  "Casa di cura / CDCD": "ospedale",
  "Centri di Incontro e Supporto": "centro-di-ascolto",
  "Centro culturale/terapeutico": "centro-culturale-terapeutico",
  "Centro socio-ricreativo": "centro-socio-ricreativo",
  "Consultorio familiare privato": "consultorio",
  "Consultorio familiare pubblico": "consultorio",
  "Cooperativa sociale": "cooperativa",
  "Ente gestore ADI": "sportello-locale",
  "Erogatore di servizi": "sportello-locale",
  "Fondazione / CDCD": "ospedale",
  "Fondazione / terzo settore": "associazione",
  "Gruppo di cammino ATS": "gdc",
  "IRCCS / CDCD": "ospedale",
  "Istituto geriatrico / CDCD": "ospedale",
  "Ospedale": "ospedale",
  "Ospedale / CDCD": "ospedale",
  "Patronato / CAF": "sportello-locale",
  "Patronato / terzo settore": "sportello-locale",
  "Poliambulatorio territoriale": "poliambulatorio",
  "Presidio ospedaliero ambulatoriale": "poliambulatorio",
  "RSA - Residenza Sanitaria Assistenziale": "rsa",
  "Rete parrocchiale / terzo settore": "associazione",
  "Servizi Sociali Professionali Territoriali (SSPT)": "sportello-locale",
  "Servizio comunale / rete": "sportello-locale",
  "Servizio privato": "sportello-locale",
  "Servizio pubblico": "sportello-locale",
  "URP - Ufficio Relazioni con il Pubblico": "sportello-locale",
};

// Carica un'immagine da un indirizzo; usato per le icone di categoria (più semplice e sicuro di
// map.loadImage, che a seconda della versione di Mapbox restituisce forme diverse della risposta).
function caricaImmagine(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Immagine non trovata: " + url));
    img.src = url;
  });
}

// Curvatura dei rami tra marker (archi astratti, non percorsi stradali: vedi CLAUDE.md).
const RAMO_CURVATURA = 0.15; // spostamento del punto di controllo, in percentuale della lunghezza del ramo
const RAMO_CAMPIONI = 40; // punti con cui si disegna la curva

// Punto intermedio di una curva di Bézier quadratica: il punto di controllo è spostato in
// perpendicolare al segmento p0→p1, dal lato "destro" (senso orario visto da p0), di RAMO_CURVATURA
// volte la lunghezza del segmento (oppure di `curvatura`, se data). Restituisce RAMO_CAMPIONI punti
// campionati lungo la curva.
function campionaCurva(p0, p1, curvatura = RAMO_CURVATURA) {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const lunghezza = Math.hypot(dx, dy) || 1;
  const px = dy / lunghezza; // perpendicolare normalizzata, ruotata di -90°
  const py = -dx / lunghezza;
  const cx = (p0[0] + p1[0]) / 2 + px * lunghezza * curvatura;
  const cy = (p0[1] + p1[1]) / 2 + py * lunghezza * curvatura;
  const punti = [];
  for (let i = 0; i < RAMO_CAMPIONI; i++) {
    const t = i / (RAMO_CAMPIONI - 1);
    const u = 1 - t;
    punti.push([
      u * u * p0[0] + 2 * u * t * cx + t * t * p1[0],
      u * u * p0[1] + 2 * u * t * cy + t * t * p1[1],
    ]);
  }
  return punti;
}

// Chiede alla Mapbox Matrix API i tempi e le distanze a piedi da un'origine [lon,lat] a una lista di
// destinazioni [lon,lat] (al massimo 24 per richiesta: + l'origine fa 25, il limite della API).
// Restituisce un array parallelo a `destinazioni`, con { stato: "ok", minuti, metri } oppure
// { stato: "errore" } (irraggiungibile a piedi secondo il routing, o la richiesta non è andata a buon fine).
async function richiediTempiAPiedi(origine, destinazioni, token) {
  const risultati = new Array(destinazioni.length);
  const GRUPPO = 24;
  for (let i = 0; i < destinazioni.length; i += GRUPPO) {
    const gruppo = destinazioni.slice(i, i + GRUPPO);
    const coordinate = [origine, ...gruppo].map(([lo, la]) => lo + "," + la).join(";");
    const url = "https://api.mapbox.com/directions-matrix/v1/mapbox/walking/" + coordinate
      + "?sources=0&annotations=duration,distance&access_token=" + token;
    try {
      const risposta = await fetch(url);
      const dati = await risposta.json();
      if (dati.code !== "Ok") throw new Error(dati.code);
      const durate = dati.durations[0];
      const distanze = dati.distances[0];
      gruppo.forEach((_, idx) => {
        const durata = durate[idx + 1];
        risultati[i + idx] = durata == null
          ? { stato: "errore" } // irraggiungibile a piedi secondo il routing
          : { stato: "ok", minuti: Math.round(durata / 60), metri: Math.round(distanze[idx + 1]) };
      });
    } catch (err) {
      console.warn("Tempi a piedi non calcolati per un gruppo:", err.message);
      gruppo.forEach((_, idx) => { risultati[i + idx] = { stato: "errore" }; });
    }
  }
  return risultati;
}

// ---------- Linea dei minuti a piedi (domicilio → luogo) e la sua pillola: un solo componente per
// le due pagine (nel case manager in hover su un ramo, il «triangolo» dei tempi; nel caregiver in
// hover su un marker o su una voce, e sul marker selezionato). Leggermente arcuata, sempre con la
// pancia verso l'alto, a trattini, grigio pieno; meno curva dei rami (RAMO_CURVATURA), per non
// confondersi con loro. La pillola è .pillola-tempo in css/style.css: il suo contorno è nel grigio
// con cui la linea appare a schermo (la mappa ammorbidisce le linee sottili, che sembrano più
// chiare del loro colore): se cambi il colore qui, ritocca a occhio anche quello.
const LINEA_MINUTI = {
  curvatura: 0.11,
  colore: "#474747",
  opacita: 1,
  spessore: 0.75, // px
  tratto: 2, // px
  vuoto: 2, // px
};
const TEMPO_LINEA_MARGINE = 4; // px fra la punta del luogo e la fine della linea
const TEMPO_LINEA_DISSOLVENZA_MS = 150;

// Sorgente e livello delle linee dei minuti; beforeId (facoltativo) = il livello sotto cui stanno.
// Ogni linea ha un id numerico e compare in dissolvenza con il feature-state "comparso".
function aggiungiLineeMinuti(map, id, beforeId) {
  map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({
    id, type: "line", source: id, layout: { "line-cap": "butt", "line-join": "round" },
    paint: {
      "line-color": LINEA_MINUTI.colore,
      "line-width": LINEA_MINUTI.spessore,
      "line-dasharray": [LINEA_MINUTI.tratto / LINEA_MINUTI.spessore, LINEA_MINUTI.vuoto / LINEA_MINUTI.spessore],
      "line-opacity": ["case", ["boolean", ["feature-state", "comparso"], false], LINEA_MINUTI.opacita, 0],
      "line-opacity-transition": { duration: TEMPO_LINEA_DISSOLVENZA_MS },
    },
  }, beforeId);
}

// L'arco fra due luoghi [lon, lat] (di solito il domicilio e un ente): parte e arriva a pochi pixel
// dai due punti, con la pancia sempre verso l'alto. Restituisce la lista dei punti.
function arcoMinuti(map, coordDa, coordA) {
  const seg = segmentoLineaTempo(map, coordDa, 0, coordA, 0);
  const [a, b] = seg.geometry.coordinates;
  // campionaCurva piega verso destra guardando da a verso b: andando verso est la destra è il sud,
  // quindi in quel caso si disegna al contrario.
  const versoEst = map.project(b).x > map.project(a).x;
  return versoEst ? campionaCurva(b, a, LINEA_MINUTI.curvatura).reverse() : campionaCurva(a, b, LINEA_MINUTI.curvatura);
}

// Dove stanno le pillole su uno o più archi: a metà; se due risultano troppo vicine, scivolano lungo
// il proprio arco in versi opposti finché non si separano.
function posizioniPilloleMinuti(map, archi) {
  const DISTANZA_MINIMA = 60; // px
  const frazioni = archi.map(() => 0.5);
  const punto = (i) => archi[i][Math.round((archi[i].length - 1) * frazioni[i])];
  if (archi.length === 2) {
    for (let tentativi = 0; tentativi < 6; tentativi++) {
      const p = map.project(punto(0)), q = map.project(punto(1));
      if (Math.hypot(p.x - q.x, p.y - q.y) >= DISTANZA_MINIMA) break;
      frazioni[0] = Math.max(0.3, frazioni[0] - 0.06);
      frazioni[1] = Math.min(0.7, frazioni[1] + 0.06);
    }
  }
  return archi.map((_, i) => punto(i));
}

// Testo della pillola: «a 11 min»; «—» se il tempo non c'è; «…» mentre si sta calcolando.
// sintetica: solo «11 min», senza la «a» (nel case manager, strumento per professionisti).
function testoMinuti(minuti, { inCalcolo = false, sintetica = false } = {}) {
  if (inCalcolo) return "…";
  if (minuti == null) return "—";
  return sintetica ? `${minuti} min` : `a ${minuti} min`;
}

// Una pillola dei minuti sulla mappa, pronta e invisibile finché non serve. Sta dentro un
// contenitore: Mapbox scrive un'opacità in linea sull'elemento del marker, che vincerebbe sulla
// classe .mostra. sintetica: senza l'omino che cammina (nel case manager; il testo lo decide
// testoMinuti). Per il resto la pillola è identica nelle due pagine.
function creaPillolaMinuti(map, { sintetica = false } = {}) {
  const pillola = Object.assign(document.createElement("div"), { className: "pillola-tempo" });
  const contenitore = Object.assign(document.createElement("div"), { className: "pillola-contenitore" });
  contenitore.append(pillola);
  const etichetta = new mapboxgl.Marker({ element: contenitore, anchor: "center" }).setLngLat([0, 0]).addTo(map);
  return {
    mostra(lngLat, testo) {
      pillola.innerHTML = sintetica ? `<span class="pillola-tempo__testo">${testo}</span>` : pillolaTempoHtml(testo);
      etichetta.setLngLat(lngLat);
      pillola.classList.add("mostra");
    },
    sposta(lngLat) { etichetta.setLngLat(lngLat); },
    nascondi() { pillola.classList.remove("mostra"); },
  };
}

// Il punto sul segmento coordCentro→coordAltro, spostato di raggioPx pixel verso l'altro estremo: è
// dove la linea deve iniziare o fermarsi, al bordo del marker e non al centro.
function puntoAlBordo(map, coordCentro, coordAltro, raggioPx) {
  const p0 = map.project(coordCentro);
  const p1 = map.project(coordAltro);
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const lunghezza = Math.hypot(dx, dy) || 1;
  const fattore = Math.min(raggioPx / lunghezza, 0.49); // mai oltre la metà, se i marker si toccano
  const lngLat = map.unproject([p0.x + dx * fattore, p0.y + dy * fattore]);
  return [lngLat.lng, lngLat.lat];
}

// Segmento retto fra due punti, fermo a raggioA/raggioB (+ TEMPO_LINEA_MARGINE) pixel da ciascuno:
// una GeoJSON Feature. Serve ad arcoMinuti per gli estremi dell'arco.
function segmentoLineaTempo(map, coordA, raggioA, coordB, raggioB) {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        puntoAlBordo(map, coordA, coordB, raggioA + TEMPO_LINEA_MARGINE),
        puntoAlBordo(map, coordB, coordA, raggioB + TEMPO_LINEA_MARGINE),
      ],
    },
    properties: {},
  };
}

// Icona provvisoria, semplice: una persona stilizzata che cammina (testa + tronco + gambe e braccia
// divaricate). Eredita il colore di testo dell'etichetta (currentColor).
function iconaPersonaCheCammina() {
  return '<svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">'
    + '<circle cx="12" cy="4" r="2.2" fill="currentColor"/>'
    + '<path d="M12 7 L12 14 M12 14 L8 20 M12 14 L16 19 M12 9 L7 12 M12 9 L17 11" '
    + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'
    + '</svg>';
}
// Markup di un'etichetta su una linea del tempo: icona + testo (vedi .pillola-tempo in css/style.css).
function pillolaTempoHtml(testo) {
  return iconaPersonaCheCammina() + `<span class="pillola-tempo__testo">${testo}</span>`;
}

// Raggio in px a uno zoom qualsiasi, fra le fermate di zoom 10 e 14 (come l'interpolazione lineare
// di Mapbox, bloccata oltre i due estremi). fermate = { 10: px, 14: px }.
const raggioAZoom = (fermate, zoom) => {
  const t = Math.max(0, Math.min(1, (zoom - 10) / 4));
  return fermate[10] + (fermate[14] - fermate[10]) * t;
};

// ---------- Fumetto «servizio presso ente», comune alle due pagine (aspetto: .popup-servizio in
// css/style.css; contenuto: fumettoServizio qui sotto). Simmetrico, con la punta al centro di un lato
// del marker: esce sopra, sotto, a destra o a sinistra, dal lato che copre meno le linee (minuti e
// rami) che arrivano al marker; a parità, sopra. Evita i lati in cui uscirebbe dalla mappa.
const FUMETTO_LATI = [ // "anchor" di Mapbox = il lato del fumetto agganciato al marker
  { anchor: "bottom", v: [0, -1] }, // fumetto sopra
  { anchor: "top", v: [0, 1] }, // sotto
  { anchor: "left", v: [1, 0] }, // a destra
  { anchor: "right", v: [-1, 0] }, // a sinistra
];
const FUMETTO_MARGINE_BASSO = 60; // px in fondo alla mappa da lasciare liberi (comandi in basso)
const FUMETTO_SOTTO_AGO = 4; // px fra la punta dell'ago e il fumetto, quando esce sotto una puntina

function creaFumetto(map) {
  const popup = new mapboxgl.Popup({
    closeButton: false, closeOnClick: false, focusAfterOpen: false, anchor: "bottom", className: "popup-servizio",
  });

  function lato(p, testa, ingombro, linee) {
    const raggio = testa.raggio;
    // Direzioni (dal luogo) delle linee che partono o arrivano qui: un punto un po' dentro la linea.
    const direzioni = [];
    for (const c of linee) {
      for (const [capo, verso] of [[0, 1], [c.length - 1, -1]]) {
        const q0 = map.project(c[capo]);
        if (Math.hypot(q0.x - p.x, q0.y - p.y) > raggio + 12) continue;
        const q = map.project(c[Math.min(c.length - 1, Math.max(0, capo + verso * Math.max(1, Math.round(c.length * 0.15))))]);
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d > 0) direzioni.push([(q.x - p.x) / d, (q.y - p.y) / d]);
      }
    }
    const { width: W, height: H } = map.getCanvas().getBoundingClientRect();
    const sotto = testa.altezza > 0 ? FUMETTO_SOTTO_AGO : raggio;
    const fuori = {
      bottom: p.y - testa.altezza - raggio - ingombro.altezza < 0,
      top: p.y + sotto + ingombro.altezza > H - FUMETTO_MARGINE_BASSO,
      left: p.x + raggio + ingombro.larghezza > W,
      right: p.x - raggio - ingombro.larghezza < 0,
    };
    let migliore = null;
    for (const l of FUMETTO_LATI) {
      // Quanto il lato "guarda" verso la linea più vicina: 1 = proprio sopra, −1 = dalla parte opposta.
      let punteggio = direzioni.reduce((m, d) => Math.max(m, l.v[0] * d[0] + l.v[1] * d[1]), -1);
      if (fuori[l.anchor]) punteggio += 2;
      if (!migliore || punteggio < migliore.punteggio - 0.01) migliore = { anchor: l.anchor, punteggio };
    }
    return migliore.anchor;
  }

  return {
    // coord: [lon, lat] del luogo. testa: { altezza, raggio } in px: quanto il centro del marker sta
    // sopra il luogo (0 per un marker piatto, l'ago per una puntina) e il suo raggio, bordo compreso.
    // linee: le linee (liste di [lon, lat]) da non coprire.
    mostra(coord, html, testa, linee = []) {
      const sotto = testa.altezza > 0 ? FUMETTO_SOTTO_AGO : testa.raggio;
      popup.setOffset({
        bottom: [0, -(testa.altezza + testa.raggio)],
        top: [0, sotto],
        left: [testa.raggio, -testa.altezza],
        right: [-testa.raggio, -testa.altezza],
      });
      // Prima lo si disegna per misurarlo, poi si sceglie il lato (Mapbox non ha un setAnchor: si
      // cambia l'opzione e si riposiziona).
      popup.options.anchor = "bottom";
      popup.setLngLat(coord).setHTML(html).addTo(map);
      const r = popup.getElement().getBoundingClientRect();
      const a = lato(map.project(coord), testa, { larghezza: r.width, altezza: r.height }, linee);
      if (a !== "bottom") { popup.options.anchor = a; popup.setLngLat(coord); }
    },
    nascondi() { popup.remove(); },
  };
}

// Contenuto del fumetto di un servizio selezionato (servizio presso ente): il servizio al primo
// posto, sotto l'ente che lo ospita ("presso", in grigio chiaro, + il nome nel colore del suo
// macrodominio). Usato dal popup fisso sul marker selezionato, in entrambe le pagine.
function fumettoServizio(servizio, ente) {
  const colore = COLORI[ente.macro_dominio] || COLORE_CLUSTER;
  return `<strong class="fumetto-servizio__titolo">${servizio.titolo || "Servizio"}</strong>`
    + `<span class="fumetto-servizio__ente">`
    + `<span class="fumetto-servizio__presso">presso</span> `
    + `<span style="color:${colore}">${ente.nome}</span>`
    + `</span>`;
}

// Poligono geodetico approssimato (sfera, raggio terrestre medio) di un cerchio di `raggioMetri`
// centrato su [lat, lon]: usato per il cerchio dei 15 minuti a piedi nella pagina del caregiver.
// Non è un isocrona reale (non segue le strade): è una stima visiva, dichiaratamente approssimata.
function cerchioGeodetico(lat, lon, raggioMetri, punti = 64) {
  const RAGGIO_TERRA = 6371008.8;
  const latRad = (lat * Math.PI) / 180;
  const coordinate = [];
  for (let i = 0; i <= punti; i++) {
    const angolo = (i / punti) * 2 * Math.PI;
    const dNord = raggioMetri * Math.cos(angolo);
    const dEst = raggioMetri * Math.sin(angolo);
    const dLat = (dNord / RAGGIO_TERRA) * (180 / Math.PI);
    const dLon = (dEst / (RAGGIO_TERRA * Math.cos(latRad))) * (180 / Math.PI);
    coordinate.push([lon + dLon, lat + dLat]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coordinate] } };
}

// ---------- Tasto segreto: una zona cliccabile invisibile di 40×40 px nell'angolo in basso a sinistra
// della pagina, che porta all'altro strumento (case manager ↔ caregiver). Nessun segno, cursore
// normale. Dentro la presentazione (index.html) chiede a lei di cambiare scheda, così ciascuna
// pagina resta nello stato in cui è; aperta da sola, va direttamente all'altra pagina.
function aggiungiTastoSegreto(destinazione) {
  const zona = document.createElement("div");
  zona.className = "tasto-segreto";
  zona.setAttribute("aria-hidden", "true");
  zona.addEventListener("click", () => {
    if (window.parent !== window) window.parent.postMessage({ tipo: "cambia-strumento", strumento: destinazione }, "*");
    else window.location.href = destinazione + ".html";
  });
  document.body.appendChild(zona);
}
