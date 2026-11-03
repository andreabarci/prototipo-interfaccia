"""
Converte il modello dati (file Numbers) nei file JSON letti dalla mappa.

Uso, dalla cartella del progetto:
    pip install numbers-parser
    python3 strumenti/converti_dati.py percorso/modello-dati-vXX.numbers

Scrive in data/:
    bisogni.json  i 26 bisogni CANE
    enti.json     tutti gli enti, con coordinate quando sono geolocalizzati
    servizi.json  un servizio per ogni offerta presso un ente: le offerte di
                  blocco (RSA, CDI, consultori, SSPT...) sono moltiplicate
                  per ogni ente a cui si applicano
"""
import json, sys, re
from pathlib import Path
from numbers_parser import Document

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / "data"
out.mkdir(exist_ok=True)

doc = Document(str(src))
def foglio(nome):
    rows = [s for s in doc.sheets if s.name == nome][0].tables[0].rows(values_only=True)
    head = rows[0]
    return [dict(zip(head, r)) for r in rows[1:] if r[0]]

def pulito(v):
    if v is None: return None
    if isinstance(v, float) and v != v: return None
    s = str(v).strip()
    return None if s in ("", "—", "nan") else s

def num(v):
    try: return float(str(v).replace(",", "."))
    except (TypeError, ValueError): return None

# ---- bisogni
bisogni = []
for r in foglio("Bisogni"):
    nome = re.sub(r"\s*\([^)]*\)\s*$", "", pulito(r["Bisogni CANE"]) or "")
    bisogni.append({"id": r["ID Bisogno"], "nome": nome, "dimensione": pulito(r["dimensione"])})

# ---- enti
enti = []
for r in foglio("Enti"):
    geo = r["stato_geolocalizzazione"] == "geolocalizzato"
    enti.append({
        "id": r["id_ente"], "nome": pulito(r["denominazione"]), "indirizzo": pulito(r["indirizzo"]),
        "lat": num(r["latitudine"]) if geo else None, "lon": num(r["longitudine"]) if geo else None,
        "macro_dominio": pulito(r["macro_dominio"]), "categoria": pulito(r["categoria"]),
        "categoria_origine": pulito(r["categoria_origine"]), "telefono": pulito(r["telefono"]),
        "sito": pulito(r["sito"]),
    })
ids_enti = {e["id"] for e in enti}

# ---- legami offerta -> bisogni
leg = {}
for r in foglio("Offerta x Bisogno"):
    leg.setdefault(r["id_offerta"], []).append(r["id_bisogno"])

# ---- servizi (offerte moltiplicate per ente)
servizi = []
for r in foglio("Offerte"):
    oid = r["id_offerta"]
    if r["livello"] == "blocco":
        presso = [x.strip() for x in (pulito(r["id_ente_applicabili"]) or "").split(",") if x.strip()]
    else:
        presso = [r["id_ente"]] if pulito(r["id_ente"]) else []
    titolo = pulito(r["offerta"])
    descr = pulito(r["descrizione_normalizzata"]) or pulito(r["descrizione_verbatim"])
    luogo = pulito(r["id_luogo"])
    for ente in presso:
        if ente not in ids_enti: continue
        servizi.append({
            "id": oid if len(presso) == 1 else f"{oid}@{ente}",
            "id_offerta": oid,
            "ente": ente,
            # dove si va: il luogo dell'offerta se diverso dall'ente, altrimenti l'ente
            "sede": luogo if luogo in ids_enti else ente,
            "a_domicilio": luogo == "domicilio",
            "titolo": titolo or descr,
            "descrizione": descr if titolo else None,
            "tipo": pulito(r["tipo"]), "risposta": pulito(r["risposta"]),
            "destinatario": pulito(r["destinatario"]), "soglia": pulito(r["soglia_accesso"]),
            "costo": pulito(r["costo"]), "mandato_demenza": pulito(r["mandato_demenza"]),
            "promotore": pulito(r["promotore"]), "fonte": pulito(r["fonte"]),
            "bisogni": sorted(set(leg.get(oid, []))),
        })

def scrivi(nome, dati):
    (out / nome).write_text(json.dumps(dati, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

scrivi("bisogni.json", bisogni); scrivi("enti.json", enti); scrivi("servizi.json", servizi)
geo = sum(1 for e in enti if e["lat"] is not None)
print(f"bisogni {len(bisogni)} · enti {len(enti)} ({geo} sulla mappa) · servizi {len(servizi)}")
