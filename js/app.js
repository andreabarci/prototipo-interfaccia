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
// Opacità dei marker non pertinenti al bisogno scelto (attenuati, non spariscono). Riusata anche nel
// percorso per i marker che non ricevono un ramo di equivalenza.
const OPACITA_ATTENUATA = 0.1;

// Taglie condivise fra marker singoli, cluster e stato selezionato: un'unica fonte di verità, così
// un cluster a riposo e un marker selezionato risultano sempre identici (stessa taglia, stesso bordo).
const RAGGIO_NORMALE = { 10: 3.5, 14: 7 }; // marker singolo a riposo, per fermata di zoom
const FATTORE_GRANDE = 2.5; // quanto più grandi sono i cluster e i marker selezionati rispetto al normale
const RAGGIO_GRANDE = { 10: RAGGIO_NORMALE[10] * FATTORE_GRANDE, 14: RAGGIO_NORMALE[14] * FATTORE_GRANDE };
const BORDO_NORMALE = 1.5;
const BORDO_GRANDE = 3;
// Quanto del diametro del marker grande occupa l'icona (il resto è il margine colorato attorno).
const SCALA_ICONA = 0.55;
// In hover, un marker singolo o un cluster crescono leggermente (sulla taglia che hanno già) per far
// capire su quale ci si trova; la loro ombra si intensifica un poco. Riusano "inEvidenzaMarker".
const FATTORE_HOVER_MARKER = 1.15;
// Raggio dell'ombra = raggio del marker × questo fattore, a ogni taglia (proporzionale, non un
// margine fisso): con un marker da 3,5px l'ombra arriva a 5px, come richiesto.
const OMBRA_FATTORE = 5 / 3.5;
// circle-blur è una sfumatura proporzionale al raggio: con un valore alto, la parte che sporge dal
// marker (l'unica visibile) cade quasi tutta già dentro la zona sfumata, e si vede pochissimo —
// per questo va tenuta bassa, non "morbida", anche se il margine sopra sembra già abbondante.
const OMBRA_SFUMATURA = 0.2;
const OMBRA_SCARTO = [0, 0]; // circle-translate: centrata sul marker, non spostata di lato
const OMBRA_OPACITA = 0.125; // marker acceso, a riposo
const OMBRA_OPACITA_HOVER = 0.19;
// Nessuna costante per l'ombra attenuata: è sempre zero, vedi il livello "enti-ombra".

// Etichetta col nome dell'ente (hover, marker selezionato, marker collegato da un ramo): nessun
// contenitore, colorata come il marker, con un bordo bianco (halo) per restare leggibile sulla mappa.
const ETICHETTA_DIMENSIONE = 12;
const ETICHETTA_BORDO_COLORE = "#ffffff";
const ETICHETTA_BORDO_SPESSORE = 1.3;
// Distanza fissa, in px, fra il BORDO del marker e il testo — sempre la stessa, che il marker sia
// normale, grande (selezionato) o un cluster: calcolata su misura per ciascuna taglia (vedi
// offsetEtichetta più sotto), non su un'unica distanza dal centro, altrimenti varierebbe col raggio.
const ETICHETTA_MARGINE = 9;

// Tendina destra: bisogni a tendina (accordion) sopra i servizi dell'ente. Valori qui, passati al
// CSS come variabili personalizzate all'avvio di startApp (vedi sotto), così restano in un solo posto.
const TENDINA_DURATA_MS = 200; // apertura/chiusura di un bisogno
const TENDINA_RIENTRO = "10px"; // margine a sinistra dei servizi sotto un bisogno aperto
const TENDINA_COLORE_INTESTAZIONE_ATTIVA = "#1d2428"; // stesso trattamento del bisogno attivo in tendina sinistra

// Rami di equivalenza tra servizi (Momento 4-5 dello scenario A): valori grafici provvisori,
// raccolti qui perché Andrea possa ritoccarli a mano. La regola di equivalenza (stesso bisogno già
// selezionato + stessa categoria semplificata dell'ente) è discussa e confermata con Andrea.
// Provvisori: i colori definitivi li decide Andrea. A riposo tutti i rami sono grigio chiaro;
// solo quello sotto il cursore (o il cui marker collegato è in hover) diventa grigio scuro e più spesso.
const RAMO_COLORE_RIPOSO = "#aab1b6";
const RAMO_COLORE_HOVER = "#1d2428";
const RAMO_SPESSORE = 0.75; // a metà fra 1 (il valore originale) e 0,5 (l'ultimo, dimezzato)
const RAMO_SPESSORE_HOVER = 1.75;
const RAMO_OPACITA = 0.9; // a riposo
const RAMO_OPACITA_HOVER = 1; // il ramo in evidenza
const RAMO_OPACITA_SPENTO = 0.15; // tutti gli altri, mentre uno è in evidenza (per leggere le etichette)
const RAMO_CURVATURA = 0.15; // spostamento del punto di controllo, in percentuale della lunghezza del ramo
const RAMO_CAMPIONI = 40; // punti con cui si disegna la curva
const RAMO_FASCIA_HOVER = 12; // larghezza in px dell'area sensibile invisibile sotto il ramo
const DISSOLVENZA_MS = 200; // durata della dissolvenza: comparsa dei rami, attenuazione dei marker

// Adiacenza di bisogno, in una sola forma per ora: dal servizio per la persona ai servizi per chi
// assiste (C01/C02) — regola confermata da Andrea. Stessi rami di equivalenza (stessa curvatura,
// stessa funzione), ma tratteggiati e più tenui; l'unico tipo con una direzione, quindi una freccia.
const ADIACENZA_OPACITA = 0.45; // più tenue di RAMO_OPACITA
const ADIACENZA_TRATTO_PIENO = 3; // px
const ADIACENZA_TRATTO_VUOTO = 3; // px
const ADIACENZA_MASSIMO = 5; // al massimo i N più vicini per tempo a piedi dal domicilio
const ADIACENZA_FRECCIA_DIMENSIONE = 8; // px

// Linee del tempo (domicilio → marker), in hover su un ramo: rette (mai curve, per non confondersi
// con i rami, che sono curvi), tratteggiate, sottili, colore neutro — natura diversa dai rami anche
// nel disegno, non solo nel significato. Le etichette con icona e minuti arrivano in un passo dopo.
const TEMPO_LINEA_COLORE = "#8a9299"; // grigio medio, neutro
const TEMPO_LINEA_SPESSORE = 1.5;
const TEMPO_LINEA_OPACITA = 0.9;
const TEMPO_LINEA_TRATTO_PIENO = 4; // px
const TEMPO_LINEA_TRATTO_VUOTO = 4; // px
const TEMPO_LINEA_MARGINE = 4; // oltre al raggio del marker, perché non tocchi il bordo/l'icona
const TEMPO_LINEA_DISSOLVENZA_MS = 150;

// I quattro tipi di legame fra servizi (vedi CLAUDE.md): non c'è un campo nei dati che li identifica
// già, sono id scelti qui. Equivalenza è l'unico con una regola di calcolo decisa (vedi trovaLegami);
// gli altri tre restano senza legami finché Andrea non la stabilisce — non è un errore del selettore.
const TIPI_LEGAME = [
  { id: "equivalenza", etichetta: "Equivalenza" },
  { id: "adiacenza", etichetta: "Anche per chi assiste" },
  { id: "successione", etichetta: "Successione" },
  { id: "incompatibilita", etichetta: "Incompatibilità" },
];

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

// Bisogni della cartella di questa persona (scenario A, vedi CLAUDE.md):
// B16 Compagnia e relazioni sociali (persona), C02 sofferenza psicologica (caregiver).
const BISOGNI_CARTELLA = ["B16", "C02"];

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

// Punto intermedio di una curva di Bézier quadratica: il punto di controllo è spostato in
// perpendicolare al segmento p0→p1, dal lato "destro" (senso orario visto da p0), di RAMO_CURVATURA
// volte la lunghezza del segmento. Restituisce RAMO_CAMPIONI punti campionati lungo la curva.
function campionaCurva(p0, p1) {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const lunghezza = Math.hypot(dx, dy) || 1;
  const px = dy / lunghezza; // perpendicolare normalizzata, ruotata di -90°
  const py = -dx / lunghezza;
  const cx = (p0[0] + p1[0]) / 2 + px * lunghezza * RAMO_CURVATURA;
  const cy = (p0[1] + p1[1]) / 2 + py * lunghezza * RAMO_CURVATURA;
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

// Domicilio inventato, zona Monte Stella / QT8 — Municipio 8 di Milano.
// Non corrisponde a un indirizzo reale: vedi la regola sui dati in CLAUDE.md.
// Si può spostare scrivendo un indirizzo nella tendina sinistra.
let DOMICILIO = { lat: 45.4809, lon: 9.1385 };

window.startApp = async function () {
  // Costanti della tendina a bisogni passate al CSS, così restano tutte in cima a questo file.
  document.documentElement.style.setProperty("--tendina-durata", TENDINA_DURATA_MS + "ms");
  document.documentElement.style.setProperty("--tendina-rientro", TENDINA_RIENTRO);
  document.documentElement.style.setProperty("--tendina-colore-attiva", TENDINA_COLORE_INTESTAZIONE_ATTIVA);
  document.documentElement.style.setProperty("--tempo-linea-colore", TEMPO_LINEA_COLORE);
  document.documentElement.style.setProperty("--tempo-dissolvenza", TEMPO_LINEA_DISSOLVENZA_MS + "ms");
  document.documentElement.style.setProperty("--ramo-colore-riposo", RAMO_COLORE_RIPOSO);

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
  const [bisogni, enti, servizi, tempiRiserva] = await Promise.all(
    ["data/bisogni.json", "data/enti.json", "data/servizi.json", "data/tempi_domicilio_iniziale.json"]
      .map((u) => fetch(u).then((r) => r.json()))
  );
  const bisognoById = Object.fromEntries(bisogni.map((b) => [b.id, b]));
  const enteById = Object.fromEntries(enti.map((e) => [e.id, e]));
  const servizioById = Object.fromEntries(servizi.map((s) => [s.id, s]));
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

  // id ente -> indice della feature "enti" che lo rappresenta (singolo o cluster): serve a trovare
  // rapidamente il marker giusto quando un servizio porta a un altro ente (rami di equivalenza).
  const featureIdPerEnte = {};
  gruppiArray.forEach((gruppo, i) => { for (const e of gruppo) featureIdPerEnte[e.id] = i; });

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
          properties: {
            conta: 1,
            macro_dominio: gruppo[0].macro_dominio,
            icona: null,
            // Icona di categoria e nome: noti da subito, un marker singolo è sempre lo stesso ente.
            icona_categoria: ICONA_PER_CATEGORIA[gruppo[0].categoria_origine] || null,
            nome: gruppo[0].nome,
            // Un marker singolo parte "normale": diventa true quando selezionato (vedi selezionaMarker).
            // Serve per la distanza dell'etichetta, che non può dipendere dallo stato di selezione
            // (quello si legge solo con feature-state, non utilizzabile per le proprietà di layout).
            etichettaGrande: false,
            // Idem per l'hover: la torta del cluster e il numero sono icone/testo (proprietà di
            // layout), non cerchi — non possono reagire al feature-state, solo a un dato vero e
            // proprio (vedi impostaInEvidenza, che lo tiene aggiornato a ogni passaggio del mouse).
            hoverDato: false,
          },
        };
      }
      const conteggi = conteggiDominio(gruppo);
      const icona = nomeTorta(conteggi);
      torteDaGenerare.set(icona, conteggi);
      return {
        type: "Feature",
        id: i,
        geometry: { type: "Point", coordinates: [gruppo[0].lon, gruppo[0].lat] },
        // icona_categoria e nome restano null finché non si sceglie un ente specifico dal popup del
        // cluster (vengono scritti allora, vedi selezionaMarker più sotto: il gruppo ne ha più d'uno).
        // Un cluster è sempre "grande" (vedi RAGGIO_GRANDE), anche a riposo.
        properties: {
          conta: gruppo.length, macro_dominio: null, icona, icona_categoria: null, nome: null,
          etichettaGrande: true, hoverDato: false,
        },
      };
    }),
  };

  // Riferimento diretto a ogni Feature per id: permette di riordinare geojson.features (per portare
  // un marker in primo piano, vedi portaInPrimoPiano) senza perdere la corrispondenza id → oggetto,
  // che altrimenti servirebbe l'indice nell'array (geojson.features[id] non varrebbe più dopo un riordino).
  const featureById = {};
  geojson.features.forEach((f) => { featureById[f.id] = f; });

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
        <button type="submit">Conferma</button>
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
    container: "map", style: CONFIG.mapStyle, center: CONFIG.center, zoom: CONFIG.zoom,
    minZoom: CONFIG.minZoom, maxZoom: CONFIG.maxZoom, language: "it",
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

  // Indicatore leggero dello zoom corrente: un comando della mappa in più, così Mapbox lo mette da
  // solo subito sotto i pulsanti +/- (stessa colonna, in alto a destra).
  class ZoomIndicatoreControl {
    onAdd(mappa) {
      this._map = mappa;
      this._el = document.createElement("div");
      this._el.className = "mapboxgl-ctrl zoom-indicatore";
      this._aggiorna = () => { this._el.textContent = "Zoom " + mappa.getZoom().toFixed(1); };
      mappa.on("zoom", this._aggiorna);
      this._aggiorna();
      return this._el;
    }
    onRemove() {
      this._map.off("zoom", this._aggiorna);
      this._el.remove();
    }
  }
  map.addControl(new ZoomIndicatoreControl(), "top-right");

  // Dati del marker del domicilio: un solo punto, aggiornato (vedi geocodifica più sotto) quando si
  // scrive un nuovo indirizzo in tendina sinistra.
  function datiDomicilio() {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [DOMICILIO.lon, DOMICILIO.lat] }, properties: {} }],
    };
  }

  // Sposta il marker del domicilio sulla mappa e rilancia il calcolo dei tempi a piedi.
  // Tenuta separata dal campo indirizzo, così la si può richiamare anche da altri punti.
  function aggiornaDomicilio(lng, lat) {
    DOMICILIO = { lat, lon: lng };
    const sorgenteDomicilio = map.getSource("domicilio");
    if (sorgenteDomicilio) sorgenteDomicilio.setData(datiDomicilio());
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14) });
    calcolaTempi(lat, lng, false);
  }

  // Tempi a piedi dal domicilio a ogni ente (per id ente: i servizi di uno stesso ente lo
  // condividono). stato: "calcolo" mentre la richiesta è in corso, "ok" con minuti e metri una volta
  // arrivata, "errore" se la API non risponde. Per il domicilio INIZIALE, un errore usa i valori di
  // riserva calcolati una volta con strumenti/calcola_tempi.py (vedi data/tempi_domicilio_iniziale.json);
  // per un domicilio cambiato dopo, un errore resta un errore (le etichette mostreranno "—").
  let tempiPerEnte = {};
  let richiestaTempiCorrente = 0; // scarta le risposte di una richiesta superata da una più recente

  async function calcolaTempi(lat, lon, origineIniziale) {
    const idRichiesta = ++richiestaTempiCorrente;
    for (const e of sulla_mappa) tempiPerEnte[e.id] = { stato: "calcolo" };

    const GRUPPO = 24; // + il domicilio = 25, il massimo della Matrix API
    for (let i = 0; i < sulla_mappa.length; i += GRUPPO) {
      const gruppo = sulla_mappa.slice(i, i + GRUPPO);
      const coordinate = [[lon, lat], ...gruppo.map((e) => [e.lon, e.lat])]
        .map(([lo, la]) => lo + "," + la).join(";");
      const url = "https://api.mapbox.com/directions-matrix/v1/mapbox/walking/" + coordinate
        + "?sources=0&annotations=duration,distance&access_token=" + CONFIG.mapboxToken;
      try {
        const risposta = await fetch(url);
        const dati = await risposta.json();
        if (idRichiesta !== richiestaTempiCorrente) return; // il domicilio è cambiato di nuovo nel frattempo
        if (dati.code !== "Ok") throw new Error(dati.code);
        const durate = dati.durations[0];
        const distanze = dati.distances[0];
        gruppo.forEach((e, idx) => {
          const durata = durate[idx + 1];
          tempiPerEnte[e.id] = durata == null
            ? { stato: "errore" } // irraggiungibile a piedi secondo il routing
            : { stato: "ok", minuti: Math.round(durata / 60), metri: Math.round(distanze[idx + 1]) };
        });
      } catch (err) {
        if (idRichiesta !== richiestaTempiCorrente) return;
        console.warn("Tempi a piedi non calcolati per un gruppo di enti:", err.message);
        gruppo.forEach((e) => {
          tempiPerEnte[e.id] = (origineIniziale && tempiRiserva[e.id])
            ? { stato: "ok", ...tempiRiserva[e.id] }
            : { stato: "errore" };
        });
      }
    }
  }
  calcolaTempi(DOMICILIO.lat, DOMICILIO.lon, true);

  let scelto = null; // id numerico della feature "enti" attualmente selezionata (ente o cluster aperto)

  map.on("load", async () => {
    map.addSource("enti", { type: "geojson", data: geojson });
    map.addSource("rami", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("tempo-linee", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    for (const [nome, conteggi] of torteDaGenerare) {
      if (!map.hasImage(nome)) map.addImage(nome, disegnaTorta(conteggi), { pixelRatio: PIXELRATIO_TORTA });
    }

    // Marker del domicilio: stessa impostazione di un marker "cliccato" (taglia RAGGIO_GRANDE, bordo
    // bianco BORDO_GRANDE), ma senza stato a riposo — è sempre a quella taglia. Interno nero, con
    // l'icona di domicilio.png sopra (267×267 fisici, caricata a pixelRatio 2 → 133,5 px logici).
    map.addSource("domicilio", { type: "geojson", data: datiDomicilio() });
    const raggioDomicilio = ["interpolate", ["linear"], ["zoom"], 10, RAGGIO_GRANDE[10], 14, RAGGIO_GRANDE[14]];
    // Proporzionale al cerchio, come per gli altri marker (vedi OMBRA_FATTORE): altrimenti resta
    // completamente coperta da lui e non si vede.
    const raggioOmbraDomicilio = ["interpolate", ["linear"], ["zoom"],
      10, RAGGIO_GRANDE[10] * OMBRA_FATTORE, 14, RAGGIO_GRANDE[14] * OMBRA_FATTORE];
    map.addLayer({
      id: "domicilio-ombra",
      type: "circle",
      source: "domicilio",
      paint: { "circle-radius": raggioOmbraDomicilio, "circle-color": "#000000", "circle-blur": OMBRA_SFUMATURA, "circle-opacity": OMBRA_OPACITA },
    });
    map.addLayer({
      id: "domicilio-cerchio",
      type: "circle",
      source: "domicilio",
      paint: {
        "circle-radius": raggioDomicilio,
        "circle-color": "#000000",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": BORDO_GRANDE,
      },
    });
    try {
      const immagineDomicilio = await caricaImmagine("icons/domicilio.png");
      if (!map.hasImage("domicilio")) map.addImage("domicilio", immagineDomicilio, { pixelRatio: 2 });
      const nativoDomicilio = immagineDomicilio.width / 2; // px logici a icon-size 1
      map.addLayer({
        id: "domicilio-icona",
        type: "symbol",
        source: "domicilio",
        layout: {
          "icon-image": "domicilio",
          "icon-size": ["interpolate", ["linear"], ["zoom"],
            10, (2 * RAGGIO_GRANDE[10] * SCALA_ICONA) / nativoDomicilio,
            14, (2 * RAGGIO_GRANDE[14] * SCALA_ICONA) / nativoDomicilio],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    } catch (err) {
      console.warn(err.message);
    }

    // Taglia condivisa: un marker normale a riposo è la base; un cluster a riposo (conta > 1) e un
    // marker selezionato (scelto, singolo o dentro un cluster) sono entrambi RAGGIO_GRANDE — non in
    // proporzione a quanti enti raggruppa il cluster. Lo spazio in più sul selezionato ospita
    // l'icona di categoria dell'ente (vedi livello enti-icona più sotto).
    const grande = ["any", ["boolean", ["feature-state", "scelto"], false], [">", ["get", "conta"], 1]];
    // In hover (marker o cluster, vedi inEvidenzaMarker) la taglia cresce un po' in più, qualunque sia
    // già la taglia di base (normale o grande): un rialzo relativo, non una taglia a parte. fattore
    // moltiplica tutto (serve all'ombra, proporzionale al marker: vedi raggioOmbra). I valori sono
    // precalcolati: non si può moltiplicare un'espressione di zoom "al volo", deve restare il livello
    // più esterno, altrimenti Mapbox la rifiuta (è già successo: vedi cronologia del progetto).
    function tagliaMarker(zoomId, fattore = 1) {
      const normale = RAGGIO_NORMALE[zoomId] * fattore;
      const estesa = RAGGIO_GRANDE[zoomId] * fattore;
      return ["case",
        ["boolean", ["feature-state", "inEvidenzaMarker"], false],
        ["case", grande, estesa * FATTORE_HOVER_MARKER, normale * FATTORE_HOVER_MARKER],
        grande, estesa,
        normale];
    }
    const raggio = ["interpolate", ["linear"], ["zoom"], 10, tagliaMarker(10), 14, tagliaMarker(14)];
    const raggioOmbra = ["interpolate", ["linear"], ["zoom"],
      10, tagliaMarker(10, OMBRA_FATTORE), 14, tagliaMarker(14, OMBRA_FATTORE)];
    // Distanza fissa fra il bordo del marker e l'etichetta (vedi ETICHETTA_MARGINE): calcolata sulla
    // taglia "grande" o "normale" di base, letta dal dato (etichettaGrande), non dallo stato di
    // selezione — una proprietà di layout come text-radial-offset non può dipendere da feature-state.
    function offsetEtichetta(zoomId) {
      const normale = (RAGGIO_NORMALE[zoomId] + ETICHETTA_MARGINE) / ETICHETTA_DIMENSIONE;
      const estesa = (RAGGIO_GRANDE[zoomId] + ETICHETTA_MARGINE) / ETICHETTA_DIMENSIONE;
      return ["case", ["get", "etichettaGrande"], estesa, normale];
    }
    const distanzaEtichetta = ["interpolate", ["linear"], ["zoom"],
      10, offsetEtichetta(10), 14, offsetEtichetta(14)];
    // Taglia della torta del cluster e dell'icona di categoria: anche queste leggono "hoverDato" (un
    // dato, non uno stato) per crescere leggermente in hover, come fa il cerchio con tagliaMarker.
    function scalaIcona(dimensioneNormale) {
      return ["case", ["get", "hoverDato"], dimensioneNormale * FATTORE_HOVER_MARKER, dimensioneNormale];
    }
    const opacitaAttenuabile = ["case", ["boolean", ["feature-state", "attenuato"], false], OPACITA_ATTENUATA, 1];
    const transizioneAttenuazione = { duration: DISSOLVENZA_MS };
    // Colore del macrodominio, oppure quello dell'ente scelto dentro un cluster: riusato sia dai
    // marker sia dall'etichetta col nome, così sono sempre coerenti.
    const coloreEnte = ["case",
      ["all", [">", ["get", "conta"], 1], ["boolean", ["feature-state", "scelto"], false]],
      ["feature-state", "coloreScelto"],
      ["match", ["get", "macro_dominio"],
        "sanitario", COLORI.sanitario,
        "sociosanitario", COLORI.sociosanitario,
        "sociale", COLORI.sociale,
        "#888888"]];

    // Ombra leggera sotto ogni marker e cluster, per distinguerli dal piano della mappa.
    map.addLayer({
      id: "enti-ombra",
      type: "circle",
      source: "enti",
      paint: {
        "circle-radius": raggioOmbra,
        "circle-color": "#000000",
        "circle-blur": OMBRA_SFUMATURA,
        "circle-translate": OMBRA_SCARTO,
        // Attenuato vince sempre: zero ombra, anche se in hover (si può comunque passarci sopra per
        // leggerne il nome, ma resta "spento" come il resto del marker).
        "circle-opacity": ["case",
          ["boolean", ["feature-state", "attenuato"], false], 0,
          ["boolean", ["feature-state", "inEvidenzaMarker"], false], OMBRA_OPACITA_HOVER,
          OMBRA_OPACITA],
        "circle-opacity-transition": transizioneAttenuazione,
      },
    });

    // Rami di equivalenza: sotto tutti i livelli dei marker (vedi beforeId "enti-ombra").
    // Fascia larga e trasparente, solo per intercettare meglio il passaggio del mouse.
    map.addLayer({
      id: "rami-hitbox",
      type: "line",
      source: "rami",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-width": RAMO_FASCIA_HOVER, "line-opacity": 0 },
    }, "enti-ombra");

    // Linee del tempo (domicilio → marker): ancora più sotto dei rami (beforeId "rami-hitbox", che
    // esiste da qui in poi), così l'ordine è sempre base cartografica < linee del tempo < rami <
    // marker, come richiesto. Rette, tratteggiate, mai curve: diverse dai rami anche nel disegno, non
    // solo nel significato. "comparso" segue lo stesso schema dei rami: parte falso, un istante dopo
    // passa a vero, per la dissolvenza (vedi mostraLineeTempo più sotto).
    map.addLayer({
      id: "tempo-linee",
      type: "line",
      source: "tempo-linee",
      layout: { "line-cap": "butt" }, // non "round": non deve sporgere oltre il bordo del marker
      paint: {
        "line-color": TEMPO_LINEA_COLORE,
        "line-width": TEMPO_LINEA_SPESSORE,
        "line-dasharray": [TEMPO_LINEA_TRATTO_PIENO / TEMPO_LINEA_SPESSORE, TEMPO_LINEA_TRATTO_VUOTO / TEMPO_LINEA_SPESSORE],
        "line-opacity": ["case", ["boolean", ["feature-state", "comparso"], false], TEMPO_LINEA_OPACITA, 0],
        "line-opacity-transition": { duration: TEMPO_LINEA_DISSOLVENZA_MS },
      },
    }, "rami-hitbox");

    // Il ramo vero e proprio: sottile, estremità arrotondate, nessuna freccia (l'equivalenza non ha
    // direzione). "comparso" parte falso e passa a vero un istante dopo aver ricevuto i dati, così
    // la comparsa si vede come una dissolvenza e non uno scatto (vedi mostraRami più sotto).
    map.addLayer({
      id: "rami",
      type: "line",
      source: "rami",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["case", ["boolean", ["feature-state", "inEvidenza"], false], RAMO_COLORE_HOVER, RAMO_COLORE_RIPOSO],
        "line-width": ["case", ["boolean", ["feature-state", "inEvidenza"], false], RAMO_SPESSORE_HOVER, RAMO_SPESSORE],
        "line-opacity": ["case",
          ["!", ["boolean", ["feature-state", "comparso"], false]], 0,
          ["boolean", ["feature-state", "inEvidenza"], false], RAMO_OPACITA_HOVER,
          ["boolean", ["feature-state", "spento"], false], RAMO_OPACITA_SPENTO,
          RAMO_OPACITA],
        "line-opacity-transition": transizioneAttenuazione,
      },
    }, "enti-ombra");

    // Marker singoli: un ente per punto, colorato per macrodominio.
    map.addLayer({
      id: "enti-punti",
      type: "circle",
      source: "enti",
      filter: ["==", ["get", "conta"], 1],
      paint: {
        "circle-radius": raggio,
        "circle-color": coloreEnte,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": ["case", ["boolean", ["feature-state", "scelto"], false], BORDO_GRANDE, BORDO_NORMALE],
        "circle-opacity": opacitaAttenuabile,
        "circle-stroke-opacity": opacitaAttenuabile,
        "circle-opacity-transition": transizioneAttenuazione,
        "circle-stroke-opacity-transition": transizioneAttenuazione,
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
          10, scalaIcona(RAGGIO_GRANDE[10] / 32),
          14, scalaIcona(RAGGIO_GRANDE[14] / 32)],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        // L'ordine dei dati decide chi sta sopra: "auto" userebbe la posizione in verticale sullo
        // schermo, vanificando portaInPrimoPiano quando si è in hover (vedi più sotto).
        "symbol-z-order": "source",
      },
      paint: {
        // Si nasconde quando un ente del gruppo è scelto: prende il suo posto il marker a tinta piena.
        "icon-opacity": ["case",
          ["boolean", ["feature-state", "scelto"], false], 0,
          ["boolean", ["feature-state", "attenuato"], false], OPACITA_ATTENUATA,
          1],
        "icon-opacity-transition": transizioneAttenuazione,
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
        "text-size": scalaIcona(11),
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "symbol-z-order": "source",
      },
      paint: {
        "text-color": "#ffffff",
        // Se un ente del gruppo è selezionato, il numero si nasconde: il marker di quell'ente
        // copre temporaneamente lo stack, finché non si deseleziona o si chiude la tendina destra.
        "text-opacity": ["case",
          ["boolean", ["feature-state", "scelto"], false], 0,
          ["boolean", ["feature-state", "attenuato"], false], OPACITA_ATTENUATA,
          1],
        "text-opacity-transition": transizioneAttenuazione,
      },
    });

    // Icone di categoria (cartella icons/2x, bianche su sfondo trasparente): si caricano tutte,
    // anche quelle non ancora usate da nessun ente, così sono pronte per il clic su qualunque marker.
    // Se un'icona non si trova, lo si segnala in console ma non si blocca il resto della mappa (i
    // marker sono già tutti a schermo a questo punto, indipendentemente dall'esito).
    const nomiIcone = new Set(Object.values(ICONA_PER_CATEGORIA));
    await Promise.all([...nomiIcone].map(async (nome) => {
      if (map.hasImage(nome)) return;
      try {
        const immagine = await caricaImmagine(`icons/2x/icon-${nome}@2x.png`);
        map.addImage(nome, immagine, { pixelRatio: 2 });
      } catch (err) {
        console.warn(err.message);
      }
    }));

    // Icona di categoria sul marker selezionato (singolo o scelto dentro un cluster): si vede solo
    // quando il marker è "scelto", nello spazio in più già riservato quando il marker si ingrandisce.
    map.addLayer({
      id: "enti-icona",
      type: "symbol",
      source: "enti",
      layout: {
        "icon-image": ["get", "icona_categoria"],
        "icon-size": ["interpolate", ["linear"], ["zoom"],
          10, scalaIcona((2 * RAGGIO_GRANDE[10] * SCALA_ICONA) / 128),
          14, scalaIcona((2 * RAGGIO_GRANDE[14] * SCALA_ICONA) / 128)],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-z-order": "source",
      },
      paint: {
        "icon-opacity": ["case", ["boolean", ["feature-state", "scelto"], false], 1, 0],
      },
    });

    // Etichetta col nome dell'ente: senza contenitore, colorata come il marker, bordo bianco per
    // restare leggibile. Visibile al hover di un marker singolo, da fermo se è "scelto", oppure se è
    // il marker collegato da un ramo in evidenza (vedi evidenziaRamo più sotto). Mai per i cluster a
    // riposo: "nome" resta null finché non si sceglie un ente specifico (vedi geojson e selezionaMarker).
    map.addLayer({
      id: "enti-etichetta",
      type: "symbol",
      source: "enti",
      layout: {
        "text-field": ["get", "nome"],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-size": ETICHETTA_DIMENSIONE,
        // "top" vuol dire: il lato alto del testo tocca il punto, quindi il testo scende sotto di
        // esso. "bottom" (come avevo scritto prima per errore) fa l'opposto: appare sopra.
        "text-anchor": "top",
        "text-radial-offset": distanzaEtichetta,
        // Sempre visibile, a ogni zoom: ignora le collisioni con le altre scritte della mappa (vie,
        // quartieri...). In cambio non si sposta più da sola per evitarle — è sempre "sotto" il marker.
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "symbol-z-order": "source",
      },
      paint: {
        "text-color": coloreEnte,
        "text-halo-color": ETICHETTA_BORDO_COLORE,
        "text-halo-width": ETICHETTA_BORDO_SPESSORE,
        // nascondiEtichetta vince su tutto: quando un servizio è selezionato, il nome dell'ente non
        // sta più qui ma dentro al fumetto, insieme al servizio (vedi selezionaServizio).
        "text-opacity": ["case",
          ["boolean", ["feature-state", "nascondiEtichetta"], false], 0,
          ["boolean", ["feature-state", "scelto"], false], 1,
          ["boolean", ["feature-state", "inEvidenzaMarker"], false], 1,
          0],
        "text-opacity-transition": transizioneAttenuazione,
      },
    });

    // Il ramo sotto il cursore: una copia, sopra a tutti i marker. Stessa sorgente del ramo "normale"
    // (sotto ai marker, che resta dov'è) e stesso feature-state "inEvidenza": nessuna scrittura dati
    // a parte, quindi compare/sparisce nello stesso istante del resto — niente più sfarfallio dovuto
    // a due aggiornamenti leggermente sfasati (era così quando aveva una sorgente propria).
    map.addLayer({
      id: "rami-evidenza",
      type: "line",
      source: "rami",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": RAMO_COLORE_HOVER,
        "line-width": RAMO_SPESSORE_HOVER,
        "line-opacity": ["case", ["boolean", ["feature-state", "inEvidenza"], false], RAMO_OPACITA_HOVER, 0],
      },
    });

    // I due capi del ramo in evidenza, ridisegnati sopra di lui: senza, il ramo li coprirebbe. Stessa
    // taglia e colore dei marker veri (raggio/coloreEnte), che restano sotto, invariati. Nessun
    // filtro sul dato: la visibilità legge il feature-state "capoRamo" (impostato insieme a
    // "inEvidenza" sui rami, vedi evidenziaRamo), così compaiono nello stesso istante del ramo sopra
    // — un filtro basato su una proprietà avrebbe richiesto una riscrittura dei dati più lenta, non
    // sincronizzata con il ramo, ed era quello a causare lo sfarfallio.
    map.addLayer({
      id: "enti-capo-ramo",
      type: "circle",
      source: "enti",
      paint: {
        "circle-radius": raggio,
        "circle-color": coloreEnte,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": ["case", ["boolean", ["feature-state", "scelto"], false], BORDO_GRANDE, BORDO_NORMALE],
        "circle-opacity": ["case", ["boolean", ["feature-state", "capoRamo"], false], 1, 0],
        "circle-stroke-opacity": ["case", ["boolean", ["feature-state", "capoRamo"], false], 1, 0],
      },
    });

    // Stesso motivo del cerchio sopra: anche l'icona di categoria (visibile solo se il capo è
    // "scelto", cioè l'origine) andrebbe coperta dal ramo in evidenza. Stessa ricetta di enti-icona.
    map.addLayer({
      id: "enti-capo-ramo-icona",
      type: "symbol",
      source: "enti",
      layout: {
        "icon-image": ["get", "icona_categoria"],
        "icon-size": ["interpolate", ["linear"], ["zoom"],
          10, scalaIcona((2 * RAGGIO_GRANDE[10] * SCALA_ICONA) / 128),
          14, scalaIcona((2 * RAGGIO_GRANDE[14] * SCALA_ICONA) / 128)],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": ["case",
          ["all", ["boolean", ["feature-state", "capoRamo"], false], ["boolean", ["feature-state", "scelto"], false]], 1,
          0],
      },
    });

    // E per la stessa ragione l'etichetta col nome (qui sempre visibile, essendo un capo del ramo:
    // l'origine è "scelta", il marker collegato è "in evidenza" per via di evidenziaRamo).
    map.addLayer({
      id: "enti-capo-ramo-etichetta",
      type: "symbol",
      source: "enti",
      layout: {
        "text-field": ["get", "nome"],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-size": ETICHETTA_DIMENSIONE,
        "text-anchor": "top",
        "text-radial-offset": distanzaEtichetta,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": coloreEnte,
        "text-halo-color": ETICHETTA_BORDO_COLORE,
        "text-halo-width": ETICHETTA_BORDO_SPESSORE,
        "text-opacity": ["case",
          ["boolean", ["feature-state", "nascondiEtichetta"], false], 0,
          ["all",
            ["boolean", ["feature-state", "capoRamo"], false],
            ["any", ["boolean", ["feature-state", "scelto"], false], ["boolean", ["feature-state", "inEvidenzaMarker"], false]]],
          1, 0],
      },
    });

    const LAYER_ENTI = ["enti-punti", "enti-cluster-torta", "enti-cluster-scelto"];

    // Porta un marker in cima all'ordine di disegno, cioè in fondo all'array (per questo serve
    // featureById: dopo un riordino l'indice nell'array non coincide più con l'id). Non scrive sulla
    // mappa da sola: lo fa chi la chiama, insieme a eventuali altre proprietà cambiate nello stesso
    // momento (vedi impostaInEvidenza e selezionaMarker). Via via che si passa sopra ai marker, chi è
    // stato toccato per ultimo resta il più in vista — non c'è bisogno di riportare indietro gli altri.
    function portaInPrimoPiano(featureId) {
      const f = featureById[featureId];
      if (!f) return;
      const indice = geojson.features.indexOf(f);
      if (indice !== -1 && indice !== geojson.features.length - 1) {
        geojson.features.splice(indice, 1);
        geojson.features.push(f);
      }
    }

    // Accende/spegne l'hover di un marker o cluster. Il cerchio e la sua ombra reagiscono da soli
    // via feature-state (vedi tagliaMarker); la torta del cluster, il suo numero e l'icona di
    // categoria no (sono icone/testo, non cerchi): per loro serve "hoverDato", un dato vero scritto
    // qui e riletto da scalaIcona.
    function impostaInEvidenza(featureId, attivo) {
      map.setFeatureState({ source: "enti", id: featureId }, { inEvidenzaMarker: attivo });
      const f = featureById[featureId];
      if (f) f.properties.hoverDato = attivo;
      if (attivo) portaInPrimoPiano(featureId);
      map.getSource("enti").setData(geojson);
    }

    // ---------- ventaglio e percorso: stato condiviso
    // Un bisogno alla volta sulla mappa (ventaglio) oppure un servizio alla volta (percorso): i due
    // stati non coesistono, quindi condividono la stessa logica di attenuazione. Riusa sempre
    // OPACITA_ATTENUATA per i marker, mai un valore nuovo.
    let bisognoSelezionato = null;
    let servizioSelezionatoId = null;
    let sediConRamo = null; // Set di id ente collegati da un ramo, quando un servizio è selezionato
    let destinazioniPerIndice = []; // indice ramo -> { sedeId, servizio, coord, featureId }
    let ramoInEvidenza = null; // indice del ramo sotto il cursore (o del cui marker si è in hover)
    let markerInEvidenza = null; // feature id del marker singolo sotto il cursore, fuori dal percorso
    // Tipo di legame attivo sul ramo (vedi selettore e trovaLegami più sotto): equivalenza è l'unico
    // con una regola di calcolo decisa per ora; gli altri restano "nessun legame" finché non lo sarà.
    let tipoLegameAttivo = "equivalenza";

    function aggiornaAttenuazione() {
      if (sediConRamo) {
        // Percorso: restano accesi solo il marker di partenza e quelli raggiunti da un ramo.
        gruppiArray.forEach((gruppo, i) => {
          const haRamo = i === scelto || gruppo.some((e) => sediConRamo.has(e.id));
          map.setFeatureState({ source: "enti", id: i }, { attenuato: !haRamo });
        });
      } else {
        // Ventaglio: restano accesi i marker con almeno un servizio pertinente al bisogno scelto.
        const pertinenti = bisognoSelezionato ? (sediPerBisogno[bisognoSelezionato] || new Set()) : null;
        gruppiArray.forEach((gruppo, i) => {
          const attenuato = pertinenti ? !gruppo.some((e) => pertinenti.has(e.id)) : false;
          map.setFeatureState({ source: "enti", id: i }, { attenuato });
        });
      }
    }

    // ---------- percorso: rami fra il servizio scelto e i suoi legami (equivalenza o adiacenza)
    let ramiCorrenti = { type: "FeatureCollection", features: [] };
    let timeoutRamiUscita = null;

    // Tratteggio e opacità dipendono dal tipo attivo (vedi ASPETTO): l'equivalenza resta uno stile
    // pieno e a piena intensità (non cambia nulla della sua grafica esistente), l'adiacenza è
    // tratteggiata e più tenue. Stesse funzione e livello "rami" per entrambe, come richiesto.
    function aggiornaStileRamo() {
      const adiacenza = tipoLegameAttivo === "adiacenza";
      map.setPaintProperty("rami", "line-opacity", ["case",
        ["!", ["boolean", ["feature-state", "comparso"], false]], 0,
        ["boolean", ["feature-state", "inEvidenza"], false], RAMO_OPACITA_HOVER,
        ["boolean", ["feature-state", "spento"], false], RAMO_OPACITA_SPENTO,
        adiacenza ? ADIACENZA_OPACITA : RAMO_OPACITA]);
      // null toglie la proprietà invece di inventare un valore "pieno": questi due livelli non
      // avevano mai avuto un tratteggio prima d'ora, per l'equivalenza deve restare esattamente così.
      map.setPaintProperty("rami", "line-dasharray", adiacenza
        ? [ADIACENZA_TRATTO_PIENO / RAMO_SPESSORE, ADIACENZA_TRATTO_VUOTO / RAMO_SPESSORE]
        : null);
      map.setPaintProperty("rami-evidenza", "line-dasharray", adiacenza
        ? [ADIACENZA_TRATTO_PIENO / RAMO_SPESSORE_HOVER, ADIACENZA_TRATTO_VUOTO / RAMO_SPESSORE_HOVER]
        : null);
    }

    // Una freccia sola per ramo, solo per l'adiacenza (l'unico tipo con una direzione): un piccolo
    // triangolo ruotato secondo la tangente della curva vicino al capo di arrivo. Un pool di Marker
    // DOM, ricreato a ogni comparsa dei rami — non è richiesto che segua l'hover o si attenui.
    let frecceAdiacenza = [];
    function aggiornaFrecceAdiacenza(coordOrigine, coordDestinazioni) {
      frecceAdiacenza.forEach((m) => m.remove());
      frecceAdiacenza = [];
      if (tipoLegameAttivo !== "adiacenza") return;
      coordDestinazioni.forEach((coordDest) => {
        const punti = campionaCurva(coordOrigine, coordDest);
        const pA = map.project(punti[punti.length - 2]);
        const pB = map.project(punti[punti.length - 1]);
        const angolo = (Math.atan2(pB.y - pA.y, pB.x - pA.x) * 180) / Math.PI;
        const el = document.createElement("div");
        el.className = "freccia-adiacenza";
        el.innerHTML = '<svg viewBox="0 0 10 10" width="' + ADIACENZA_FRECCIA_DIMENSIONE + '" height="'
          + ADIACENZA_FRECCIA_DIMENSIONE + '"><path d="M0 0 L9 5 L0 10 Z" fill="currentColor"/></svg>';
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat(punti[punti.length - 1])
          .setRotation(angolo)
          .addTo(map);
        frecceAdiacenza.push(marker);
      });
    }

    function mostraRami(coordOrigine, coordDestinazioni) {
      if (timeoutRamiUscita) { clearTimeout(timeoutRamiUscita); timeoutRamiUscita = null; }
      aggiornaStileRamo();
      ramiCorrenti = {
        type: "FeatureCollection",
        features: coordDestinazioni.map((coord, i) => ({
          type: "Feature",
          id: i,
          geometry: { type: "LineString", coordinates: campionaCurva(coordOrigine, coord) },
          properties: {},
        })),
      };
      map.removeFeatureState({ source: "rami" }); // niente stato residuo di una selezione precedente
      map.getSource("rami").setData(ramiCorrenti);
      aggiornaFrecceAdiacenza(coordOrigine, coordDestinazioni);
      // "comparso" parte falso (quindi opacità 0): lo si alza un istante dopo, così la comparsa è
      // una dissolvenza (vedi "line-opacity-transition" sul livello "rami") e non uno scatto.
      requestAnimationFrame(() => {
        ramiCorrenti.features.forEach((f) => map.setFeatureState({ source: "rami", id: f.id }, { comparso: true }));
      });
    }

    function nascondiRami() {
      frecceAdiacenza.forEach((m) => m.remove());
      frecceAdiacenza = [];
      if (!ramiCorrenti.features.length) return;
      ramiCorrenti.features.forEach((f) => map.setFeatureState({ source: "rami", id: f.id }, { comparso: false }));
      if (timeoutRamiUscita) clearTimeout(timeoutRamiUscita);
      timeoutRamiUscita = setTimeout(() => {
        ramiCorrenti = { type: "FeatureCollection", features: [] };
        map.getSource("rami").setData(ramiCorrenti);
        timeoutRamiUscita = null;
      }, DISSOLVENZA_MS);
    }

    // ---------- percorso: linee del tempo (domicilio → marker), in hover su un ramo
    // Raggio attuale di un marker in pixel, calcolato in JS (non un'espressione Mapbox): serve per
    // fermare la linea esattamente al bordo. Rispecchia la stessa logica di tagliaMarker, con lo
    // zoom corrente al posto delle due fermate fisse 10/14 (stessa interpolazione lineare, bloccata
    // oltre i due estremi come fa Mapbox).
    function raggioMarkerPx(featureId, zoom, inEvidenza) {
      const t = Math.max(0, Math.min(1, (zoom - 10) / 4));
      const grandeF = featureId === scelto || gruppiArray[featureId].length > 1;
      const normale = RAGGIO_NORMALE[10] + (RAGGIO_NORMALE[14] - RAGGIO_NORMALE[10]) * t;
      const grande = RAGGIO_GRANDE[10] + (RAGGIO_GRANDE[14] - RAGGIO_GRANDE[10]) * t;
      const base = grandeF ? grande : normale;
      return inEvidenza ? base * FATTORE_HOVER_MARKER : base;
    }
    function raggioDomicilioPx(zoom) {
      const t = Math.max(0, Math.min(1, (zoom - 10) / 4));
      return RAGGIO_GRANDE[10] + (RAGGIO_GRANDE[14] - RAGGIO_GRANDE[10]) * t; // sempre "grande", mai in hover
    }

    // Il punto sul segmento coordCentro→coordAltro, spostato di raggioPx pixel verso l'altro
    // estremo: è dove la linea deve iniziare o fermarsi, al bordo del marker e non al centro.
    function puntoAlBordo(coordCentro, coordAltro, raggioPx) {
      const p0 = map.project(coordCentro);
      const p1 = map.project(coordAltro);
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const lunghezza = Math.hypot(dx, dy) || 1;
      const fattore = Math.min(raggioPx / lunghezza, 0.49); // mai oltre la metà, se i marker si toccano
      const lngLat = map.unproject([p0.x + dx * fattore, p0.y + dy * fattore]);
      return [lngLat.lng, lngLat.lat];
    }

    function segmentoLineaTempo(coordA, raggioA, coordB, raggioB) {
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            puntoAlBordo(coordA, coordB, raggioA + TEMPO_LINEA_MARGINE),
            puntoAlBordo(coordB, coordA, raggioB + TEMPO_LINEA_MARGINE),
          ],
        },
        properties: {},
      };
    }

    // Stesso schema di mostraRami/nascondiRami: "comparso" parte falso, passa a vero un istante
    // dopo, così la comparsa è una dissolvenza; alla sparizione si aspetta la dissolvenza prima di
    // svuotare davvero i dati.
    let lineeTempoCorrenti = { type: "FeatureCollection", features: [] };
    let timeoutLineeTempoUscita = null;

    function mostraLineeTempo(segmenti) {
      if (timeoutLineeTempoUscita) { clearTimeout(timeoutLineeTempoUscita); timeoutLineeTempoUscita = null; }
      lineeTempoCorrenti = { type: "FeatureCollection", features: segmenti.map((f, i) => ({ ...f, id: i })) };
      map.removeFeatureState({ source: "tempo-linee" });
      map.getSource("tempo-linee").setData(lineeTempoCorrenti);
      requestAnimationFrame(() => {
        lineeTempoCorrenti.features.forEach((f) => map.setFeatureState({ source: "tempo-linee", id: f.id }, { comparso: true }));
      });
    }

    function nascondiLineeTempo() {
      if (!lineeTempoCorrenti.features.length) return;
      lineeTempoCorrenti.features.forEach((f) => map.setFeatureState({ source: "tempo-linee", id: f.id }, { comparso: false }));
      if (timeoutLineeTempoUscita) clearTimeout(timeoutLineeTempoUscita);
      timeoutLineeTempoUscita = setTimeout(() => {
        lineeTempoCorrenti = { type: "FeatureCollection", features: [] };
        map.getSource("tempo-linee").setData(lineeTempoCorrenti);
        timeoutLineeTempoUscita = null;
      }, TEMPO_LINEA_DISSOLVENZA_MS);
    }

    // Testo di un'etichetta: "…" mentre il calcolo è in corso, "—" se non è arrivato nessun tempo,
    // altrimenti i minuti arrotondati (vedi calcolaTempi).
    function testoEtichettaTempo(enteId) {
      const t = tempiPerEnte[enteId];
      if (!t || t.stato === "calcolo") return "…";
      if (t.stato === "errore") return "—";
      return t.minuti + " min";
    }

    // Icona provvisoria, semplice: una persona stilizzata che cammina (testa + tronco + gambe e
    // braccia divaricate). Eredita il colore di testo dell'etichetta (currentColor).
    function iconaPersonaCheCammina() {
      return '<svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">'
        + '<circle cx="12" cy="4" r="2.2" fill="currentColor"/>'
        + '<path d="M12 7 L12 14 M12 14 L8 20 M12 14 L16 19 M12 9 L7 12 M12 9 L17 11" '
        + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'
        + '</svg>';
    }
    function pillolaTempoHtml(testo) {
      return iconaPersonaCheCammina() + `<span class="pillola-tempo__testo">${testo}</span>`;
    }

    // Le due etichette, una per linea: pronte dall'avvio, invisibili finché non servono (vedi CSS
    // ".pillola-tempo" / ".mostra") — più semplice che aggiungerle e toglierle dalla mappa ogni volta.
    const etichettaTempoOrigine = new mapboxgl.Marker({
      element: Object.assign(document.createElement("div"), { className: "pillola-tempo" }),
      anchor: "center",
    }).setLngLat([0, 0]).addTo(map);
    const etichettaTempoDestinazione = new mapboxgl.Marker({
      element: Object.assign(document.createElement("div"), { className: "pillola-tempo pillola-tempo--enfasi" }),
      anchor: "center",
    }).setLngLat([0, 0]).addTo(map);

    // Posizione delle due etichette: al centro del tratto visibile di ciascuna linea (quello che
    // resta fra i due bordi dei marker), spostata in perpendicolare per non stare sul tratteggio. Se
    // le due etichette risultano troppo vicine, si allontanano lungo la propria linea (non di lato).
    function posizionaEtichetteTempo(segOrigine, segDestinazione) {
      const OFFSET_PERPENDICOLARE = 8; // px, di lato rispetto alla linea
      const DISTANZA_MINIMA = 60; // px, sotto cui si considerano "troppo vicine"
      function base(seg) {
        if (!seg) return null;
        const p0 = map.project(seg.geometry.coordinates[0]);
        const p1 = map.project(seg.geometry.coordinates[1]);
        const dx = p1.x - p0.x, dy = p1.y - p0.y;
        const lunghezza = Math.hypot(dx, dy) || 1;
        return { p0, dx, dy, ux: dx / lunghezza, uy: dy / lunghezza };
      }
      const basi = [base(segOrigine), base(segDestinazione)];
      const frazioni = [0.5, 0.5];
      function posizionePx(i) {
        const b = basi[i];
        if (!b) return null;
        const cx = b.p0.x + b.dx * frazioni[i];
        const cy = b.p0.y + b.dy * frazioni[i];
        return { x: cx - b.uy * OFFSET_PERPENDICOLARE, y: cy + b.ux * OFFSET_PERPENDICOLARE };
      }
      if (basi[0] && basi[1]) {
        for (let tentativi = 0; tentativi < 6; tentativi++) {
          const p = [posizionePx(0), posizionePx(1)];
          if (Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) >= DISTANZA_MINIMA) break;
          frazioni[0] = Math.max(0.3, frazioni[0] - 0.06);
          frazioni[1] = Math.min(0.7, frazioni[1] + 0.06);
        }
      }
      return [0, 1].map((i) => {
        const pos = posizionePx(i);
        if (!pos) return null;
        const lngLat = map.unproject([pos.x, pos.y]);
        return [lngLat.lng, lngLat.lat];
      });
    }

    function mostraEtichetteTempo(posizioni, testi) {
      if (posizioni[0]) {
        etichettaTempoOrigine.getElement().innerHTML = pillolaTempoHtml(testi[0]);
        etichettaTempoOrigine.setLngLat(posizioni[0]);
        etichettaTempoOrigine.getElement().classList.add("mostra");
      } else {
        etichettaTempoOrigine.getElement().classList.remove("mostra");
      }
      etichettaTempoDestinazione.getElement().innerHTML = pillolaTempoHtml(testi[1]);
      etichettaTempoDestinazione.setLngLat(posizioni[1]);
      etichettaTempoDestinazione.getElement().classList.add("mostra");
    }

    function nascondiEtichetteTempo() {
      etichettaTempoOrigine.getElement().classList.remove("mostra");
      etichettaTempoDestinazione.getElement().classList.remove("mostra");
    }

    // Fumetti di stato: solo testo, nessun pulsante di chiusura.
    // - popupServizio: il servizio scelto in tendina destra, fisso finché resta selezionato.
    // - popupServizioCollegato: il servizio equivalente all'altro capo del ramo in evidenza, sopra
    //   al marker collegato; appare e sparisce con l'hover sul ramo (o sul marker collegato stesso).
    const popupServizio = new mapboxgl.Popup({
      closeButton: false, closeOnClick: false, focusAfterOpen: false,
      anchor: "bottom-left", offset: 14, className: "popup-servizio",
    });
    const popupServizioCollegato = new mapboxgl.Popup({
      closeButton: false, closeOnClick: false, focusAfterOpen: false,
      anchor: "bottom", offset: 14, className: "popup-servizio",
    });

    // Contenuto dei due fumetti sopra: servizio al primo posto, sotto l'ente che lo ospita ("presso",
    // in grigio chiaro, + il nome nel colore del suo macrodominio). Stesso markup per entrambi.
    function fumettoServizio(servizio, ente) {
      const colore = COLORI[ente.macro_dominio] || COLORE_CLUSTER;
      return `<strong class="fumetto-servizio__titolo">${servizio.titolo || "Servizio"}</strong>`
        + `<span class="fumetto-servizio__ente">`
        + `<span class="fumetto-servizio__presso">presso</span> `
        + `<span style="color:${colore}">${ente.nome}</span>`
        + `</span>`;
    }

    // Hover su un ramo o sul marker che collega: il ramo passa in primo piano (più scuro, più
    // spesso), tutti gli altri rami si attenuano ulteriormente per non affollare la lettura delle
    // etichette; sotto il marker collegato compare il suo nome, sopra il servizio che lo collega.
    function evidenziaRamo(indice) {
      if (indice < 0 || indice >= destinazioniPerIndice.length) return;
      ramoInEvidenza = indice;
      const dest = destinazioniPerIndice[indice];
      ramiCorrenti.features.forEach((f) => {
        map.setFeatureState({ source: "rami", id: f.id }, { inEvidenza: f.id === indice, spento: f.id !== indice });
      });
      // "rami-evidenza" legge lo stesso "inEvidenza" appena impostato sopra: compare da sé, nello
      // stesso istante. I due capi (origine e marker collegato) si ridisegnano sopra di lui — anche
      // loro via feature-state ("capoRamo"), non riscrivendo i dati: altrimenti arriverebbero a
      // schermo un istante dopo il ramo, con lo sfarfallio che si vedeva prima.
      if (scelto !== null) map.setFeatureState({ source: "enti", id: scelto }, { capoRamo: true });
      // nascondiEtichetta anche qui: il nome dell'ente di destinazione è già nel fumetto composto
      // (vedi fumettoServizio), l'etichetta separata sotto al marker sarebbe ridondante.
      map.setFeatureState({ source: "enti", id: dest.featureId }, { capoRamo: true, nascondiEtichetta: true });
      impostaInEvidenza(dest.featureId, true);
      const enteDestinazione = enteById[dest.sedeId];
      // Per l'equivalenza il fumetto resta esattamente com'era (comportamento esistente, da non
      // toccare); per gli altri tipi si aggiunge una piccola etichetta col nome della relazione.
      let htmlFumetto = fumettoServizio(dest.servizio, enteDestinazione);
      if (tipoLegameAttivo !== "equivalenza") {
        const infoTipo = TIPI_LEGAME.find((t) => t.id === tipoLegameAttivo);
        htmlFumetto = `<span class="fumetto-servizio__tipo">${infoTipo ? infoTipo.etichetta : ""}</span>` + htmlFumetto;
      }
      popupServizioCollegato.setLngLat(dest.coord).setHTML(htmlFumetto).addTo(map);

      // Linee del tempo: dal domicilio al servizio di partenza e dal domicilio all'altro capo del
      // ramo. Rette, al bordo dei marker (vedi segmentoLineaTempo), con un'etichetta ciascuna
      // (icona + minuti, "…" se il calcolo è ancora in corso, "—" se non è arrivato). Quella verso
      // l'altro capo del ramo è in grassetto: è il dato nuovo che si sta valutando.
      const zoom = map.getZoom();
      const coordDomicilio = [DOMICILIO.lon, DOMICILIO.lat];
      const raggioDomicilio = raggioDomicilioPx(zoom);

      let segOrigine = null;
      let testoOrigine = null;
      if (scelto !== null && gruppiArray[scelto]) {
        const coordOrigine = [gruppiArray[scelto][0].lon, gruppiArray[scelto][0].lat];
        const raggioOrigine = raggioMarkerPx(scelto, zoom, markerInEvidenza === scelto);
        segOrigine = segmentoLineaTempo(coordDomicilio, raggioDomicilio, coordOrigine, raggioOrigine);
        const servizioOrigine = servizioSelezionatoId ? servizioById[servizioSelezionatoId] : null;
        if (servizioOrigine) testoOrigine = testoEtichettaTempo(servizioOrigine.sede);
      }
      const raggioDestinazione = raggioMarkerPx(dest.featureId, zoom, true);
      const segDestinazione = segmentoLineaTempo(coordDomicilio, raggioDomicilio, dest.coord, raggioDestinazione);
      const testoDestinazione = testoEtichettaTempo(dest.sedeId);

      mostraLineeTempo(segOrigine ? [segOrigine, segDestinazione] : [segDestinazione]);
      const posizioni = posizionaEtichetteTempo(segOrigine, segDestinazione);
      mostraEtichetteTempo(posizioni, [testoOrigine, testoDestinazione]);
    }

    function spegniEvidenziaRamo() {
      if (ramoInEvidenza === null) return;
      const dest = destinazioniPerIndice[ramoInEvidenza];
      ramiCorrenti.features.forEach((f) => map.setFeatureState({ source: "rami", id: f.id }, { inEvidenza: false, spento: false }));
      if (scelto !== null) map.setFeatureState({ source: "enti", id: scelto }, { capoRamo: false });
      if (dest) {
        map.setFeatureState({ source: "enti", id: dest.featureId }, { capoRamo: false, nascondiEtichetta: false });
        impostaInEvidenza(dest.featureId, false);
      }
      popupServizioCollegato.remove();
      nascondiLineeTempo();
      nascondiEtichetteTempo();
      ramoInEvidenza = null;
    }

    map.on("mousemove", "rami-hitbox", (ev) => {
      const id = ev.features[0].id;
      if (ramoInEvidenza === id) return;
      spegniEvidenziaRamo();
      evidenziaRamo(id);
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "rami-hitbox", () => {
      spegniEvidenziaRamo();
      map.getCanvas().style.cursor = "";
    });

    // Legami dal servizio di partenza, per tipo (vedi TIPI_LEGAME). Equivalenza funzionale: altri
    // servizi che rispondono allo stesso bisogno già attivo e si trovano presso un ente della stessa
    // categoria semplificata — l'unica regola di calcolo decisa finora. Gli altri tre tipi
    // restituiscono sempre "nessun legame" (Map vuota) finché non viene stabilita una regola: non è
    // un errore, è il caso vuoto previsto dal selettore (vedi aggiornaMessaggioVuoto).
    function trovaLegami(servizio, bisognoContesto, tipo) {
      if (tipo === "equivalenza") {
        const enteOrigine = enteById[servizio.sede];
        const perSede = new Map(); // id ente -> un servizio collegato trovato lì (il primo)
        for (const altro of servizi) {
          if (altro.id === servizio.id || altro.sede === servizio.sede) continue;
          if (altro.risposta !== "R" || !altro.bisogni.includes(bisognoContesto)) continue;
          const enteAltro = enteById[altro.sede];
          if (!enteOrigine || !enteAltro || enteAltro.categoria !== enteOrigine.categoria) continue;
          if (!perSede.has(altro.sede)) perSede.set(altro.sede, altro);
        }
        return perSede;
      }

      if (tipo === "adiacenza") {
        // Regola confermata da Andrea: dal servizio per la persona (almeno un bisogno B01-B24) ai
        // servizi per chi assiste (C01 o C02), presso un ente diverso e geolocalizzato, i 5 più
        // vicini per tempo a piedi dal domicilio attuale (stesso calcolo usato in hover sui rami).
        const perPersona = servizio.bisogni.some((id) => id[0] === "B");
        if (!perPersona) return new Map();
        const candidati = [];
        for (const altro of servizi) {
          if (altro.sede === servizio.sede) continue;
          if (altro.risposta !== "R") continue;
          if (!altro.bisogni.includes("C01") && !altro.bisogni.includes("C02")) continue;
          const enteAltro = enteById[altro.sede];
          if (!enteAltro || enteAltro.lat == null) continue; // deve essere geolocalizzato
          const tempo = tempiPerEnte[altro.sede];
          if (!tempo || tempo.stato !== "ok") continue; // non classificabile: resta fuori dalla classifica
          candidati.push({ altro, minuti: tempo.minuti });
        }
        candidati.sort((a, b) => a.minuti - b.minuti);
        const perSede = new Map();
        for (const c of candidati) {
          if (perSede.size >= ADIACENZA_MASSIMO) break;
          if (!perSede.has(c.altro.sede)) perSede.set(c.altro.sede, c.altro);
        }
        return perSede;
      }

      return new Map(); // gli altri tipi non hanno ancora una regola di calcolo
    }

    // ---------- selettore del tipo di legame
    const selettoreLegameEl = document.getElementById("selettore-legame");
    const selettoreLegameVuotoEl = document.getElementById("selettore-legame-vuoto");
    const contenitorePulsantiLegame = document.getElementById("selettore-legame-pulsanti");
    TIPI_LEGAME.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "selettore-legame__pulsante";
      btn.dataset.tipo = t.id;
      btn.textContent = t.etichetta;
      btn.addEventListener("click", () => selezionaTipoLegame(t.id));
      contenitorePulsantiLegame.appendChild(btn);
    });
    function aggiornaPulsantiLegame() {
      contenitorePulsantiLegame.querySelectorAll(".selettore-legame__pulsante").forEach((b) => {
        b.classList.toggle("attivo", b.dataset.tipo === tipoLegameAttivo);
      });
    }
    function mostraSelettoreLegame() { selettoreLegameEl.hidden = false; }
    function nascondiSelettoreLegame() {
      selettoreLegameEl.hidden = true;
      tipoLegameAttivo = "equivalenza"; // il tipo torna all'equivalenza quando il controllo si nasconde
      aggiornaPulsantiLegame();
    }
    function aggiornaMessaggioVuoto() {
      selettoreLegameVuotoEl.hidden = !(servizioSelezionatoId !== null && destinazioniPerIndice.length === 0);
    }

    // Elenco dei servizi collegati in tendina destra (nome, ente, tempo a piedi): solo per i tipi
    // diversi dall'equivalenza, che non ne ha mai avuto uno e non deve cambiare aspetto. Per
    // l'adiacenza senza legami, il messaggio specifico richiesto invece di quello generico sopra.
    function aggiornaListaLegami() {
      const contenitore = document.getElementById("legami-collegati");
      if (servizioSelezionatoId === null || tipoLegameAttivo === "equivalenza") {
        contenitore.hidden = true;
        return;
      }
      contenitore.hidden = false;
      const infoTipo = TIPI_LEGAME.find((t) => t.id === tipoLegameAttivo);
      document.getElementById("legami-collegati-titolo").textContent = infoTipo ? infoTipo.etichetta : "";
      const vuotoEl = document.getElementById("legami-collegati-vuoto");
      const listaEl = document.getElementById("legami-collegati-lista");
      if (destinazioniPerIndice.length === 0) {
        vuotoEl.hidden = false;
        vuotoEl.textContent = tipoLegameAttivo === "adiacenza"
          ? "Nessun servizio adiacente per chi assiste"
          : "Nessun legame di questo tipo";
        listaEl.innerHTML = "";
        return;
      }
      vuotoEl.hidden = true;
      listaEl.innerHTML = destinazioniPerIndice.map((d) => {
        const ente = enteById[d.sedeId];
        return `<li><b>${d.servizio.titolo || "Servizio"}</b><br>`
          + `<span class="meta">presso ${ente ? ente.nome : d.sedeId} · ${testoEtichettaTempo(d.sedeId)}</span></li>`;
      }).join("");
    }
    function selezionaTipoLegame(tipo) {
      if (tipo === tipoLegameAttivo) return;
      tipoLegameAttivo = tipo;
      aggiornaPulsantiLegame();
      ricostruisciRami();
    }
    aggiornaPulsantiLegame();

    // Ricalcola i legami del tipo attivo a partire dal servizio selezionato, ridisegna i rami (stessa
    // funzione e stile di sempre) e lo stato dei marker. Usata sia alla prima selezione di un
    // servizio sia a ogni cambio di tipo nel selettore.
    function ricostruisciRami() {
      if (servizioSelezionatoId === null) return;
      const servizio = servizioById[servizioSelezionatoId];
      // Senza un bisogno attivo in tendina sinistra, si usa il primo bisogno del servizio stesso:
      // il clic su un marker funziona anche fuori dal ventaglio, quindi serve comunque un contesto.
      const bisognoContesto = bisognoSelezionato || servizio.bisogni[0];
      const origine = gruppiArray[featureIdPerEnte[servizio.sede]];
      if (!bisognoContesto || !origine) {
        sediConRamo = new Set();
        destinazioniPerIndice = [];
        nascondiRami();
        aggiornaAttenuazione();
        aggiornaMessaggioVuoto();
        aggiornaListaLegami();
        return;
      }
      const coordOrigine = [origine[0].lon, origine[0].lat];

      const legami = trovaLegami(servizio, bisognoContesto, tipoLegameAttivo);
      sediConRamo = new Set();
      destinazioniPerIndice = [];
      for (const [sedeId, servizioAltro] of legami) {
        const gruppoDest = gruppiArray[featureIdPerEnte[sedeId]];
        if (!gruppoDest) continue;
        sediConRamo.add(sedeId);
        destinazioniPerIndice.push({
          sedeId, servizio: servizioAltro, featureId: featureIdPerEnte[sedeId],
          coord: [gruppoDest[0].lon, gruppoDest[0].lat],
        });
      }

      if (destinazioniPerIndice.length > 0) mostraRami(coordOrigine, destinazioniPerIndice.map((d) => d.coord));
      else nascondiRami();
      aggiornaAttenuazione();
      aggiornaMessaggioVuoto();
      aggiornaListaLegami();
    }

    function selezionaServizio(servizio) {
      servizioSelezionatoId = servizio.id;
      ricostruisciRami();

      const origine = gruppiArray[featureIdPerEnte[servizio.sede]];
      if (origine) {
        // L'etichetta col nome dell'ente si spegne: la stessa informazione entra nel fumetto, sotto
        // al servizio (vedi testo-opacity di enti-etichetta/enti-capo-ramo-etichetta più sotto).
        if (scelto !== null) map.setFeatureState({ source: "enti", id: scelto }, { nascondiEtichetta: true });
        const enteOrigine = enteById[servizio.sede];
        const coordOrigine = [origine[0].lon, origine[0].lat];
        popupServizio.setLngLat(coordOrigine).setHTML(fumettoServizio(servizio, enteOrigine)).addTo(map);
      }
      mostraSelettoreLegame();

      // Un servizio sotto più bisogni compare più volte: tutte le sue occorrenze vanno selezionate.
      panelDxContent.querySelectorAll(".servizio-btn").forEach((b) => b.classList.toggle("selezionato", b.dataset.id === servizio.id));
    }

    function deselezionaServizio() {
      if (servizioSelezionatoId === null) return;
      servizioSelezionatoId = null;
      // Spegne l'evidenza del ramo (se attiva) finché destinazioniPerIndice è ancora valido: lì
      // dentro si legge per sapere quale marker riportare alla normalità (vedi spegniEvidenziaRamo).
      spegniEvidenziaRamo();
      sediConRamo = null;
      destinazioniPerIndice = [];
      nascondiRami();
      nascondiSelettoreLegame();
      aggiornaListaLegami();
      if (scelto !== null) map.setFeatureState({ source: "enti", id: scelto }, { nascondiEtichetta: false });
      popupServizio.remove();
      aggiornaAttenuazione();
      panelDxContent.querySelectorAll(".servizio-btn").forEach((b) => b.classList.remove("selezionato"));
    }

    function selezionaMarker(featureId, ente) {
      if (scelto !== null) {
        // nascondiEtichetta va spento qui e non solo in deselezionaServizio: quando si passa da un
        // ente a un altro, mostraEnte (più sotto) chiama deselezionaServizio dopo aver già riassegnato
        // "scelto" al nuovo marker — altrimenti l'etichetta del vecchio resterebbe spenta per sempre.
        map.setFeatureState({ source: "enti", id: scelto }, { scelto: false, coloreScelto: null, nascondiEtichetta: false });
        // Un marker singolo torna "normale" (un cluster resta sempre grande, vedi geojson iniziale).
        if (gruppiArray[scelto].length === 1) featureById[scelto].properties.etichettaGrande = false;
      }
      scelto = featureId;
      map.setFeatureState({ source: "enti", id: scelto }, { scelto: true, coloreScelto: COLORI[ente.macro_dominio] || COLORE_CLUSTER });
      featureById[featureId].properties.etichettaGrande = true;
      if (gruppiArray[featureId].length > 1) {
        // Icona e nome di un marker singolo sono già nei dati: qui invece vanno scritti, perché il
        // cluster raggruppa enti diversi e cambia a ogni scelta.
        featureById[featureId].properties.icona_categoria = ICONA_PER_CATEGORIA[ente.categoria_origine] || null;
        featureById[featureId].properties.nome = ente.nome;
      }
      portaInPrimoPiano(featureId);
      map.getSource("enti").setData(geojson);
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

    // Fumetto al passaggio del mouse sui cluster (più di un ente sullo stesso punto): resta un
    // riquadro, perché elenca più nomi. Un marker singolo invece usa l'etichetta colorata (sopra).
    const popupCluster = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });

    map.on("click", LAYER_ENTI, (ev) => {
      const f = ev.features[0];
      const gruppo = gruppiArray[f.id];
      if (gruppo.length === 1) selezionaMarker(f.id, gruppo[0]);
      else apriSceltaEnte(f, gruppo);
    });
    map.on("mouseenter", LAYER_ENTI, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", LAYER_ENTI, () => {
      map.getCanvas().style.cursor = "";
      popupCluster.remove();
      spegniEvidenziaRamo();
      if (markerInEvidenza !== null) {
        impostaInEvidenza(markerInEvidenza, false);
        markerInEvidenza = null;
      }
    });

    map.on("mousemove", LAYER_ENTI, (ev) => {
      const f = ev.features[0];
      const gruppo = gruppiArray[f.id];

      // Il marker (o cluster) sotto il cursore si evidenzia sempre — taglia, ombra e primo piano
      // reagiscono da sole (vedi impostaInEvidenza/tagliaMarker), per qualunque tipo di marker.
      if (markerInEvidenza !== f.id) {
        if (markerInEvidenza !== null) impostaInEvidenza(markerInEvidenza, false);
        markerInEvidenza = f.id;
        impostaInEvidenza(f.id, true);
      }

      if (gruppo.length > 1) {
        spegniEvidenziaRamo();
        popupCluster.setLngLat(f.geometry.coordinates)
          .setHTML(`<strong>${gruppo.length} enti in questo edificio</strong><br>${gruppo.map((e) => e.nome).join("<br>")}`)
          .addTo(map);
        return;
      }

      popupCluster.remove();
      const enteId = gruppo[0].id;
      if (sediConRamo && sediConRamo.has(enteId)) {
        // Marker collegato dal percorso in corso: stesso effetto dell'hover sul suo ramo.
        const indice = destinazioniPerIndice.findIndex((d) => d.sedeId === enteId);
        if (ramoInEvidenza !== indice) { spegniEvidenziaRamo(); evidenziaRamo(indice); }
      }
    });

    // ---------- ventaglio: clic su un bisogno nella tendina sinistra
    const bottoniBisogno = document.querySelectorAll(".bisogno-btn");

    function selezionaBisogno(id) {
      deselezionaServizio(); // un bisogno diverso rende non più valido il percorso in corso
      bisognoSelezionato = bisognoSelezionato === id ? null : id;
      aggiornaAttenuazione();
      bottoniBisogno.forEach((btn) => btn.classList.toggle("attivo", btn.dataset.id === bisognoSelezionato));
    }

    bottoniBisogno.forEach((btn) => btn.addEventListener("click", () => selezionaBisogno(btn.dataset.id)));

    // ---------- tendina destra: bisogni a tendina sopra i servizi dell'ente
    function nomePromotore(p) {
      if (!p) return null;
      return enteById[p] ? enteById[p].nome : p;
    }

    // Raggruppa i servizi di un ente per bisogno: prima i bisogni della cartella (nell'ordine della
    // tendina sinistra), poi gli altri bisogni a cui l'ente risponde, nell'ordine del CANE. Un
    // servizio con più bisogni compare in più gruppi (vedi anche selezionaServizio/deselezionaServizio,
    // che selezionano tutte le occorrenze insieme).
    function bisogniEnte(id) {
      const lista = serviziPerSede[id] || [];
      const presenti = new Set();
      for (const s of lista) for (const b of s.bisogni) presenti.add(b);
      const ordineId = [
        ...BISOGNI_CARTELLA.filter((b) => presenti.has(b)),
        ...bisogni.filter((b) => presenti.has(b.id) && !BISOGNI_CARTELLA.includes(b.id)).map((b) => b.id),
      ];
      return ordineId.map((bid) => ({
        bisogno: bisognoById[bid],
        servizi: lista.filter((s) => s.bisogni.includes(bid)),
      }));
    }

    function mostraEnte(id) {
      deselezionaServizio(); // si cambia ente: il percorso precedente non ha più senso
      const e = enteById[id];
      const gruppi = bisogniEnte(id);

      // Caso B: se in tendina sinistra c'è un bisogno selezionato e l'ente vi risponde, va per primo,
      // già aperto, con lo stesso trattamento grafico che ha a sinistra (.attivo).
      if (bisognoSelezionato) {
        const indice = gruppi.findIndex((g) => g.bisogno.id === bisognoSelezionato);
        if (indice > 0) gruppi.unshift(gruppi.splice(indice, 1)[0]);
      }

      const blocchi = gruppi.map((g) => {
        const evidenziato = g.bisogno.id === bisognoSelezionato;
        const righe = g.servizi.map((s) => {
          const bis = s.bisogni.map((b) => (bisognoById[b] ? bisognoById[b].nome : b)).join(", ");
          const extra = [
            s.risposta === "O" ? "orienta" : "risponde",
            s.a_domicilio ? "a domicilio" : null,
            s.ente !== id ? "di " + (enteById[s.ente] ? enteById[s.ente].nome : s.ente) : null,
            s.promotore ? "promosso da " + nomePromotore(s.promotore) : null,
          ].filter(Boolean).join(" · ");
          return `<li>
            <button type="button" class="servizio-btn" data-id="${s.id}">
              <b>${s.titolo || "Servizio"}</b><br><span class="meta">${extra}</span><br><span class="bis">${bis}</span>
            </button>
          </li>`;
        }).join("");
        return `
          <div class="bisogno-gruppo${evidenziato ? " attivo" : ""}" data-bisogno="${g.bisogno.id}">
            <button type="button" class="bisogno-intestazione" aria-expanded="${evidenziato}">
              <span class="bisogno-intestazione__nome">${g.bisogno.nome}</span>
              <span class="bisogno-intestazione__conta">(${g.servizi.length})</span>
              <span class="bisogno-intestazione__freccia">▾</span>
            </button>
            <div class="bisogno-corpo${evidenziato ? " aperto" : ""}">
              <ul class="servizi">${righe}</ul>
            </div>
          </div>`;
      }).join("");

      panelDxContent.innerHTML = `
        <p class="eyebrow">${e.categoria || ""}</p>
        <h2>${e.nome}</h2>
        <p class="meta">${e.indirizzo || ""}</p>
        ${blocchi || '<p class="nota">Nessun servizio registrato per questo ente.</p>'}`;
      appEl.classList.remove("dx-closed");

      // Intestazioni indipendenti: aprirne una non chiude le altre.
      panelDxContent.querySelectorAll(".bisogno-intestazione").forEach((btn) => {
        btn.addEventListener("click", () => {
          const corpo = btn.nextElementSibling;
          const apri = !corpo.classList.contains("aperto");
          corpo.classList.toggle("aperto", apri);
          btn.setAttribute("aria-expanded", String(apri));
        });
      });

      // Servizi cliccabili: un solo selezionato alla volta. Il clic sul già selezionato lo deseleziona.
      panelDxContent.querySelectorAll(".servizio-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const servizio = servizioById[btn.dataset.id];
          if (servizioSelezionatoId === servizio.id) deselezionaServizio();
          else selezionaServizio(servizio);
        });
      });
    }

    panelDxClose.addEventListener("click", () => {
      deselezionaServizio();
      appEl.classList.add("dx-closed");
      if (scelto !== null) {
        map.setFeatureState({ source: "enti", id: scelto }, { scelto: false, coloreScelto: null });
        if (gruppiArray[scelto].length === 1) {
          featureById[scelto].properties.etichettaGrande = false;
          map.getSource("enti").setData(geojson);
        }
        scelto = null;
      }
    });

    // Il domicilio resta sempre sopra a tutti gli altri marker e rami, qualunque cosa venga
    // aggiunta sopra di lui nel frattempo (es. l'icona, caricata in modo asincrono).
    ["domicilio-ombra", "domicilio-cerchio", "domicilio-icona"].forEach((id) => {
      if (map.getLayer(id)) map.moveLayer(id);
    });
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
    inputIndirizzo.value = trovato.place_name; // l'indirizzo normalizzato restituito dalla API
    aggiornaDomicilio(lon, lat);
    statoDomicilio.textContent = "Domicilio aggiornato.";
  });
};
