"""
Crea lo stile della mappa del caregiver (vedi brief-mappa-caregiver-claude-code-1.md).

Scarica lo stile classico Outdoors di Mapbox (outdoors-v12) con la Styles API, applica la palette
«Carta e salvia» e le regole del brief, e salva il risultato in data/stile-caregiver.json, letto
da js/caregiver.js (voce mapStyleCaregiver in js/config.js).

Uso, dalla cartella del progetto:
    python3 strumenti/crea_stile_caregiver.py

Per cambiare un colore: modificalo in PALETTE qui sotto e rilancia lo script; poi ricarica la
pagina su Go Live. Il file generato non va modificato a mano: verrebbe sovrascritto.

Il token si legge da js/config.js e serve solo a scaricare lo stile: non viene mai stampato né
scritto nel file generato (sorgenti, sprite e glifi restano con gli indirizzi mapbox://).
"""
import copy
import json
import re
import sys
import urllib.request
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
USCITA = RADICE / "data" / "stile-caregiver.json"
STILE_DI_PARTENZA = "mapbox/outdoors-v12"

# ---------------------------------------------------------------------------------------------
# Palette A · Carta e salvia. Criteri per un colore in più: verdi verso il giallo e poco saturi
# (lontani dal verde acqua del macrodominio sociale dei marker, #2b8a7f), acqua lontana dal blu
# del sanitario (#2f6f9f), nessun colore della base più saturo dei marker.
PALETTE = {
    "fondo": "#F6F1E7",              # terra
    "verde": "#DCE5C8",              # parchi, prati, boschi, verde urbano
    "acqua": "#CFE0E3",              # superfici e corsi d'acqua
    "edifici": "#ECE4D6",
    "vie_locali": "#FFFDF8",         # vie residenziali e locali
    "arterie": "#EDE5D7",            # arterie, statali, tangenziali
    "percorsi_pedonali": "#D2BF9C",  # sentieri, aree pedonali, percorsi nei parchi
    "ferrovia": "#D9CFBD",           # discreta: appena più scura dei bordi delle strade
    "etichette": "#8C8378",
    "contorno_etichette": "#F6F1E7",  # il colore del fondo
    "etichette_quartieri": "#C1BAAF",  # a metà tra le etichette e il fondo: un'etichetta di sfondo
    # Colori in più, non nella tabella del brief, ricavati dai suoi criteri (provvisori):
    "altre_aree": "#F1EBDF",         # scuole, ospedali, industrie, cimiteri: appena diverse dal fondo
    "bordo_strade": "#E3D9C6",       # bordo delle strade, appena più scuro del fondo
    "bordo_edifici": "#E3D9C8",      # bordo degli edifici, appena più scuro del riempimento
    "ombra_rilievo": "#8A6A4A",      # marrone chiaro, caldo: non grigio
}
OPACITA_OMBRA_RILIEVO = 0.07  # quasi niente: deve leggersi appena il Monte Stella
# Spessore della linea della ferrovia (px) per livello di zoom: sottile, un elemento secondario.
SPESSORE_FERROVIA = {12: 0.6, 16: 1, 20: 1.6}

# Carattere delle etichette: umanistico, tra quelli dei glifi di Mapbox (provvisorio).
# Alternative disponibili: Source Sans Pro, Lato, PT Sans (verificate sui glifi di Mapbox).
CARATTERE = {
    "regolare": "Open Sans Regular",
    "medio": "Open Sans Semibold",
    "grassetto": "Open Sans Bold",
    "corsivo": "Open Sans Italic",
}
CARATTERE_RISERVA = "Arial Unicode MS Regular"  # per i caratteri che Open Sans non ha

# Etichette: dimensioni e zoom. Riferimenti per gli zoom, con la mappa centrale della pagina (circa
# 780 px di larghezza): il cerchio dei 30 minuti sta tutto nello schermo da circa 12,8, quello dei
# 15 minuti da circa 13,8; la vista iniziale della pagina, che lo contiene già tutto, è circa 12,9.
ETICHETTE = {
    # Nomi delle vie solo da vicino.
    "vie_zoom_da": 15,
    # Nomi di città e paesi: spariscono quando si arriva al quartiere.
    "citta_zoom_fino_a": 13,
    # Nomi dei quartieri: un'etichetta di sfondo, solo agli zoom del quartiere. Compaiono e si
    # spengono con una dissolvenza (lunga "quartieri_dissolvenza" livelli di zoom): pienamente
    # visibili da "quartieri_zoom_da", spenti del tutto a "quartieri_zoom_a" (dove arrivano i nomi
    # delle vie). Colore in PALETTE["etichette_quartieri"].
    "quartieri_zoom_da": 12.75,
    "quartieri_zoom_a": 15,
    "quartieri_dissolvenza": 0.5,
    "quartieri_dimensione": 10,      # px
    "quartieri_spaziatura": 0.3,     # spazio fra le lettere, in em
    # Luoghi di contesto (punti di interesse tenuti, stazioni e fermate della metropolitana):
    # compaiono già quando si vede tutto il cerchio dei 15 minuti, vista iniziale compresa.
    "luoghi_zoom_da": 12.5,
    "luoghi_dimensione": 11,         # px
}

# Punti di interesse tenuti (campo "class" dei dati Mapbox, controllato sulla zona del domicilio):
# luoghi di culto e servizi pubblici (uffici postali, centri civici, commissariati...). In più
# i mercati (type "Marketplace") e i nomi di parchi e giardini (class "park_like"). Tutto il resto
# (negozi, ristoranti, bar, banche, carburante...) è spento.
POI_CLASSI_TENUTE = ["religion", "public_facilities"]
POI_PARCHI_MAKI = ["park", "garden"]

# ---------------------------------------------------------------------------------------------


def leggi_token():
    testo = (RADICE / "js" / "config.js").read_text(encoding="utf-8")
    m = re.search(r'mapboxToken:\s*"([^"]+)"', testo)
    if not m:
        sys.exit("Token non trovato in js/config.js")
    return m.group(1)


def scarica_stile(token):
    url = f"https://api.mapbox.com/styles/v1/{STILE_DI_PARTENZA}?access_token={token}"
    try:
        with urllib.request.urlopen(url, timeout=30) as risposta:
            return json.loads(risposta.read().decode("utf-8"))
    except Exception as e:  # il messaggio di errore non contiene l'indirizzo (e quindi il token)
        sys.exit(f"Stile non scaricato: {type(e).__name__}")


def pila(peso):
    return [CARATTERE[peso], CARATTERE_RISERVA]


def sostituisci(valore, funzione):
    """Applica funzione a ogni elemento di un valore di stile (liste annidate comprese)."""
    valore = funzione(valore)
    if isinstance(valore, list):
        return [sostituisci(v, funzione) for v in valore]
    return valore


def carattere_equivalente(v):
    # Outdoors usa DIN Pro: ogni peso diventa il peso corrispondente del carattere scelto.
    if isinstance(v, list) and v and all(isinstance(x, str) for x in v) and any(x.startswith("DIN Pro") for x in v):
        nome = next(x for x in v if x.startswith("DIN Pro"))
        if "Italic" in nome:
            return pila("corsivo")
        if "Bold" in nome:
            return pila("grassetto")
        if "Medium" in nome:
            return pila("medio")
        return pila("regolare")
    return v


def nome_italiano(v):
    return ["get", "name_it"] if v == ["get", "name_en"] else v


def main():
    token = leggi_token()
    originale = scarica_stile(token)
    stile = {
        "version": originale["version"],
        "name": "Caregiver · Carta e salvia",
        "metadata": {
            "generato-da": "strumenti/crea_stile_caregiver.py",
            "stile-di-partenza": STILE_DI_PARTENZA,
            "nota": "File generato: non modificarlo a mano, cambia la palette nello script e rilancialo.",
        },
        "sprite": originale["sprite"],
        "glyphs": originale["glyphs"],
        "sources": originale["sources"],
        "projection": originale.get("projection", {"name": "mercator"}),
        "fog": originale.get("fog"),
        "layers": copy.deepcopy(originale["layers"]),
    }
    if stile["fog"] is None:
        del stile["fog"]
    livelli = {l["id"]: l for l in stile["layers"]}
    P = PALETTE

    def livello(id_):
        if id_ not in livelli:
            sys.exit(f"Livello {id_} non trovato: lo stile di partenza è cambiato, controlla lo script.")
        return livelli[id_]

    def spegni(*ids):
        for i in ids:
            livello(i).setdefault("layout", {})
            livello(i)["layout"]["visibility"] = "none"

    def colora(colore, *ids):
        chiave = {"line": "line-color", "fill": "fill-color", "circle": "circle-color", "background": "background-color"}
        for i in ids:
            l = livello(i)
            l.setdefault("paint", {})[chiave[l["type"]]] = colore

    def dipingi(id_, **proprieta):
        l = livello(id_)
        l.setdefault("paint", {})
        for k, v in proprieta.items():
            l["paint"][k.replace("_", "-")] = v

    def disponi(id_, **proprieta):
        l = livello(id_)
        if l.get("layout") is None:
            l["layout"] = {}
        for k, v in proprieta.items():
            l["layout"][k.replace("_", "-")] = v

    def rgba(esadecimale, opacita):
        r, g, b = (int(esadecimale[i:i + 2], 16) for i in (1, 3, 5))
        return f"rgba({r}, {g}, {b}, {opacita})"

    # ---- Etichette, regola generale: colore e contorno dalla palette, carattere umanistico, nomi
    # in italiano quando Mapbox li ha (altrimenti il nome locale, che a Milano è già italiano).
    for l in stile["layers"]:
        if l["type"] != "symbol":
            continue
        layout = l.get("layout") or {}
        if "text-font" in layout:
            layout["text-font"] = sostituisci(layout["text-font"], carattere_equivalente)
        if "text-field" in layout:
            layout["text-field"] = sostituisci(layout["text-field"], nome_italiano)
            l.setdefault("paint", {})
            l["paint"]["text-color"] = P["etichette"]
            l["paint"]["text-halo-color"] = P["contorno_etichette"]
            l["paint"]["text-halo-width"] = 1.2
            l["paint"]["text-halo-blur"] = 0.5

    # ---- Terra e acqua
    colora(P["fondo"], "land")
    colora(P["verde"], "landcover", "national-park", "national-park_tint-band", "wetland")
    # Tutto il verde allo stesso colore; le altre aree d'uso del suolo vicine al fondo.
    dipingi("landuse", fill_color=["match", ["get", "class"],
                                   ["park", "grass", "wood", "scrub", "agriculture", "pitch"], P["verde"],
                                   "glacier", P["acqua"],
                                   P["altre_aree"]])
    colora(P["acqua"], "water", "water-shadow", "waterway", "waterway-shadow")
    colora(P["altre_aree"], "land-structure-polygon", "land-structure-line", "aeroway-polygon", "aeroway-line")
    spegni("pitch-outline", "water-depth", "wetland-pattern")

    # ---- Rilievo: niente curve di livello; ombreggiatura calda e appena percettibile, che
    # svanisce avvicinandosi (come nell'originale); niente luci.
    spegni("contour-line", "contour-label")
    dipingi("hillshade", fill_color=["interpolate", ["linear"], ["zoom"],
                                     14, ["match", ["get", "class"], "shadow",
                                          rgba(P["ombra_rilievo"], OPACITA_OMBRA_RILIEVO), rgba(P["fondo"], 0)],
                                     16, rgba(P["ombra_rilievo"], 0)])

    # ---- Edifici: piatti, riempimento della palette, bordo appena più scuro.
    dipingi("building", fill_color=P["edifici"], fill_outline_color=P["bordo_edifici"])
    spegni("building-underground")

    # ---- Rete stradale: gerarchia rovesciata verso la scala del pedone.
    locali = ["road-minor", "road-minor-link", "road-street", "road-street-low", "road-polygon", "turning-feature",
              "turning-feature-outline",
              "tunnel-minor", "tunnel-minor-link", "tunnel-street", "tunnel-street-low",
              "bridge-minor", "bridge-minor-link", "bridge-street", "bridge-street-low"]
    arterie = ["road-primary", "road-major-link", "road-motorway-trunk", "road-construction",
               "tunnel-primary", "tunnel-major-link", "tunnel-motorway-trunk", "tunnel-construction",
               "bridge-primary", "bridge-major-link", "bridge-motorway-trunk", "bridge-construction",
               "bridge-major-link-2", "bridge-motorway-trunk-2"]
    # Lo stesso livello raccoglie secondarie e terziarie: le terziarie (a Milano quasi sempre vie di
    # quartiere) restano chiare come le locali, le secondarie (i viali) vanno con le arterie.
    secondarie_terziarie = ["road-secondary-tertiary", "tunnel-secondary-tertiary", "bridge-secondary-tertiary"]
    bordi = [l["id"] for l in stile["layers"] if l["id"].endswith("-case") and l.get("source-layer") == "road"
             and "pedestrian" not in l["id"]]
    colora(P["vie_locali"], *locali)
    dipingi("turning-feature-outline", circle_stroke_color=P["bordo_strade"])
    colora(P["arterie"], *arterie)
    for i in secondarie_terziarie:
        dipingi(i, line_color=["match", ["get", "class"], "tertiary", P["vie_locali"], P["arterie"]])
    colora(P["bordo_strade"], *bordi)
    spegni("road-number-shield", "road-exit-shield", "road-intersection",
           "road-oneway-arrow-blue", "road-oneway-arrow-white",
           "tunnel-oneway-arrow-blue", "tunnel-oneway-arrow-white",
           "bridge-oneway-arrow-blue", "bridge-oneway-arrow-white")
    livello("road-label")["minzoom"] = ETICHETTE["vie_zoom_da"]
    livello("path-pedestrian-label")["minzoom"] = ETICHETTE["vie_zoom_da"]

    # ---- Percorsi a piedi: tratto sottile e tratteggiato; le aree pedonali come superfici.
    percorsi = [f"{p}-{t}" for p in ("road", "bridge", "tunnel")
                for t in ("path", "path-trail", "path-cycleway-piste", "steps", "pedestrian")]
    for i in percorsi:
        dipingi(i, line_color=P["percorsi_pedonali"],
                line_width=["interpolate", ["linear"], ["zoom"], 13, 0.6, 16, 1, 18, 1.8],
                line_dasharray=[3, 2])
    spegni("road-path-bg", "road-steps-bg", "bridge-path-bg", "bridge-steps-bg",
           "road-pedestrian-case", "bridge-pedestrian-case", "road-pedestrian-polygon-pattern",
           "golf-hole-line", "golf-hole-label")
    dipingi("road-pedestrian-polygon-fill", fill_color=P["vie_locali"], fill_outline_color=P["percorsi_pedonali"])

    # ---- Ferrovia discreta, al livello degli altri elementi secondari; fermate: solo stazioni e metro.
    spessore = ["interpolate", ["linear"], ["zoom"]] + [v for z in sorted(SPESSORE_FERROVIA) for v in (z, SPESSORE_FERROVIA[z])]
    for i in ("road-rail", "bridge-rail"):
        dipingi(i, line_color=P["ferrovia"], line_width=spessore)
    for i in ("road-rail-tracks", "bridge-rail-tracks"):
        dipingi(i, line_color=P["ferrovia"])
    livello("transit-label")["filter"] = ["all", ["match", ["get", "mode"], ["rail", "metro_rail"], True, False],
                                          ["!=", ["get", "stop_type"], "entrance"]]
    livello("transit-label")["minzoom"] = ETICHETTE["luoghi_zoom_da"]
    disponi("transit-label", text_field=["coalesce", ["get", "name_it"], ["get", "name"]],
            text_anchor="center", text_offset=[0, 0], text_size=ETICHETTE["luoghi_dimensione"])
    livello("transit-label")["layout"].pop("icon-image", None)  # solo il nome, senza l'icona colorata

    # ---- Punti di interesse: solo i luoghi di contesto, solo testo, piccolo; parchi in corsivo.
    # Compaiono già quando si vede tutto il cerchio dei 15 minuti: niente più soglia di zoom per
    # importanza (il filterrank dell'originale), restano solo le categorie tenute.
    poi = livello("poi-label")
    poi["minzoom"] = ETICHETTE["luoghi_zoom_da"]
    poi["filter"] = ["any",
                     ["match", ["get", "class"], POI_CLASSI_TENUTE, True, False],
                     ["==", ["get", "type"], "Marketplace"],
                     ["all", ["==", ["get", "class"], "park_like"],
                      ["match", ["get", "maki"], POI_PARCHI_MAKI, True, False]]]
    for k in ("icon-image",):
        poi["layout"].pop(k, None)
    poi["paint"].pop("icon-opacity", None)
    disponi("poi-label", text_anchor="center", text_offset=[0, 0], text_size=ETICHETTE["luoghi_dimensione"],
            text_font=["match", ["get", "class"], "park_like", ["literal", pila("corsivo")], ["literal", pila("regolare")]])

    # ---- Nomi dei luoghi: città e paesi solo da lontano; regioni e stati no.
    for i in ("settlement-minor-label", "settlement-major-label"):
        livello(i)["maxzoom"] = ETICHETTE["citta_zoom_fino_a"]
    spegni("state-label", "country-label", "continent-label")

    # ---- Quartieri: un'etichetta di sfondo, piccola, rada, chiara, solo agli zoom del quartiere,
    # con una dissolvenza all'ingresso e all'uscita.
    E = ETICHETTE
    da, a, d = E["quartieri_zoom_da"], E["quartieri_zoom_a"], E["quartieri_dissolvenza"]
    quartieri = livello("settlement-subdivision-label")
    quartieri["minzoom"] = da - d
    quartieri["maxzoom"] = a
    disponi("settlement-subdivision-label", text_size=E["quartieri_dimensione"],
            text_letter_spacing=E["quartieri_spaziatura"], text_transform="uppercase", text_font=pila("regolare"))
    dipingi("settlement-subdivision-label", text_color=P["etichette_quartieri"],
            text_halo_color=P["contorno_etichette"],
            text_opacity=["interpolate", ["linear"], ["zoom"], da - d, 0, da, 1, a - d, 1, a, 0])
    # Precedenza nelle collisioni: Mapbox piazza prima le etichette dei livelli più in alto. I
    # quartieri scendono sotto tutte le altre etichette (vie, parchi, stazioni, luoghi di culto,
    # servizi pubblici), così compaiono solo dove resta spazio; restano sopra strade e confini, che
    # altrimenti coprirebbero il testo.
    stile["layers"].remove(quartieri)
    ultimo_non_etichetta = max(i for i, l in enumerate(stile["layers"]) if l["type"] != "symbol")
    stile["layers"].insert(ultimo_non_etichetta + 1, quartieri)

    # ---- Controllo finale e salvataggio: il token non deve finire nel file.
    testo = json.dumps(stile, ensure_ascii=False, indent=1)
    if token in testo:
        sys.exit("Il token è finito nello stile: file NON scritto.")
    USCITA.write_text(testo + "\n", encoding="utf-8")
    print(f"Scritto {USCITA.relative_to(RADICE)}: {len(stile['layers'])} livelli, "
          f"{sum(1 for l in stile['layers'] if (l.get('layout') or {}).get('visibility') == 'none')} spenti.")


if __name__ == "__main__":
    main()
