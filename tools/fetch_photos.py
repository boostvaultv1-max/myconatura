#!/usr/bin/env python3
"""
MycoNatura – Fotos von Wikimedia Commons laden (nur freie Lizenzen).

Für jede Art in src/data/mushrooms.json wird auf Wikimedia Commons ein Foto gesucht:
  1. Wenn in tools/photo-overrides.json eine Datei festgelegt ist, wird genau diese verwendet.
  2. Sonst: Dateien aus der Kategorie "Category:<wissenschaftlicher Name>" (bzw. lateinischer Synonyme),
     ersatzweise eine Volltextsuche nach dem wissenschaftlichen Namen.
Nur Lizenzen CC0, Public Domain, CC BY und CC BY-SA werden akzeptiert.
Urheber, Lizenz und Quellseite werden in src/data/photos.json gespeichert und in der App angezeigt.

Aufruf (Python 3.8+, keine Zusatzpakete):
    python3 tools/fetch_photos.py            # nur fehlende Fotos laden
    python3 tools/fetch_photos.py --all      # alle neu laden
    python3 tools/fetch_photos.py --only fichten-steinpilz parasol

Bitte die Ergebnisse ansehen: Automatisch gewählte Fotos können ungeeignet sein
(z. B. Mikroskopbild). Dann in tools/photo-overrides.json eine bessere Datei eintragen
oder ein ungeeignetes Foto ausschließen (dann wird das nächstbeste gewählt):
    { "fichten-steinpilz": "File:Dateiname_auf_Commons.jpg",
      "herbsttrompete": { "exclude": ["File:Ungeeignet.jpg"] } }
"""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "src", "data", "mushrooms.json")
OUT_JSON = os.path.join(ROOT, "src", "data", "photos.json")
OUT_DIR = os.path.join(ROOT, "assets", "photos")
OVERRIDES = os.path.join(ROOT, "tools", "photo-overrides.json")
API = "https://commons.wikimedia.org/w/api.php"
UA = "MycoNatura/1.1 (freies Offline-Pilzlexikon; Foto-Abruf mit Lizenzangaben)"
WIDTH = 1200

ALLOWED = re.compile(r"^(cc0|public domain|pd\b|pd-|cc[ -]by(-sa)?[ -]?\d|cc[ -]by(-sa)?$)", re.I)
BAD_TITLE = re.compile(r"micro|spore|basidi|cystid|drawing|illustration|plate|map|stamp|herbar|briefmarke|\.svg|\.tif|diagram|zeichnung|mikroskop|x400|x1000", re.I)


def _open(url, timeout):
    """HTTP-Abruf mit Wiederholung bei Drosselung (429) oder Serverfehlern."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or attempt == 5:
                raise
            wait = int(e.headers.get("Retry-After") or 0) or min(60, 5 * 2 ** attempt)
            print(f"   … Commons drosselt (HTTP {e.code}), warte {wait} s")
            time.sleep(wait)


def get_json(params):
    params = {**params, "format": "json", "formatversion": "2"}
    return json.loads(_open(API + "?" + urllib.parse.urlencode(params), 30))


def download(url, path):
    data = _open(url, 60)
    if len(data) < 5000:
        raise ValueError("Bild zu klein / fehlerhaft")
    with open(path, "wb") as f:
        f.write(data)


def clean(text):
    """HTML aus Commons-Metadaten entfernen."""
    text = re.sub(r"<[^>]+>", "", text or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


IIPROP = {"prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": str(WIDTH)}


def candidates_from_pages(pages):
    out = []
    for p in pages or []:
        ii = (p.get("imageinfo") or [None])[0]
        if not ii:
            continue
        meta = ii.get("extmetadata") or {}
        lic = clean(meta.get("LicenseShortName", {}).get("value", ""))
        out.append({
            "title": p.get("title", ""),
            "mime": ii.get("mime", ""),
            "width": ii.get("width", 0),
            "height": ii.get("height", 0),
            "thumb": ii.get("thumburl") or ii.get("url"),
            "page": ii.get("descriptionurl", ""),
            "license": lic,
            "licenseUrl": clean(meta.get("LicenseUrl", {}).get("value", "")),
            "author": clean(meta.get("Artist", {}).get("value", "")) or clean(meta.get("Credit", {}).get("value", "")) or "Unbekannt",
        })
    return out


def acceptable(c):
    return (
        c["mime"] in ("image/jpeg", "image/png")
        and c["width"] >= 800 and c["height"] >= 500
        and ALLOWED.search(c["license"] or "")
        and not BAD_TITLE.search(c["title"])
        and c["thumb"]
    )


def score(c):
    # Querformat und hohe Auflösung bevorzugen
    s = min(c["width"], 4000) / 1000
    if c["width"] >= c["height"]:
        s += 1.5
    return s


def find_photo(m, override):
    exclude = set()
    if isinstance(override, dict):
        exclude = set(override.get("exclude", []))
        override = override.get("file")
    ok = lambda c: acceptable(c) and c["title"] not in exclude
    if override:
        data = get_json({"action": "query", "titles": override, **IIPROP})
        cands = [c for c in candidates_from_pages(data.get("query", {}).get("pages")) if ALLOWED.search(c["license"] or "")]
        return cands[0] if cands else None
    names = [m["scientific"]] + [s for s in m.get("synonyms", []) if re.fullmatch(r"[A-Z][a-z]+ [a-z-]+", s)]
    for name in names:
        data = get_json({"action": "query", "generator": "categorymembers", "gcmtitle": "Category:" + name,
                         "gcmtype": "file", "gcmlimit": "50", **IIPROP})
        cands = [c for c in candidates_from_pages(data.get("query", {}).get("pages")) if ok(c)]
        if cands:
            return max(cands, key=score)
        time.sleep(0.5)
    data = get_json({"action": "query", "generator": "search", "gsrsearch": f'"{m["scientific"]}" filetype:bitmap',
                     "gsrnamespace": "6", "gsrlimit": "30", **IIPROP})
    cands = [c for c in candidates_from_pages(data.get("query", {}).get("pages")) if ok(c)]
    return max(cands, key=score) if cands else None


def main(argv):
    with open(DATA, encoding="utf-8") as f:
        species = json.load(f)["mushrooms"]
    overrides = {}
    if os.path.exists(OVERRIDES):
        with open(OVERRIDES, encoding="utf-8") as f:
            overrides = {k: v for k, v in json.load(f).items() if not k.startswith("_")}
    existing = {"photos": {}}
    if os.path.exists(OUT_JSON):
        with open(OUT_JSON, encoding="utf-8") as f:
            existing = json.load(f)
    photos = existing.get("photos", {})
    only = [a for a in argv[argv.index("--only") + 1:] if not a.startswith("--")] if "--only" in argv else None
    refresh = "--all" in argv
    os.makedirs(OUT_DIR, exist_ok=True)

    ok = fail = 0
    for m in species:
        sid = m["id"]
        if only and sid not in only:
            continue
        have = sid in photos and os.path.exists(os.path.join(ROOT, photos[sid]["src"]))
        ov = overrides.get(sid)
        ov_file = ov.get("file") if isinstance(ov, dict) else ov
        ov_excl = ov.get("exclude", []) if isinstance(ov, dict) else []
        changed_override = (ov_file and photos.get(sid, {}).get("title") != ov_file) or photos.get(sid, {}).get("title") in ov_excl
        if have and not refresh and not changed_override and not only:
            continue
        try:
            c = find_photo(m, overrides.get(sid))
            if not c:
                print(f"–  {sid}: kein frei lizenziertes Foto gefunden")
                fail += 1
                continue
            ext = ".png" if c["mime"] == "image/png" else ".jpg"
            rel = f"assets/photos/{sid}{ext}"
            download(c["thumb"], os.path.join(ROOT, rel))
            photos[sid] = {
                "src": rel, "title": c["title"], "author": c["author"][:200], "license": c["license"],
                "licenseUrl": c["licenseUrl"], "sourceUrl": c["page"],
            }
            print(f"✓  {sid}: {c['title']}  ({c['license']}, {c['author'][:60]})")
            ok += 1
        except Exception as e:  # Netzwerk- oder API-Fehler: weiter mit der nächsten Art
            print(f"!  {sid}: Fehler – {e}")
            fail += 1
        time.sleep(3)  # Commons schonen

    photos = {k: v for k, v in photos.items() if any(m["id"] == k for m in species)}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"source": "Wikimedia Commons", "generatedAt": time.strftime("%Y-%m-%d"), "photos": photos},
                  f, ensure_ascii=False, indent=1)
    print(f"\nFertig: {ok} geladen, {fail} ohne Foto, insgesamt {len(photos)} Fotos in photos.json")


if __name__ == "__main__":
    main(sys.argv[1:])
