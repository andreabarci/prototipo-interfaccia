// Prototipo · scenario A, Momento 1 ("La cartella della persona").
// Mostra il domicilio e tutti gli enti come punti; al clic la tendina destra
// elenca i servizi che si trovano presso quell'ente.
// Grafica provvisoria: colori, forme e testi verranno progettati dopo.

// La mappa parte solo dopo la password (vedi js/gate.js).
// COLORI, COLORE_CLUSTER, ICONA_PER_CATEGORIA, caricaImmagine, RAMO_CURVATURA/RAMO_CAMPIONI/
// campionaCurva e DOMICILIO_INIZIALE sono in js/condiviso.js, comune con la pagina del caregiver.

// Opacità dei marker non pertinenti al bisogno scelto (attenuati, non spariscono). Riusata anche nel
// percorso per i marker che non ricevono un ramo di equivalenza.
const OPACITA_ATTENUATA = 0.1;

// ---------- Marker del case manager: regolazioni a mano.
// Tutti i marker non selezionati sono puntini della stessa taglia, in ogni fase e a ogni zoom; solo
// il marker cliccato («aperto») cresce: un cerchio pieno con l'icona, centrato sul luogo come i
// puntini, con attorno l'anello a tacche (una per servizio dell'ente) aderente al suo bordo.
const PUNTINO_RAGGIO = 8; // px, ogni marker non selezionato (anche i gruppi nello stesso edificio); era 6
const PUNTINO_NUMERO_DIMENSIONE = 11; // px, il numero dei servizi per il bisogno (ventaglio, da 2 in su); era 8
const NUMERO_ZOOM_MINIMO = 12; // sotto questo zoom il numero dentro il puntino si nasconde
// Il marker aperto: misure del caregiver (cresce con lo zoom, fra le fermate 10 e 14).
const TESTA_RAGGIO = { 10: 8.75 * 0.84, 14: 17.5 * 0.84 };
const TESTA_BORDO = 3 * 0.84; // bordo bianco
const TESTA_SCALA_ICONA = 0.55;
// L'anello: aderente al marker aperto, ricalcolato a ogni zoom con la stessa curva del marker.
const ANELLO_SCARTO = 2; // px fra il bordo del marker aperto e il bordo interno delle tacche
const TACCA_ACCESA = 3; // px, servizi per il bisogno selezionato (colore della categoria)
const TACCA_SPENTA = 1.5; // px, altri servizi dell'ente
const TACCA_EVIDENZIATA = 5; // px, verso l'esterno: il servizio in hover o scelto nella tendina
const TACCHE_ALTRE_OPACITA = 0.35; // le altre tacche, mentre una è evidenziata
const ANELLO_COLORE_SPENTO = "#8C8378"; // tacche spente: grigio caldo della palette della mappa
const ANELLO_SPAZIO_TACCHE = 2.5; // px fra una tacca e l'altra (2–3)
const ANELLO_SOGLIA_INTERO = 8; // oltre questo numero di servizi l'anello è intero
const ANELLO_ALONE = 1.5; // px, alone color carta attorno alle tacche, per staccarle dai puntini vicini
const ANELLO_ALONE_COLORE = "#F6F1E7"; // il fondo della mappa

// ---------- Interfaccia del case manager (cartella, scheda, legenda): regolazioni a mano. Valori
// presi da bozza-case-manager-riferimento.html; gli stili sono nella sezione «Case manager» di
// css/style.css, che legge questi numeri come variabili (vedi startApp).
// Colori dei domini: COLORI in js/condiviso.js (sanitario #173C59, sociosanitario #196EB6, sociale
// #E94B1E), comuni alle due pagine. I bisogni non hanno colore: etichette e selettore in grigio neutro.
const UI_RAGGIO_VOLANTE = 6; // px, contenitori volanti sulla mappa (cartella, scheda)
const UI_RAGGIO_INTERNO = 2; // px, tutto ciò che sta dentro un contenitore
const UI_TINTA_HOVER = 9; // %, fondo in hover: colore del dominio dell'ente aperto mescolato al bianco
const UI_TINTA_BORDO = 40; // %, bordo in hover
const UI_TINTA_RIQUADRO = 7; // %, riquadri (pillola del tempo, «Relazioni sulla mappa»)
const UI_PROPORZIONE_FOTO = "4 / 3"; // foto dell'ente: larga quanto la scheda meno i margini
// Foto degli enti (cartella foto/), per id ente; gli altri hanno il segnaposto «Foto dell'ente».
const FOTO_ENTI = {
  E273: "foto/biblioteca-villapizzone.jpeg", // Biblioteca comunale Villapizzone
  E203: "foto/cdi-beauvoir.jpg", // CDI Simone de' Beauvoir (ritagliata in 4:3 e ridotta a 800×600)
  E250: "foto/biblioteca-gallaratese.jpg", // Biblioteca comunale Gallaratese (ritagliata in 4:3)
  E259: "foto/biblioteca-dergano-bovisa.jpg", // Biblioteca comunale Dergano-Bovisa (ritagliata in 4:3)
  E357: "foto/gdc-stella.jpg", // Gruppo di cammino ATS — Parco Montestella (ritagliata in 4:3, 800×600)
};
const UI_OPACITA_ALTRI_SERVIZI = 0.55; // servizi che non rispondono al bisogno selezionato
// Scala di cartella, scheda e legenda rispetto alla bozza, con tutte le proporzioni (0.85 = −15%).
// Non tocca la mappa, i marker, i rami, i fumetti né le pillole dei minuti.
const UI_SCALA = 0.85;
// La persona e il domicilio dello scenario: inventati (vedi CLAUDE.md), qui come segnaposto.
const CARTELLA_PERSONA = "Maria R., 82 anni";
const CARTELLA_DOMICILIO = "[via e civico], Milano";
// Le relazioni nella scheda del servizio, in quest'ordine, con il campione della linea del ramo.
const RELAZIONI_SCHEDA = [
  { tipo: "successione", nome: "Successione", frecciaFine: true },
  { tipo: "equivalenza", nome: "Equivalenza", frecciaFine: true, frecciaInizio: true },
  { tipo: "adiacenza", nome: "Anche per chi assiste", tratteggio: true },
];

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
// RAMO_CURVATURA e RAMO_CAMPIONI sono in js/condiviso.js (li usa campionaCurva, anch'essa condivisa).
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

// La linea dei minuti a piedi e la sua pillola (LINEA_MINUTI, aggiungiLineeMinuti, arcoMinuti,
// posizioniPilloleMinuti, creaPillolaMinuti, testoMinuti) sono in js/condiviso.js, comuni con il caregiver.

// I quattro tipi di legame fra servizi (vedi CLAUDE.md): non c'è un campo nei dati che li identifica
// già, sono id scelti qui. Equivalenza è l'unico con una regola di calcolo decisa (vedi trovaLegami);
// gli altri tre restano senza legami finché Andrea non la stabilisce — non è un errore del selettore.
const TIPI_LEGAME = [
  { id: "equivalenza", etichetta: "Equivalenza" },
  { id: "adiacenza", etichetta: "Anche per chi assiste" },
  { id: "successione", etichetta: "Successione" },
  { id: "incompatibilita", etichetta: "Incompatibilità" },
];

// Bisogni della cartella di questa persona (scenario A, vedi CLAUDE.md):
// B16 Compagnia e relazioni sociali (persona), C02 sofferenza psicologica (caregiver).
const BISOGNI_CARTELLA = ["B16", "C02"];

// Domicilio inventato, tra Boldinasco e Villapizzone — Municipio 8 di Milano (DOMICILIO_INIZIALE,
// in js/condiviso.js, condiviso con la pagina del caregiver). Non corrisponde a un indirizzo reale:
// vedi la regola sui dati in CLAUDE.md. Qui può spostarsi scrivendo un indirizzo nella tendina sinistra.
let DOMICILIO = { ...DOMICILIO_INIZIALE };

window.startApp = async function () {
  aggiungiTastoSegreto("caregiver"); // in basso a sinistra, invisibile: porta al caregiver
  // Costanti della tendina a bisogni passate al CSS, così restano tutte in cima a questo file.
  document.documentElement.style.setProperty("--tendina-durata", TENDINA_DURATA_MS + "ms");
  document.documentElement.style.setProperty("--tendina-rientro", TENDINA_RIENTRO);
  document.documentElement.style.setProperty("--tendina-colore-attiva", TENDINA_COLORE_INTESTAZIONE_ATTIVA);
  document.documentElement.style.setProperty("--tempo-dissolvenza", TEMPO_LINEA_DISSOLVENZA_MS + "ms");
  document.documentElement.style.setProperty("--ramo-colore-riposo", RAMO_COLORE_RIPOSO);
  const radice = document.documentElement.style;
  radice.setProperty("--cm-raggio-volante", UI_RAGGIO_VOLANTE + "px");
  radice.setProperty("--cm-raggio", UI_RAGGIO_INTERNO + "px");
  radice.setProperty("--cm-tinta-hover", UI_TINTA_HOVER + "%");
  radice.setProperty("--cm-tinta-bordo", UI_TINTA_BORDO + "%");
  radice.setProperty("--cm-tinta-riquadro", UI_TINTA_RIQUADRO + "%");
  radice.setProperty("--cm-proporzione-foto", UI_PROPORZIONE_FOTO);
  radice.setProperty("--cm-opacita-altri", String(UI_OPACITA_ALTRI_SERVIZI));
  radice.setProperty("--cm-scala", String(UI_SCALA));

  const mapEl = document.getElementById("map");
  const appEl = document.getElementById("app");
  const cartellaEl = document.getElementById("cartella");
  const schedaEl = document.getElementById("scheda");
  const panelDxContent = document.getElementById("scheda-ente"); // la scheda dell'ente
  const schedaServizioEl = document.getElementById("scheda-servizio");

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

  // ---------- legenda, in basso a sinistra
  const iconaCasa = (colore, lato) => `<svg width="${lato}" height="${lato}" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 4 L21 11 V20 H14 V14 H10 V20 H3 Z" fill="${colore}"></path></svg>`;
  document.getElementById("legenda").innerHTML = `
    <div class="cm-legenda__riga">
      <span class="cm-legenda__voce"><span class="cm-legenda__punto" style="background:${COLORI.sanitario}"></span>Sanitario</span>
      <span class="cm-legenda__voce"><span class="cm-legenda__punto" style="background:${COLORI.sociosanitario}"></span>Sociosanitario</span>
      <span class="cm-legenda__voce"><span class="cm-legenda__punto" style="background:${COLORI.sociale}"></span>Sociale</span>
    </div>
    <div class="cm-legenda__riga cm-legenda__riga--seconda">
      <span class="cm-legenda__voce"><span class="cm-legenda__numero">2</span>Servizi nello stesso ente</span>
      <span class="cm-legenda__voce"><span class="cm-legenda__casa">${iconaCasa("#FFFFFF", 8)}</span>Domicilio</span>
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
    attributionControl: false, logoPosition: "bottom-right",
  });
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
  // Niente pulsanti dello zoom né indicatore del livello (si zooma con la rotella o il trackpad).
  // Il logo e le note di Mapbox non si possono togliere (condizioni d'uso di Mapbox, licenza di
  // OpenStreetMap): stanno in basso a destra, le note compatte dietro la «i», così l'angolo in
  // basso a sinistra resta alla legenda.

  // Dati del marker del domicilio: un solo punto, fisso.
  function datiDomicilio() {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [DOMICILIO.lon, DOMICILIO.lat] }, properties: {} }],
    };
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

    // richiediTempiAPiedi (js/condiviso.js) fa le richieste a gruppi di 24 alla Matrix API.
    const risultati = await richiediTempiAPiedi(
      [lon, lat], sulla_mappa.map((e) => [e.lon, e.lat]), CONFIG.mapboxToken
    );
    if (idRichiesta !== richiestaTempiCorrente) return; // il domicilio è cambiato di nuovo nel frattempo
    sulla_mappa.forEach((e, idx) => {
      const r = risultati[idx];
      tempiPerEnte[e.id] = (r.stato === "errore" && origineIniziale && tempiRiserva[e.id])
        ? { stato: "ok", ...tempiRiserva[e.id] }
        : r;
    });
  }
  calcolaTempi(DOMICILIO.lat, DOMICILIO.lon, true);

  let scelto = null; // id numerico della feature "enti" attualmente selezionata (ente o cluster aperto)
  let enteApertoId = null; // l'ente nella tendina destra (dentro un gruppo, quello scelto)
  let servizioInHover = null; // il servizio sotto il mouse nella tendina destra
  const immaginiIcone = {}; // icone di categoria caricate, per disegnare la testa del marker scelto

  map.on("load", async () => {
    map.addSource("enti", { type: "geojson", data: geojson });
    map.addSource("rami", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
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

    // Taglia: ogni marker non selezionato è un puntino di PUNTINO_RAGGIO, in ogni fase, a ogni zoom e
    // anche in hover (nessuna crescita: la crescita indica solo la selezione). Il marker scelto non
    // ha puntino: al suo posto la testa con l'anello (livelli "anelli" e "teste", più sotto).
    const raggio = ["case", ["boolean", ["feature-state", "scelto"], false], 0, PUNTINO_RAGGIO];
    // Distanza fissa fra il bordo del puntino e l'etichetta col nome (vedi ETICHETTA_MARGINE).
    const distanzaEtichetta = (PUNTINO_RAGGIO + ETICHETTA_MARGINE) / ETICHETTA_DIMENSIONE;
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
      // Nessuna ombra sui puntini (come nel caregiver): il livello resta solo come riferimento
      // d'ordine per i rami, che vanno sotto di lui.
      paint: { "circle-radius": 0, "circle-opacity": 0 },
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

    // Linee dei minuti (domicilio → marker): sotto i rami (beforeId "rami-hitbox"), così l'ordine è
    // base cartografica < linee dei minuti < rami < marker. Componente comune (vedi condiviso.js).
    aggiungiLineeMinuti(map, "tempo-linee", "rami-hitbox");

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
        "circle-stroke-width": 0, // puntino pieno, senza bordo (come nel caregiver)
        "circle-opacity": opacitaAttenuabile,
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
        "icon-size": PUNTINO_RAGGIO / 32, // la torta (raggio 32 px a icon-size 1) alla taglia del puntino
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
        "circle-opacity": 0, // il gruppo con un ente scelto mostra la testa con l'anello, non un cerchio
        "circle-stroke-opacity": 0,
      },
    });

    // Numero di enti raggruppati su uno stesso punto, al centro della torta, scritto in bianco.
    map.addLayer({
      id: "enti-numero",
      type: "symbol",
      source: "enti",
      minzoom: NUMERO_ZOOM_MINIMO, // più lontano il numero si nasconde, il puntino resta
      // Ventaglio: dentro il puntino di un ente pertinente, quanti suoi servizi rispondono al bisogno
      // selezionato, se sono 2 o più (vedi aggiornaAttenuazione, che scrive "numero").
      filter: ["==", ["typeof", ["get", "numero"]], "number"],
      layout: {
        "text-field": ["to-string", ["get", "numero"]],
        "text-size": PUNTINO_NUMERO_DIMENSIONE,
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], // in grassetto, per leggerlo su un puntino piccolo
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "symbol-z-order": "source",
      },
      paint: {
        "text-color": "#ffffff",
        "text-opacity": ["case", ["boolean", ["feature-state", "scelto"], false], 0, 1],
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
        immaginiIcone[nome] = immagine; // serve a disegnare la testa del marker scelto
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
          10, (2 * RAGGIO_GRANDE[10] * SCALA_ICONA) / 128,
          14, (2 * RAGGIO_GRANDE[14] * SCALA_ICONA) / 128],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-z-order": "source",
      },
      paint: {
        "icon-opacity": 0, // l'icona del marker scelto è ora nella testa (livello "teste")
      },
    });

    // Etichetta col nome dell'ente: senza contenitore, colorata come il marker, bordo bianco per
    // restare leggibile. Visibile al hover di un marker singolo, da fermo se è "scelto", oppure se è
    // il marker collegato da un ramo in evidenza (vedi evidenziaRamo più sotto). Mai per i cluster a
    // riposo: "nome" resta null finché non si sceglie un ente specifico (vedi geojson e selezionaMarker).

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
        "circle-stroke-width": 0,
        "circle-opacity": ["case", ["boolean", ["feature-state", "capoRamo"], false], 1, 0],
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
          10, (2 * RAGGIO_GRANDE[10] * SCALA_ICONA) / 128,
          14, (2 * RAGGIO_GRANDE[14] * SCALA_ICONA) / 128],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": 0, // il capo scelto è la testa con l'anello, disegnata sopra
      },
    });

    // E per la stessa ragione l'etichetta col nome (qui sempre visibile, essendo un capo del ramo:
    // l'origine è "scelta", il marker collegato è "in evidenza" per via di evidenziaRamo).

    // Il marker aperto (cliccato): un'unica immagine con cerchio, icona, anello e alone, centrata sul
    // luogo, a grandezza reale (ridisegnata quando lo zoom cambia, vedi aggiornaAnello).
    map.addSource("marker-aperto", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "marker-aperto", type: "symbol", source: "marker-aperto",
      layout: { "icon-image": ["get", "immagine"], "icon-size": 1, "icon-allow-overlap": true, "icon-ignore-placement": true },
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

    // ---------- marker aperto: cerchio con l'icona e anello a tacche aderente
    // Raggi a uno zoom: il marker (bordo bianco compreso) e il bordo interno delle tacche.
    const raggioApertoPx = (z) => raggioAZoom(TESTA_RAGGIO, z) + TESTA_BORDO;
    const raggioAnelloPx = (z) => raggioApertoPx(z) + ANELLO_SCARTO;

    // Disegna l'immagine del marker aperto. Il nome contiene tutto ciò che la disegna: colore, icona,
    // tacche ("a" accesa, "s" spenta), indice della tacca evidenziata (-1 nessuna), raggio in px.
    function assicuraMarkerAperto(nome) {
      if (map.hasImage(nome)) return;
      const [, colore, icona, stati, evidenzaTesto, raggioTesto] = nome.split("|");
      const evidenza = Number(evidenzaTesto);
      const rAnello = Number(raggioTesto);
      const rTesta = rAnello - ANELLO_SCARTO - TESTA_BORDO; // il cerchio colorato
      const n = stati.length;
      const PR = 3;
      const mezzo = Math.ceil(rAnello + TACCA_EVIDENZIATA + ANELLO_ALONE + 1);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = mezzo * 2 * PR;
      const ctx = canvas.getContext("2d");
      ctx.scale(PR, PR);
      const c = mezzo;
      // Il marker: bordo bianco, cerchio nel colore della categoria, icona.
      ctx.beginPath(); ctx.arc(c, c, rTesta + TESTA_BORDO, 0, 2 * Math.PI); ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.beginPath(); ctx.arc(c, c, rTesta, 0, 2 * Math.PI); ctx.fillStyle = colore; ctx.fill();
      const img = immaginiIcone[icona];
      if (img) { const d = 2 * rTesta * TESTA_SCALA_ICONA; ctx.drawImage(img, c - d / 2, c - d / 2, d, d); }
      if (!n) return map.addImage(nome, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: PR });
      // Una tacca: arco con il bordo interno sul raggio dell'anello (gli spessori crescono verso
      // l'esterno), con attorno l'alone color carta.
      const tacca = (da, a, spessore, colorTacca, opacita) => {
        const r = rAnello + spessore / 2;
        ctx.lineCap = "butt";
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(c, c, r, da, a);
        ctx.lineWidth = spessore + 2 * ANELLO_ALONE; ctx.strokeStyle = ANELLO_ALONE_COLORE; ctx.stroke();
        ctx.globalAlpha = opacita;
        ctx.beginPath(); ctx.arc(c, c, r, da, a);
        ctx.lineWidth = spessore; ctx.strokeStyle = colorTacca; ctx.stroke();
        ctx.globalAlpha = 1;
      };
      const aspetto = (i) => {
        if (evidenza >= 0) {
          if (i === evidenza) return [TACCA_EVIDENZIATA, colore, 1];
          return stati[i] === "a" ? [TACCA_ACCESA, colore, TACCHE_ALTRE_OPACITA] : [TACCA_SPENTA, ANELLO_COLORE_SPENTO, TACCHE_ALTRE_OPACITA];
        }
        return stati[i] === "a" ? [TACCA_ACCESA, colore, 1] : [TACCA_SPENTA, ANELLO_COLORE_SPENTO, 1];
      };
      if (n === 1 || n > ANELLO_SOGLIA_INTERO) {
        // Un solo servizio, oppure troppi: anello intero, acceso se almeno un servizio lo è
        // (evidenziato, se il servizio evidenziato è l'unico).
        const [w, col, op] = n === 1 ? aspetto(0) : (stati.includes("a") ? [TACCA_ACCESA, colore, 1] : [TACCA_SPENTA, ANELLO_COLORE_SPENTO, 1]);
        tacca(0, 2 * Math.PI, w, col, op);
      } else {
        // Da ore 12 in senso orario, con uno spazio fra una tacca e l'altra.
        const passo = (2 * Math.PI) / n;
        const vuoto = Math.min(ANELLO_SPAZIO_TACCHE / rAnello, passo * 0.8);
        // Prima gli aloni di tutte le tacche, poi le tacche: un alone non copre la tacca vicina.
        for (const fase of ["alone", "tacca"]) {
          for (let i = 0; i < n; i++) {
            const da = -Math.PI / 2 + i * passo + vuoto / 2, a = da + passo - vuoto;
            const [w, col, op] = aspetto(i);
            const r = rAnello + w / 2;
            ctx.lineCap = "butt";
            ctx.beginPath(); ctx.arc(c, c, r, da, a);
            if (fase === "alone") { ctx.globalAlpha = 1; ctx.lineWidth = w + 2 * ANELLO_ALONE; ctx.strokeStyle = ANELLO_ALONE_COLORE; }
            else { ctx.globalAlpha = op; ctx.lineWidth = w; ctx.strokeStyle = col; }
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      map.addImage(nome, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: PR });
    }

    // Il marker aperto nello stato corrente. Tacche: prima le accese (servizi per il bisogno
    // selezionato), poi le spente per bisogno, come la lista della tendina. Evidenziata: il servizio
    // in hover nella tendina, altrimenti quello scelto.
    function aggiornaAnello() {
      const features = [];
      if (scelto !== null && enteApertoId) {
        const e = enteById[enteApertoId];
        const tacche = ordineServiziEnte(e.id);
        const iScelto = servizioSelezionatoId ? tacche.findIndex((t) => t.servizio.id === servizioSelezionatoId) : -1;
        const iHover = servizioInHover ? tacche.findIndex((t) => t.servizio.id === servizioInHover) : -1;
        const stati = tacche.map((t) => (t.accesa ? "a" : "s")).join("");
        const raggio = Math.round(raggioAnelloPx(map.getZoom()) * 2) / 2; // al mezzo pixel: poche immagini
        const nome = ["aperto", COLORI[e.macro_dominio] || COLORE_CLUSTER, ICONA_PER_CATEGORIA[e.categoria_origine] || "",
          stati, iHover >= 0 ? iHover : iScelto, raggio].join("|");
        assicuraMarkerAperto(nome);
        const coord = featureById[scelto].geometry.coordinates;
        features.push({ type: "Feature", geometry: { type: "Point", coordinates: coord }, properties: { immagine: nome } });
      }
      map.getSource("marker-aperto").setData({ type: "FeatureCollection", features });
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
      // Numero dentro il puntino (con un bisogno selezionato): quanti servizi dell'ente rispondono a
      // quel bisogno, se sono 2 o più; solo sugli enti singoli accesi (non sui gruppi nello stesso
      // edificio, che contano enti diversi, né sugli attenuati).
      gruppiArray.forEach((gruppo, i) => {
        let numero = null;
        if (bisognoSelezionato && gruppo.length === 1 && !map.getFeatureState({ source: "enti", id: i }).attenuato) {
          const n = (serviziPerSede[gruppo[0].id] || []).filter((sv) => sv.bisogni.includes(bisognoSelezionato)).length;
          if (n >= 2) numero = n;
        }
        featureById[i].properties.numero = numero;
      });
      map.getSource("enti").setData(geojson);
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

    // ---------- percorso: linee dei minuti (domicilio → marker), in hover su un ramo
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

    // Le due pillole, una per linea (componente comune, vedi creaPillolaMinuti in condiviso.js), nella
    // forma sintetica del case manager: solo «11 min», senza omino né «a» (strumento per professionisti).
    const etichettaTempoOrigine = creaPillolaMinuti(map, { sintetica: true });
    const etichettaTempoDestinazione = creaPillolaMinuti(map, { sintetica: true });

    // Testo di una pillola, dallo stato del calcolo dei tempi (vedi calcolaTempi).
    function testoPillola(enteId) {
      const t = tempiPerEnte[enteId];
      return testoMinuti(t && t.stato === "ok" ? t.minuti : null, { inCalcolo: !t || t.stato === "calcolo", sintetica: true });
    }

    function mostraEtichetteTempo(posizioni, testi) {
      if (posizioni[0]) etichettaTempoOrigine.mostra(posizioni[0], testi[0]);
      else etichettaTempoOrigine.nascondi();
      etichettaTempoDestinazione.mostra(posizioni[1], testi[1]);
    }

    function nascondiEtichetteTempo() {
      etichettaTempoOrigine.nascondi();
      etichettaTempoDestinazione.nascondi();
    }

    // Fumetti «servizio presso ente»: componente comune (vedi creaFumetto in js/condiviso.js), lo
    // stesso del caregiver. Tre usi:
    // - fumettoScelto: il servizio scelto in tendina destra, fisso finché resta selezionato;
    // - fumettoCollegato: il servizio all'altro capo del ramo in evidenza (hover sul ramo o sul marker);
    // - fumettoHover: in hover su un marker pertinente al bisogno scelto, con il servizio pertinente.
    const fumettoScelto = creaFumetto(map);
    const fumettoCollegato = creaFumetto(map);
    const fumettoHover = creaFumetto(map);
    // Il marker (piatto, per ora) visto dal fumetto: centro sul luogo, raggio in px bordo compreso.
    // Il marker scelto è la testa dentro l'anello, sollevata sopra il luogo; gli altri sono puntini.
    function testaMarker(grande) {
      return grande ? { altezza: 0, raggio: raggioAnelloPx(map.getZoom()) + TACCA_EVIDENZIATA + ANELLO_ALONE } : { altezza: 0, raggio: PUNTINO_RAGGIO };
    }
    // Le linee da non coprire: rami e linee dei minuti a schermo.
    const lineeAttorno = () => [...ramiCorrenti.features, ...lineeTempoCorrenti.features].map((f) => f.geometry.coordinates);

    // Fumetto in hover su un marker: sempre, con il solo nome dell'ente (nel colore del suo
    // macrodominio), con o senza bisogno attivo; stesso componente del fumetto «servizio presso ente».
    // Su un gruppo di enti nello stesso edificio, i loro nomi. Non sul marker aperto con un servizio
    // scelto, che ha già il suo fumetto.
    let fumettoHoverId = null;
    const nomeEnteHtml = (e) => `<span style="color:${COLORI[e.macro_dominio] || COLORE_CLUSTER}">${e.nome}</span>`;
    function mostraFumettoHover(featureId) {
      if (fumettoHoverId === featureId) return;
      nascondiFumettoHover();
      if (featureId === scelto && servizioSelezionatoId) return;
      const gruppo = gruppiArray[featureId];
      const html = gruppo.length === 1 ? nomeEnteHtml(gruppo[0])
        : `<strong>${gruppo.length} enti in questo edificio</strong><br>` + gruppo.map(nomeEnteHtml).join("<br>");
      fumettoHoverId = featureId;
      fumettoHover.mostra(featureById[featureId].geometry.coordinates, html, testaMarker(featureId === scelto), lineeAttorno());
    }
    function nascondiFumettoHover() {
      if (fumettoHoverId === null) return;
      fumettoHoverId = null;
      fumettoHover.nascondi();
    }

    // fumettoServizio è in js/condiviso.js, comune con la pagina del caregiver.

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
      fumettoHover.nascondi();

      // Linee dei minuti: dal domicilio al servizio di partenza e dal domicilio all'altro capo del
      // ramo, il «triangolo». Archi del componente comune (vedi arcoMinuti in condiviso.js), con una
      // pillola ciascuno («…» se il calcolo è ancora in corso, «—» se non è arrivato).
      const coordDomicilio = [DOMICILIO.lon, DOMICILIO.lat];
      const archi = [];
      let testoOrigine = null;
      if (scelto !== null && gruppiArray[scelto]) {
        const coordOrigine = [gruppiArray[scelto][0].lon, gruppiArray[scelto][0].lat];
        archi.push(arcoMinuti(map, coordDomicilio, coordOrigine));
        const servizioOrigine = servizioSelezionatoId ? servizioById[servizioSelezionatoId] : null;
        if (servizioOrigine) testoOrigine = testoPillola(servizioOrigine.sede);
      }
      archi.push(arcoMinuti(map, coordDomicilio, dest.coord));
      const testoDestinazione = testoPillola(dest.sedeId);

      mostraLineeTempo(archi.map((punti) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: punti } })));
      const pos = posizioniPilloleMinuti(map, archi);
      const posizioni = archi.length === 2 ? pos : [null, pos[0]];
      mostraEtichetteTempo(posizioni, [testoOrigine, testoDestinazione]);
      fumettoCollegato.mostra(dest.coord, htmlFumetto, testaMarker(false, true), lineeAttorno());
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
      fumettoCollegato.nascondi();
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

    // ---------- selettore del tipo di legame: ora è il riquadro «Relazioni sulla mappa» nella scheda
    // del servizio (vedi disegnaSchedaServizio). Queste funzioni lo tengono aggiornato.
    function mostraSelettoreLegame() {}
    function nascondiSelettoreLegame() {
      tipoLegameAttivo = "equivalenza"; // il tipo torna all'equivalenza quando si lascia il servizio
    }
    function aggiornaMessaggioVuoto() {}
    function aggiornaListaLegami() {
      if (servizioSelezionatoId !== null && !schedaServizioEl.hidden) disegnaSchedaServizio();
    }
    function selezionaTipoLegame(tipo) {
      if (tipo === tipoLegameAttivo) return;
      tipoLegameAttivo = tipo;
      ricostruisciRami();
    }

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
      nascondiFumettoHover();
      servizioSelezionatoId = servizio.id;
      ricostruisciRami();

      const origine = gruppiArray[featureIdPerEnte[servizio.sede]];
      if (origine) {
        // L'etichetta col nome dell'ente si spegne: la stessa informazione entra nel fumetto, sotto
        // al servizio (vedi testo-opacity di enti-etichetta/enti-capo-ramo-etichetta più sotto).
        if (scelto !== null) map.setFeatureState({ source: "enti", id: scelto }, { nascondiEtichetta: true });
        const enteOrigine = enteById[servizio.sede];
        const coordOrigine = [origine[0].lon, origine[0].lat];
        fumettoScelto.mostra(coordOrigine, fumettoServizio(servizio, enteOrigine), testaMarker(true, false), lineeAttorno());
      }
      mostraSelettoreLegame();

      // La scheda del servizio si sovrappone a quella dell'ente, nello stesso pannello.
      servizioInHover = null;
      disegnaSchedaServizio();
      panelDxContent.hidden = true;
      schedaServizioEl.hidden = false;
      aggiornaAnello(); // la tacca del servizio scelto resta evidenziata, le altre si attenuano
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
      fumettoScelto.nascondi();
      aggiornaAttenuazione();
      // Si torna alla scheda dell'ente, con il marker aperto e l'anello.
      schedaServizioEl.hidden = true;
      panelDxContent.hidden = false;
      if (enteApertoId) disegnaSchedaEnte(enteApertoId);
      aggiornaAnello();
    }

    function selezionaMarker(featureId, ente) {
      nascondiFumettoHover(); // il marker cliccato diventa la testa con l'anello: il fumetto di hover non serve più
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

    map.on("click", LAYER_ENTI, (ev) => {
      const f = ev.features[0];
      const gruppo = gruppiArray[f.id];
      if (gruppo.length === 1) selezionaMarker(f.id, gruppo[0]);
      else apriSceltaEnte(f, gruppo);
    });
    map.on("mouseenter", LAYER_ENTI, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", LAYER_ENTI, () => {
      map.getCanvas().style.cursor = "";
      nascondiFumettoHover();
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
        mostraFumettoHover(f.id);
        return;
      }

      const enteId = gruppo[0].id;
      if (sediConRamo && sediConRamo.has(enteId)) {
        // Marker collegato dal percorso in corso: stesso effetto dell'hover sul suo ramo.
        const indice = destinazioniPerIndice.findIndex((d) => d.sedeId === enteId);
        nascondiFumettoHover();
        if (ramoInEvidenza !== indice) { spegniEvidenziaRamo(); evidenziaRamo(indice); }
      } else {
        mostraFumettoHover(f.id);
      }
    });

    // ---------- cartella volante (in alto a sinistra): persona, domicilio, selettore del bisogno
    // Il selettore apre la lista dei bisogni CANE: prima quelli emersi dalla valutazione (la cartella),
    // poi gli altri. Scegliere un bisogno chiude la lista e aggiorna la mappa (ventaglio); scegliere di
    // nuovo il bisogno attivo lo toglie (si torna alla rete).
    const svgFreccia = (su) => `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="${su ? "M6 15 L12 9 L18 15" : "M6 9 L12 15 L18 9"}" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    const svgSpunta = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 L10 17 L19 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    let listaBisogniAperta = false;
    function disegnaCartella() {
      const voce = (b) => `<button type="button" class="cm-bisogno${b.id === bisognoSelezionato ? " attivo" : ""}" data-bisogno="${b.id}">
          <span>${b.nome}</span>${b.id === bisognoSelezionato ? svgSpunta : ""}</button>`;
      const emersi = BISOGNI_CARTELLA.map((id) => bisognoById[id]).filter(Boolean);
      const altri = bisogni.filter((b) => !BISOGNI_CARTELLA.includes(b.id));
      cartellaEl.innerHTML = `
        <div class="cm-cartella__blocco">
          <div class="cm-etichetta">Cartella</div>
          <div class="cm-cartella__persona">${CARTELLA_PERSONA}</div>
          <div class="cm-cartella__domicilio">${iconaCasa("#57554F", 14)}<span>Domicilio · ${CARTELLA_DOMICILIO}</span></div>
        </div>
        <div class="cm-filetto"></div>
        <div class="cm-cartella__blocco cm-cartella__blocco--bisogno">
          <div class="cm-etichetta">Bisogno</div>
          <button type="button" class="cm-selettore" data-azione="lista-bisogni" aria-expanded="${listaBisogniAperta}">
            <span>${bisognoSelezionato ? bisognoById[bisognoSelezionato].nome : "Scegli un bisogno"}</span>${svgFreccia(listaBisogniAperta)}
          </button>
          ${listaBisogniAperta ? `<div class="cm-bisogni">
            <div class="cm-bisogni__titolo">Emersi dalla valutazione</div>
            ${emersi.map(voce).join("")}
            <div class="cm-bisogni__titolo cm-bisogni__titolo--altri">Altri bisogni CANE</div>
            ${altri.map(voce).join("")}
          </div>` : ""}
        </div>`;
    }
    cartellaEl.addEventListener("click", (ev) => {
      if (ev.target.closest('[data-azione="lista-bisogni"]')) { listaBisogniAperta = !listaBisogniAperta; disegnaCartella(); return; }
      const b = ev.target.closest("[data-bisogno]");
      if (b) { listaBisogniAperta = false; selezionaBisogno(b.dataset.bisogno); }
    });

    function selezionaBisogno(id) {
      nascondiFumettoHover();
      deselezionaServizio(); // un bisogno diverso rende non più valido il percorso in corso
      bisognoSelezionato = bisognoSelezionato === id ? null : id;
      aggiornaAttenuazione();
      disegnaCartella();
      if (enteApertoId) disegnaSchedaEnte(enteApertoId); // ordine e gruppi seguono il bisogno
      aggiornaAnello(); // le tacche accese seguono il bisogno selezionato
    }
    disegnaCartella();

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

    // ---------- scheda volante a destra: dell'ente (clic su un marker) e del servizio (clic su un
    // servizio della scheda, si sovrappone a quella dell'ente nello stesso pannello). Gli stati di
    // interazione sono nel colore del dominio dell'ente aperto (variabile CSS --dominio).
    // L'ordine dei servizi: lo stesso delle tacche dell'anello, prima quelli per il bisogno
    // selezionato, poi gli altri per bisogno, ciascuno una volta sola.
    function ordineServiziEnte(id) {
      const gruppi = bisogniEnte(id);
      if (bisognoSelezionato) {
        const k = gruppi.findIndex((g) => g.bisogno.id === bisognoSelezionato);
        if (k > 0) gruppi.unshift(gruppi.splice(k, 1)[0]);
      }
      return tacchePerAnello(gruppi.map((g) => ({ bisogno: g.bisogno.id, servizi: g.servizi })), bisognoSelezionato);
    }
    const capitalizza = (t) => (t ? t[0].toUpperCase() + t.slice(1) : "");
    const nomeBisogno = (b) => (bisognoById[b] ? bisognoById[b].nome : b);
    const svgChiudi = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="#57554F" stroke-width="2" stroke-linecap="round"></path></svg>';
    const svgChevron = '<svg class="cm-servizio__freccia" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6 L15 12 L9 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    const svgPedone = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2" fill="currentColor"></circle><path d="M9 21 L11 14 L14 16 L14 21 M11 14 L12 8 L16 11 L19 12 M12 8 L8 10 L7 13" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    const svgIndicazioni = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L22 12 L12 22 L2 12 Z" stroke="#57554F" stroke-width="1.8" fill="none" stroke-linejoin="round"></path><path d="M9 14 V11 H15 M13 9 L15 11 L13 13" stroke="#57554F" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    const svgSito = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="#57554F" stroke-width="1.8" fill="none"></circle><path d="M3 12 H21 M12 3 C 8 7, 8 17, 12 21 M12 3 C 16 7, 16 17, 12 21" stroke="#57554F" stroke-width="1.6" fill="none"></path></svg>';
    const svgFoto = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#6B6A65" stroke-width="1.6" fill="none"></rect><circle cx="9" cy="10" r="1.8" fill="#6B6A65"></circle><path d="M4 18 L10 13 L14 16 L17 13 L21 17" stroke="#6B6A65" stroke-width="1.6" fill="none" stroke-linejoin="round"></path></svg>';
    const svgIndietro = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 L9 12 L15 18" stroke="#57554F" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    const svgInvio = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 L20 4 L14 20 L11 13 Z" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linejoin="round"></path></svg>';
    const etichetteHtml = (s, grandi) => `<div class="cm-etichette${grandi ? " cm-etichette--grandi" : ""}">${s.bisogni.map((b) => `<span class="cm-tag">${nomeBisogno(b)}</span>`).join("")}</div>`;
    function testoTempoEnte(id) {
      const t = tempiPerEnte[id];
      const m = !t || t.stato === "calcolo" ? "…" : t.stato === "ok" ? t.minuti : "—"; // «—»: segnaposto
      return `${m} min a piedi dal domicilio`;
    }
    let infoEnteAperte = false;

    function disegnaSchedaEnte(id) {
      const e = enteById[id];
      schedaEl.style.setProperty("--dominio", COLORI[e.macro_dominio] || COLORE_CLUSTER);
      const ordine = ordineServiziEnte(id);
      const card = ({ servizio: s, accesa }) => `
        <button type="button" class="cm-servizio${bisognoSelezionato && !accesa ? " cm-servizio--altro" : ""}" data-id="${s.id}">
          <span class="cm-servizio__testo">
            <span class="cm-servizio__nome">${capitalizza(s.titolo || "Servizio")}</span>
            ${etichetteHtml(s, false)}
          </span>${svgChevron}
        </button>`;
      const pertinenti = ordine.filter((t) => t.accesa);
      const altri = ordine.filter((t) => !t.accesa);
      const gruppi = bisognoSelezionato
        ? `<div class="cm-gruppo-titolo">Per ${nomeBisogno(bisognoSelezionato).toLowerCase()} · ${pertinenti.length}</div>
           <div class="cm-lista">${pertinenti.map(card).join("")}</div>
           <div class="cm-gruppo-titolo cm-gruppo-titolo--altri">Altri servizi · ${altri.length}</div>
           <div class="cm-lista cm-lista--ultima">${altri.map(card).join("")}</div>`
        : `<div class="cm-lista cm-lista--ultima">${ordine.map(card).join("")}</div>`;
      panelDxContent.innerHTML = `
        <div class="cm-scheda__scorri">
          <div class="cm-intestazione">
            <div class="cm-intestazione__blocco">
              <div class="cm-intestazione__riga">
                <div class="cm-sopratitolo">${e.categoria_origine || e.categoria || ""}</div> <!-- la categoria propria dell'ente -->
                <button type="button" class="cm-chiudi" data-azione="chiudi" aria-label="Chiudi la scheda">${svgChiudi}</button>
              </div>
              <h2 class="cm-titolo cm-titolo--ente">${e.nome}</h2>
              <div class="cm-indirizzo">${e.indirizzo || "[Indirizzo dell'ente], Milano"}</div>
            </div>
            <div class="cm-intestazione__azioni">
              <span class="cm-tempo">${svgPedone}${testoTempoEnte(id)}</span>
              <div class="cm-tondi">
                <button type="button" class="cm-tondo" aria-label="Indicazioni">${svgIndicazioni}</button>
                <button type="button" class="cm-tondo" aria-label="Sito dell'ente">${svgSito}</button>
              </div>
            </div>
          </div>
          <div class="cm-foto">${FOTO_ENTI[id] ? `<img class="cm-foto__immagine" src="${FOTO_ENTI[id]}" alt="${e.nome}">` : `${svgFoto}Foto dell'ente`}</div>
          <div class="cm-servizi-titolo"><span>Servizi offerti</span><span class="cm-servizi-titolo__conta">${ordine.length}</span></div>
          ${ordine.length ? gruppi : '<p class="cm-vuoto">Nessun servizio registrato per questo ente.</p>'}
          <div class="cm-info">
            <button type="button" class="cm-info__testata" data-azione="info" aria-expanded="${infoEnteAperte}">
              <span class="cm-info__titoli"><span class="cm-info__titolo">Informazioni sull'ente</span><span class="cm-info__sottotitolo">Orari, contatti, descrizione</span></span>
              <span class="cm-info__freccia">${svgFreccia(infoEnteAperte)}</span>
            </button>
            ${infoEnteAperte ? `<div class="cm-righe cm-righe--info">
              <div class="cm-righe__riga"><span>Orari</span><span>[Giorni e orari di apertura]</span></div>
              <div class="cm-righe__riga"><span>Contatti</span><span>[Telefono · email]</span></div>
              <div class="cm-righe__riga"><span>Descrizione</span><span>[Breve descrizione dell'ente]</span></div>
            </div>` : ""}
          </div>
        </div>`;
    }

    // Scheda del servizio scelto: intestazione, etichette, descrizione, relazioni sulla mappa (il
    // selettore del tipo di legame, con quanti collegati ha ciascuno), righe segnaposto, il pulsante
    // (finto) «Proponi al caregiver».
    function disegnaSchedaServizio() {
      const sv = servizioById[servizioSelezionatoId];
      if (!sv) return;
      const e = enteById[sv.sede];
      const contesto = bisognoSelezionato || sv.bisogni[0];
      const relazioni = RELAZIONI_SCHEDA.map((r) => {
        const n = contesto ? trovaLegami(sv, contesto, r.tipo).size : 0;
        const attiva = r.tipo === tipoLegameAttivo;
        return `<button type="button" class="cm-relazione${attiva ? " attiva" : ""}" data-tipo="${r.tipo}" aria-pressed="${attiva}">
          <svg class="cm-relazione__campione" width="40" height="12" viewBox="0 0 40 12" aria-hidden="true">
            <path d="M3 6 H37" stroke="currentColor" stroke-width="2.2" fill="none"${r.tratteggio ? ' stroke-dasharray="4 3" opacity="0.7"' : ""}></path>
            ${r.frecciaFine ? '<path d="M32 2 L37 6 L32 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>' : ""}
            ${r.frecciaInizio ? '<path d="M8 2 L3 6 L8 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>' : ""}
          </svg>
          <span class="cm-relazione__nome">${r.nome}</span>
          <span class="cm-relazione__conta">${n} ${n === 1 ? "collegato" : "collegati"}</span>
        </button>`;
      }).join("");
      schedaServizioEl.innerHTML = `
        <div class="cm-scheda__scorri">
          <div class="cm-servizio-testata">
            <button type="button" class="cm-indietro" data-azione="indietro">${svgIndietro}${e.nome}</button>
            <button type="button" class="cm-chiudi" data-azione="chiudi" aria-label="Chiudi la scheda">${svgChiudi}</button>
          </div>
          <div class="cm-intestazione cm-intestazione--servizio">
            <div class="cm-intestazione__blocco">
              <div class="cm-sopratitolo">Servizio · ${e.categoria_origine || e.categoria || ""}</div>
              <h2 class="cm-titolo">${capitalizza(sv.titolo || "Servizio")}</h2>
            </div>
            ${etichetteHtml(sv, true)}
            <p class="cm-descrizione">${sv.descrizione || "[Breve descrizione del servizio]"}</p>
          </div>
          <div class="cm-relazioni">
            <div class="cm-gruppo-titolo cm-gruppo-titolo--relazioni">Relazioni sulla mappa</div>
            ${relazioni}
          </div>
          <div class="cm-righe">
            <div class="cm-righe__riga"><span>Orari</span><span>[Giorni e orari del servizio]</span></div>
            <div class="cm-righe__riga"><span>Contatti</span><span>[Referente · telefono · email]</span></div>
            <div class="cm-righe__riga"><span>Accesso</span><span>[Modalità di accesso, costi]</span></div>
          </div>
        </div>
        <div class="cm-piede"><button type="button" class="cm-proponi">${svgInvio}Proponi al caregiver</button></div>`;
    }

    function mostraEnte(id) {
      enteApertoId = id;
      servizioInHover = null;
      infoEnteAperte = false;
      deselezionaServizio(); // si cambia ente: il percorso precedente non ha più senso
      disegnaSchedaEnte(id);
      schedaServizioEl.hidden = true;
      panelDxContent.hidden = false;
      schedaEl.hidden = false;
      appEl.classList.add("scheda-aperta");
      aggiornaAnello(); // il marker cliccato cresce: cerchio con l'icona e anello
    }

    function chiudiScheda() {
      deselezionaServizio();
      schedaEl.hidden = true;
      appEl.classList.remove("scheda-aperta");
      if (scelto !== null) {
        map.setFeatureState({ source: "enti", id: scelto }, { scelto: false, coloreScelto: null });
        if (gruppiArray[scelto].length === 1) {
          featureById[scelto].properties.etichettaGrande = false;
          map.getSource("enti").setData(geojson);
        }
        scelto = null;
      }
      enteApertoId = null;
      servizioInHover = null;
      aggiornaAnello();
    }

    // Un solo gestore per tutto il pannello: chiudi, indietro, informazioni, servizi, relazioni.
    schedaEl.addEventListener("click", (ev) => {
      const azione = ev.target.closest("[data-azione]");
      if (azione) {
        const a = azione.dataset.azione;
        if (a === "chiudi") chiudiScheda();
        else if (a === "indietro") deselezionaServizio(); // i rami spariscono, si torna all'ente
        else if (a === "info") { infoEnteAperte = !infoEnteAperte; disegnaSchedaEnte(enteApertoId); }
        return;
      }
      const tipo = ev.target.closest("[data-tipo]");
      if (tipo) { selezionaTipoLegame(tipo.dataset.tipo); return; }
      const voce = ev.target.closest(".cm-servizio[data-id]");
      if (voce) selezionaServizio(servizioById[voce.dataset.id]);
    });

    // Hover su un servizio della tendina destra: la sua tacca si evidenzia sull'anello del marker.
    panelDxContent.addEventListener("mouseover", (ev) => {
      const btn = ev.target.closest(".cm-servizio[data-id]");
      const id = btn ? btn.dataset.id : null;
      if (id === servizioInHover) return;
      servizioInHover = id;
      aggiornaAnello();
    });
    panelDxContent.addEventListener("mouseleave", () => {
      if (servizioInHover === null) return;
      servizioInHover = null;
      aggiornaAnello();
    });

    // Il domicilio resta sempre sopra a tutti gli altri marker e rami, qualunque cosa venga
    // aggiunta sopra di lui nel frattempo (es. l'icona, caricata in modo asincrono).
    ["domicilio-ombra", "domicilio-cerchio", "domicilio-icona"].forEach((id) => {
      if (map.getLayer(id)) map.moveLayer(id);
    });
    map.moveLayer("marker-aperto"); // il marker aperto sta sopra tutti gli altri
    map.on("zoom", () => { if (enteApertoId) aggiornaAnello(); }); // l'anello segue il marker
  });

  // Il domicilio è fisso (inventato, vedi CLAUDE.md): niente più modulo per spostarlo.
};
