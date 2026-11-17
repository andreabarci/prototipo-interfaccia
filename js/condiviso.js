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

// Linee del tempo (domicilio → marker), rette e tratteggiate — mai curve, per non confondersi con i
// rami, che sono curvi (vedi campionaCurva sopra): natura diversa anche nel disegno, non solo nel
// significato. Nel case manager appaiono in hover su un ramo; nel caregiver, in hover su un marker o
// su una voce della tendina sinistra (vedi il brief). Colori provvisori. Il caregiver usa grafica
// sua (appena arcuata, a trattini, vedi LINEA_MINUTI_* in js/caregiver.js): queste costanti valgono
// solo per il case manager.
const TEMPO_LINEA_COLORE = "#8a9299"; // grigio medio, neutro
const TEMPO_LINEA_SPESSORE = 1.5;
const TEMPO_LINEA_OPACITA = 0.9;
const TEMPO_LINEA_TRATTO_PIENO = 4; // px
const TEMPO_LINEA_TRATTO_VUOTO = 4; // px
const TEMPO_LINEA_MARGINE = 4; // oltre al raggio del marker, perché non tocchi il bordo/l'icona
const TEMPO_LINEA_DISSOLVENZA_MS = 150;

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

// Segmento di linea del tempo fra due marker (di solito il domicilio e un ente), fermo al bordo di
// entrambi più TEMPO_LINEA_MARGINE: una GeoJSON Feature pronta per una source "tempo-linee"/"tempo-linea".
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
