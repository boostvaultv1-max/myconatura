# MycoNatura – Digitales Pilzlexikon

Kostenloses, werbefreies und offlinefähiges Pilzlexikon für Mitteleuropa – optimiert für iPhone und iPad.
Reines HTML, CSS und JavaScript: **kein Framework, kein Build-Schritt, kein Backend, keine externen Dienste.**

> ⚠️ **Sicherheitshinweis:** MycoNatura ist ein Lern- und Nachschlagewerk. Iss niemals einen Pilz allein auf Grundlage dieser Website. Lass jeden Fund von geprüften Pilzsachverständigen kontrollieren. Notfall: **112** bzw. Giftnotruf.

## Funktionen

| Bereich | Inhalt |
|---|---|
| **Startseite** | Großes Suchfeld, Saisonpilze des aktuellen Monats, beliebte Pilze, 6 Kategorien, zuletzt angesehen, Favoriten, Schnellzugriffe |
| **Lexikon** | 44 Arten mit Detailseite: Namen, Synonyme, Hut, Lamellen/Röhren, Stiel & Stielbasis, Fleisch, Geruch, Sporenpulver, Lebensraum, Begleitbäume, Verbreitung, Saisonkalender, Essbarkeit, Verwechslungspartner (gefährliche markiert), Unterscheidungsmerkmale, Quellen & Stand |
| **Suche & Filter** | Live-Suche (deutsch, lateinisch, Synonyme, Lebensraum, Bäume, Farben, Monate); Filter nach Essbarkeit, Unterseite, Hut- und Lamellenfarbe, Lebensraum, Saison; Sortierung |
| **Bestimmungshilfe** | 13 Schritte (Hutform, Hutfarbe, Lamellen/Röhren, Farbe der Unterseite, Stielfarbe, Stielform, Stielbasis, Ring, Geruch, Sporenpulver, Lebensraum, Begleitbäume, Monat). Zeigt je Kandidat, was passt und was dagegen spricht – **ohne** erfundene Wahrscheinlichkeiten |
| **Pilz-Assistent** | Beantwortet Fragen offline aus der Datenbank (Essbarkeit, Verwechslungen, Saison, Fundort, Vergleiche, Beschreibung eines Fundes, Notfall). Keine generative KI, keine Verzehrfreigabe. Logik in `src/js/assistant.js` |
| **Fundbuch** | Funde mit Fotos (automatisch verkleinert), Datum, optionalem Fundort/GPS, Merkmalen, Notizen; bearbeiten, löschen, Favoriten; Export/Import als JSON |
| **Offline (PWA)** | Service Worker, Manifest, Installation über „Zum Home-Bildschirm“ |
| **Design** | Mobile-First, Hell/Dunkel/Automatisch, eigenes Logo, barrierearme Bedienung (Fokus, ARIA, Skip-Link, reduzierte Bewegung) |

## Projektstruktur

```
myconatura/
├── index.html               App-Hülle, Navigation, Logo (SVG)
├── manifest.json            Web-App-Manifest (Installierbarkeit)
├── service-worker.js        Offline-Cache
├── README.md
├── .github/workflows/fotos-laden.yml   Lädt Fotos per Knopfdruck auf GitHub
├── tools/fetch_photos.py    Foto-Skript (Wikimedia Commons, nur freie Lizenzen)
├── tools/photo-overrides.json  Bestimmte Fotos manuell festlegen
├── assets/icons/            Eigenes Logo (SVG) + PNG-Icons für iOS/Android
├── assets/photos/           Heruntergeladene Pilzfotos
└── src/
    ├── style.css            Gesamtes Design
    ├── data/mushrooms.json  Pilzdatenbank (stabile IDs, feste Felder)
    ├── data/photos.json     Foto-Liste mit Urheber, Lizenz und Quelle
    └── js/
        ├── app.js           Router + alle Seiten
        ├── config.js        ➜ Hier deinen Spenden-Link eintragen
        ├── vocab.js         Feste Merkmals-Schlüssel und deutsche Bezeichnungen
        ├── search.js        Offline-Suche & Filter
        ├── identify.js      Bestimmungshilfe (transparente Merkmalsvergleiche)
        ├── store.js         LocalStorage + IndexedDB, Export/Import
        ├── illustration.js  Erzeugt die schematischen Pilz-Illustrationen
        └── util.js          Escaping (XSS-Schutz), Bildverkleinerung, Helfer
```

## Schnellstart am Computer (Windows/Mac/Linux)

1. Kostenlos installieren: **[Visual Studio Code](https://code.visualstudio.com)** und **[Python 3](https://www.python.org)** (auf dem Mac meist schon vorhanden).
2. Projektordner entpacken und in VS Code öffnen („Datei › Ordner öffnen“).
3. Terminal in VS Code öffnen („Terminal › Neues Terminal“) und eingeben:
   ```bash
   python3 -m http.server 8000
   ```
   (Windows ggf. `py -m http.server 8000`. Alternative mit Node.js: `npx serve .`)
4. Im Browser öffnen: **http://localhost:8000**

> Die `index.html` per Doppelklick (file://) zu öffnen funktioniert **nicht** – Browser blockieren dann das Laden der Datenbank. Immer über einen Server starten.

## Auf dem iPhone testen – drei Wege

**Wichtig vorab:** „localhost“ bedeutet immer *dieses Gerät*. `http://localhost:8000` funktioniert auf dem iPhone nur, wenn **auf dem iPhone selbst** ein Server läuft. Außerdem erlaubt Safari Offline-Modus und Installation (Service Worker) nur über **HTTPS oder localhost**.

### Weg A – Empfohlen: kostenlos veröffentlichen mit GitHub Pages (volle PWA, nur iPhone nötig)
1. Kostenloses Konto auf **github.com** anlegen (geht im iPhone-Safari).
2. „New repository“ → Name z. B. `myconatura` → **Public** → erstellen.
3. „Add file › Upload files“ → alle Dateien und Ordner des Projekts hochladen (Ordnerstruktur beibehalten; am iPhone über die Dateien-App, entpackte ZIP) → „Commit changes“.
4. „Settings › Pages“ → *Source:* „Deploy from a branch“, *Branch:* `main` / `(root)` → Save.
5. Nach 1–2 Minuten ist die Seite unter `https://DEINNAME.github.io/myconatura/` erreichbar.
6. In Safari öffnen → Teilen-Symbol → **„Zum Home-Bildschirm“**.
7. Zum Bearbeiten am iPhone: im Repository die Datei öffnen und auf den Stift tippen; am Computer geht `github.dev` (Taste `.` im Repository) als Online-VS-Code.

### Weg B – Computer im selben WLAN (schnell zum Ansehen)
1. Server wie oben starten, aber an alle Netzwerk-Adressen binden: `python3 -m http.server 8000 --bind 0.0.0.0`
2. IP des Computers herausfinden (Mac: Systemeinstellungen › WLAN › Details; Windows: `ipconfig`), z. B. `192.168.178.20`.
3. Auf dem iPhone in Safari: `http://192.168.178.20:8000`
4. Einschränkung: Lexikon, Suche, Bestimmung und Fundbuch funktionieren; **Offline-Modus und GPS nicht**, da keine HTTPS-Verbindung.

### Weg C – Server direkt auf dem iPhone (echtes localhost)
Mit der kostenlosen App **a-Shell** (App Store) lässt sich Python auf dem iPhone ausführen:
1. Projektordner in die Dateien-App legen, in a-Shell mit `pickFolder` auswählen.
2. `python3 -m http.server 8000` starten, dann in Safari `http://localhost:8000` öffnen.
3. Hinweis: iOS pausiert Apps im Hintergrund, der Server kann daher nach kurzer Zeit stoppen. Für den Alltag ist Weg A zuverlässiger. (Diesen Weg konnte ich nicht selbst auf einem iPhone testen.)

## Offline-Funktion testen
1. Seite einmal **mit Internet** über HTTPS (Weg A) oder localhost öffnen, ein paar Sekunden warten.
2. „Mehr“ öffnen → „Offline-Modus (Service Worker)“ muss **Aktiv** anzeigen.
3. Flugmodus einschalten, App vom Home-Bildschirm starten.
4. Oben erscheint „Offline“; Lexikon, Suche, Filter, Detailseiten, Bestimmungshilfe und Fundbuch funktionieren weiter. Nur GPS-Standort und externe Links brauchen ggf. Netz.

Am Computer: Chrome → Entwicklertools (F12) → „Application › Service Workers“ → **Offline** anhaken → neu laden.

**Nach Änderungen an Dateien** in `service-worker.js` die `APP_VERSION` erhöhen (z. B. `1.1.1`), sonst sehen Nutzer weiter die alte Version.

## Daten & Speicherung
- Favoriten, Verlauf, Farbschema: **LocalStorage**. Fundbuch inkl. Fotos: **IndexedDB** (automatischer Rückfall auf LocalStorage, falls nicht verfügbar).
- Alle Daten bleiben im Browser auf dem Gerät und überstehen Neustarts. Safari kann Website-Daten jedoch bei Speichermangel oder nach längerer Nichtnutzung löschen → **regelmäßig unter „Fundbuch › Exportieren“ sichern.**
- Import prüft und bereinigt jeden Datensatz (nur JPEG/PNG/WebP/GIF-Fotos, Längenbegrenzungen); Funde mit gleicher ID werden überschrieben.

## Pilzdatenbank erweitern
Neue Art in `src/data/mushrooms.json` im Array `mushrooms` ergänzen. Merkmale nur mit den Schlüsseln aus `src/js/vocab.js` angeben (z. B. Farben `weiss, creme, gelb, orange, rot, rosa, braun, oliv, gruen, grau, violett, schwarz`). Unbekanntes einfach leer lassen (`""` bzw. `[]`) – die App zeigt dann „Unbekannt / nicht angegeben“. Danach `APP_VERSION` im Service Worker erhöhen.

Minimalbeispiel:
```json
{
  "id": "neue-art", "name": "Deutscher Name", "scientific": "Genus species",
  "family": "", "synonyms": [], "edibility": "ungeniessbar", "edibilityNote": "",
  "description": "Kurzbeschreibung.",
  "cap": { "text": "", "shape": ["gewoelbt"], "colors": ["braun"] },
  "hymenophore": { "type": "lamellen", "text": "", "colors": ["weiss"] },
  "stem": { "text": "", "colors": ["weiss"], "shape": ["schlank"], "base": "unauffaellig", "baseText": "", "ring": false },
  "flesh": { "text": "" }, "smell": { "text": "", "tags": [] }, "spore": { "text": "", "tags": [] },
  "habitat": { "text": "", "tags": ["laubwald"], "substrate": "boden" },
  "trees": [], "distribution": "", "season": { "months": [9, 10], "text": "September bis Oktober" },
  "lookalikes": [], "keyFeatures": [], "illustration": { "type": "cap", "capShape": "convex", "cap": "#8a5a2e" },
  "sources": ["laux"], "updated": "2026-10", "popular": false
}
```
Mögliche Werte für `edibility`: `essbar`, `bedingt`, `ungeniessbar`, `giftig`, `toedlich`.

## Echte Fotos hinzufügen (Wikimedia Commons)

Die App zeigt automatisch ein **echtes Foto**, sobald eines in `src/data/photos.json` eingetragen ist – mit Urheber, Lizenz und Link zur Quelle unter dem Bild und auf der Seite „Quellen“. Ohne Foto erscheint die eigene Illustration. Fotos werden vom Service Worker für die Offline-Nutzung mitgespeichert.

**Am einfachsten (geht komplett vom iPhone aus), sobald das Projekt auf GitHub liegt:**
0. Prüfen, ob im Repository der Ordner `.github/workflows` existiert. Die Dateien-App auf dem iPhone blendet Ordner mit Punkt am Anfang aus, daher wird er beim Hochladen oft vergessen. Dann auf GitHub „Add file › Create new file“ wählen, als Namen `.github/workflows/fotos-laden.yml` eintippen und den Inhalt der Datei aus der ZIP einfügen.
1. Im Repository den Reiter **Actions** öffnen (falls nötig „I understand my workflows, enable them“ antippen).
2. **„Pilzfotos laden“** → **„Run workflow“** → Modus „fehlende“ → starten.
3. Nach ein paar Minuten liegen die Fotos in `assets/photos/` und `src/data/photos.json`; die Seite wird neu veröffentlicht. Falls GitHub Pages nicht von selbst aktualisiert: eine beliebige kleine Änderung (z. B. in der README) committen.

**Am Computer:** `python3 tools/fetch_photos.py` (nur fehlende) bzw. `--all` (alle neu).

Das Skript nimmt ausschließlich Dateien mit **CC0, Public Domain, CC BY oder CC BY-SA**, bevorzugt große Querformat-Fotos und überspringt Mikroskopbilder, Zeichnungen und Briefmarken. **Bitte das Ergebnis durchsehen:** Gefällt ein Foto nicht oder zeigt es die falsche Art, auf commons.wikimedia.org ein besseres suchen und in `tools/photo-overrides.json` eintragen, z. B. `"parasol": "File:Dateiname.jpg"`, dann erneut starten. Die Urhebernennung unter dem Bild ist bei CC BY/BY-SA Pflicht – nicht entfernen.

## Spenden-Link einrichten

In `src/js/config.js` deinen Link eintragen (nur `https://`), z. B.:
```js
url: 'https://www.paypal.me/DEINNAME',
creator: 'Dein Name',
```
Danach erscheint der Bereich „MycoNatura unterstützen“ auf der Startseite, unter „Mehr“ und unter „Über“. Solange `url` leer ist, wird nichts angezeigt. Anschließend in `service-worker.js` `APP_VERSION` erhöhen.

## Quellen, Bilder & Lizenzen
- **Texte:** fassen weithin dokumentiertes Bestimmungswissen zusammen. Als Referenzliteratur zum Nachprüfen sind angegeben: Laux – *Der große Kosmos-Pilzführer*; Gminder – *Handbuch für Pilzsammler*; Flück – *Welcher Pilz ist das?*; DGfM (dgfm-ev.de); Species Fungorum (Nomenklatur); Giftinformationszentren. **Die Angaben wurden nicht Seite für Seite gegen diese Werke abgeglichen** – bitte vor Veröffentlichung von einer fachkundigen Person prüfen lassen.
- **Bilder:** Fotos von Wikimedia Commons unter freien Lizenzen (siehe oben), jeweils mit Urheber und Lizenz. Ersatzweise eigene, schematische SVG-Illustrationen aus `illustration.js` (frei nutzbar, keine Bestimmungsfotos).
- **Rechtlicher Hinweis:** Der Spitzkegelige Kahlkopf ist als psychoaktiver Pilz rein informativ aufgenommen (Erkennen und Vermeiden); er unterliegt in Deutschland dem Betäubungsmittelgesetz.
- **Giftnotruf-Nummern** auf der Sicherheitsseite vor der Pilzsaison prüfen.

## Getestet
Automatisiert mit Playwright/Chromium in iPhone-13-Emulation (nicht auf einem echten iPhone): alle 44 Detailseiten, Live-Suche (Name, lateinisch, Synonym, Baum, Monat), Filterkombinationen, Kategorien, Bestimmungshilfe bis zur Auswertung, Fundbuch (Anlegen mit Foto, Bearbeiten, Neuladen, Löschen), Export/Import inkl. fehlerhafter Datei, XSS-Eingabe im Titel, Dark Mode, Service Worker und Offline-Betrieb (Suche + Fundbuch ohne Netz). Keine Konsolenfehler. Foto-Anzeige, Lizenzzeile, Ersatz-Illustration bei fehlender Datei, Offline-Foto und Spenden-Bereich wurden mit Testdaten geprüft; das Foto-Skript mit simulierten Commons-Antworten (Lizenzfilter, Auswahl, Urheberbereinigung). **Der echte Abruf von Wikimedia Commons konnte nicht getestet werden**, weil Commons in meiner Entwicklungsumgebung gesperrt war.
