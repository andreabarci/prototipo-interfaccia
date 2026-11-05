#!/usr/bin/env python3
"""Calcola i tempi a piedi dal domicilio dello scenario A a ogni ente sulla mappa, con la Mapbox
Matrix API, e li salva come valori di riserva in data/tempi_domicilio_iniziale.json.

Il prototipo li usa quando la API non risponde per il domicilio iniziale (vedi js/app.js).

Uso:
    python3 strumenti/calcola_tempi.py

Legge il token da js/config.js (non lo stampa mai). Rilancialo se cambi:
- il domicilio iniziale dello scenario (DOMICILIO qui sotto deve combaciare con quello in js/app.js);
- il repertorio enti (dopo aver rilanciato strumenti/converti_dati.py).
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
DOMICILIO = (9.1385, 45.4809)  # (lon, lat) — deve combaciare con DOMICILIO in js/app.js
GRUPPO = 24  # enti per richiesta: +1 (il domicilio) = 25, il massimo della Matrix API


def leggi_token():
    testo = (RADICE / "js" / "config.js").read_text(encoding="utf-8")
    m = re.search(r'mapboxToken:\s*"([^"]+)"', testo)
    if not m:
        sys.exit("Token non trovato in js/config.js")
    return m.group(1)


def interroga(token, gruppo):
    coord = [DOMICILIO] + [(e["lon"], e["lat"]) for e in gruppo]
    coord_str = ";".join(f"{lon},{lat}" for lon, lat in coord)
    url = (
        f"https://api.mapbox.com/directions-matrix/v1/mapbox/walking/{coord_str}"
        f"?sources=0&annotations=duration,distance&access_token={token}"
    )
    with urllib.request.urlopen(url, timeout=20) as risposta:
        return json.loads(risposta.read().decode("utf-8"))


def main():
    token = leggi_token()
    enti = json.loads((RADICE / "data" / "enti.json").read_text(encoding="utf-8"))
    sulla_mappa = [e for e in enti if e.get("lat") is not None]
    print(f"{len(sulla_mappa)} enti sulla mappa da processare")

    risultati = {}
    for i in range(0, len(sulla_mappa), GRUPPO):
        gruppo = sulla_mappa[i:i + GRUPPO]
        try:
            dati = interroga(token, gruppo)
        except urllib.error.URLError as e:
            sys.exit(f"Errore di rete al gruppo {i // GRUPPO + 1}: {e}")
        if dati.get("code") != "Ok":
            sys.exit(f"Risposta non Ok al gruppo {i // GRUPPO + 1}: {dati.get('code')} {dati.get('message', '')}")
        durate = dati["durations"][0]
        distanze = dati["distances"][0]
        for idx, e in enumerate(gruppo, start=1):
            durata = durate[idx]
            distanza = distanze[idx]
            if durata is None:
                continue  # irraggiungibile a piedi secondo il routing
            risultati[e["id"]] = {"minuti": round(durata / 60), "metri": round(distanza)}
        print(f"  gruppo {i // GRUPPO + 1}: {len(gruppo)} enti interrogati")
        time.sleep(0.2)

    mancanti = len(sulla_mappa) - len(risultati)
    if mancanti:
        print(f"Attenzione: {mancanti} enti senza percorso a piedi (irraggiungibili per il routing)")

    out = RADICE / "data" / "tempi_domicilio_iniziale.json"
    out.write_text(json.dumps(risultati, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Scritto {out} con {len(risultati)} enti")


if __name__ == "__main__":
    main()
