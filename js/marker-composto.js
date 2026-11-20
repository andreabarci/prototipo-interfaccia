// Marker composto: l'anello di tacche attorno al marker, una tacca per servizio dell'ente.
// Modulo separato, pensato per essere caricato più avanti dalle pagine (come js/condiviso.js,
// prima dello script della pagina). Per ora lo usa solo marker-composto.html, con le regole dello
// strumento del case manager.
//
// Come si aggancia ai marker: i marker sono disegnati dentro la mappa (livelli di Mapbox). Il
// marker con l'anello è fatto di due immagini posate sullo stesso centro, sollevato di
// ANELLO_ALTEZZA px sopra il luogo: l'anello con la stanghetta (grandezza fissa in pixel, a ogni
// zoom) e, sopra, la testa del marker (che cresce con lo zoom, come oggi). La stanghetta parte dal
// bordo esterno dell'anello e arriva al luogo, così non attraversa l'anello.
//
// Valori provvisori: li decide Andrea (il pannello di prova serve a tararli a vista).

const ANELLO = {
  raggio: 20, // px, raggio interno dell'anello (attorno alla testa tonda del marker)
  spessoreAcceso: 4, // px, tacche dei servizi per il bisogno selezionato
  spessoreSpento: 2, // px, tacche degli altri servizi dell'ente
  spazio: 2.5, // px fra una tacca e l'altra, misurati lungo l'anello (regolabile dal pannello)
  soglia: 8, // oltre questo numero di servizi l'anello è intero, con il numero accanto
  coloreSpento: "#8C8378", // grigio caldo della palette della mappa (le sue etichette)
  evidenzaColore: "#5C554D", // archetto esterno della tacca evidenziata: scuro caldo della palette
  evidenzaSpessore: 1.5, // px
  evidenzaDistanza: 1.5, // px fra l'anello e l'archetto
  stanghetta: { lunghezza: 12, spessore: 1.5, colore: "#5C554D" }, // come l'ago delle puntine
  numeroColore: "#5C554D",
  numeroCarattere: "600 9px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
};
// Bordo esterno dell'anello (la tacca più spessa) e altezza del centro sopra il luogo.
const anelloBordoEsterno = () => ANELLO.raggio + ANELLO.spessoreAcceso;
const ANELLO_ALTEZZA = () => anelloBordoEsterno() + ANELLO.stanghetta.lunghezza;

// Le tacche, in ordine da ore 12 in senso orario: prima le accese (i servizi del gruppo del bisogno
// selezionato, nel loro ordine), poi le spente, raggruppate per bisogno nell'ordine della tendina
// destra. gruppi: [{ bisogno: id, servizi: [...] }] nell'ordine della tendina, già con il bisogno
// selezionato in cima. Un servizio presente in più gruppi conta una volta sola, al primo posto.
function tacchePerAnello(gruppi, bisognoSelezionato) {
  const visti = new Set();
  const tacche = [];
  const aggiungi = (s, accesa) => { if (!visti.has(s.id)) { visti.add(s.id); tacche.push({ servizio: s, accesa }); } };
  for (const g of gruppi) if (g.bisogno === bisognoSelezionato) g.servizi.forEach((s) => aggiungi(s, true));
  for (const g of gruppi) if (g.bisogno !== bisognoSelezionato) g.servizi.forEach((s) => aggiungi(s, false));
  return tacche;
}

// Nome dell'immagine di un anello: contiene tutto ciò che lo disegna, così la stessa combinazione
// si disegna una volta sola. stati: una lettera per tacca, "a" accesa, "s" spenta. evidenza: indice
// della tacca con l'archetto, o -1.
function nomeAnello({ colore, stati, evidenza = -1 }) {
  return ["anello", colore, stati, evidenza, ANELLO.spazio, ANELLO.soglia].join("|");
}

// Disegna l'anello con la stanghetta (se non c'è già) e lo aggiunge alle immagini della mappa.
// L'immagine ha il centro dell'anello al centro: il livello la solleva di ANELLO_ALTEZZA().
function assicuraAnello(map, nome) {
  if (map.hasImage(nome)) return;
  const [, colore, stati, evidenzaTesto] = nome.split("|");
  const evidenza = Number(evidenzaTesto);
  const n = stati.length;
  const intero = n === 1 || n > ANELLO.soglia;
  const rEsterno = anelloBordoEsterno();
  const rArchetto = rEsterno + ANELLO.evidenzaDistanza + ANELLO.evidenzaSpessore / 2;
  const h = ANELLO_ALTEZZA();
  const larghezzaNumero = n > ANELLO.soglia ? 16 : 0;
  const PR = 3;
  const mezzaLarghezza = Math.ceil(rArchetto + ANELLO.evidenzaSpessore + larghezzaNumero + 1);
  const mezzaAltezza = Math.ceil(Math.max(h, rArchetto + ANELLO.evidenzaSpessore) + 1);
  const canvas = document.createElement("canvas");
  canvas.width = mezzaLarghezza * 2 * PR;
  canvas.height = mezzaAltezza * 2 * PR;
  const ctx = canvas.getContext("2d");
  ctx.scale(PR, PR);
  const cx = mezzaLarghezza, cy = mezzaAltezza;

  // La stanghetta: dal bordo esterno dell'anello in basso fino al luogo (h sotto il centro).
  ctx.beginPath();
  ctx.moveTo(cx, cy + rEsterno);
  ctx.lineTo(cx, cy + h);
  ctx.lineWidth = ANELLO.stanghetta.spessore;
  ctx.strokeStyle = ANELLO.stanghetta.colore;
  ctx.stroke();

  // Una tacca: arco con il bordo interno sul raggio dell'anello (accese e spente allineate dentro).
  const tacca = (da, a, accesa) => {
    const w = accesa ? ANELLO.spessoreAcceso : ANELLO.spessoreSpento;
    ctx.beginPath();
    ctx.arc(cx, cy, ANELLO.raggio + w / 2, da, a);
    ctx.lineWidth = w;
    ctx.lineCap = "butt";
    ctx.strokeStyle = accesa ? colore : ANELLO.coloreSpento;
    ctx.stroke();
  };
  const archetto = (da, a) => {
    ctx.beginPath();
    ctx.arc(cx, cy, rArchetto, da, a);
    ctx.lineWidth = ANELLO.evidenzaSpessore;
    ctx.strokeStyle = ANELLO.evidenzaColore;
    ctx.stroke();
  };

  if (intero) {
    // Un solo servizio, oppure oltre la soglia: anello intero, acceso se almeno un servizio lo è.
    tacca(0, 2 * Math.PI, stati.includes("a"));
    if (n === 1 && evidenza === 0) archetto(0, 2 * Math.PI);
  } else {
    // Una tacca per servizio, da ore 12 in senso orario, con uno spazio fra l'una e l'altra.
    const passo = (2 * Math.PI) / n;
    const rMedio = ANELLO.raggio + ANELLO.spessoreAcceso / 2;
    const vuoto = Math.min(ANELLO.spazio / rMedio, passo * 0.8);
    for (let i = 0; i < n; i++) {
      const da = -Math.PI / 2 + i * passo + vuoto / 2;
      const a = da + passo - vuoto;
      tacca(da, a, stati[i] === "a");
      if (i === evidenza) archetto(da, a);
    }
  }
  if (n > ANELLO.soglia) {
    ctx.font = ANELLO.numeroCarattere;
    ctx.fillStyle = ANELLO.numeroColore;
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), cx + rArchetto + ANELLO.evidenzaSpessore + 1, cy);
  }
  map.addImage(nome, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: PR });
}

// Livelli: l'anello (con la stanghetta) e la testa del marker, sollevati entrambi di ANELLO_ALTEZZA
// sopra il luogo. Si leggono dalle proprietà "anello" e "testa" (nomi delle immagini) delle
// feature. testaDimensione: l'espressione icon-size della testa (cresce con lo zoom).
function aggiungiLivelliAnello(map, sorgente, { testaDimensione, beforeId }) {
  const su = ["literal", [0, -ANELLO_ALTEZZA()]];
  map.addLayer({
    id: "anelli", type: "symbol", source: sorgente,
    filter: ["==", ["typeof", ["get", "anello"]], "string"],
    layout: { "icon-image": ["get", "anello"], "icon-size": 1, "icon-allow-overlap": true, "icon-ignore-placement": true },
    paint: { "icon-translate": su },
  }, beforeId);
  map.addLayer({
    id: "teste", type: "symbol", source: sorgente,
    filter: ["==", ["typeof", ["get", "testa"]], "string"],
    layout: { "icon-image": ["get", "testa"], "icon-size": testaDimensione, "icon-allow-overlap": true, "icon-ignore-placement": true },
    paint: { "icon-translate": su },
  }, beforeId);
}
