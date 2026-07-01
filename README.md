# Community Exchange — JFS 2026

Schlanke Web-App für das Community-Exchange-Format (Birds of a Feather /
Un-Conference) auf dem **Java Forum Stuttgart 2026**. Teilnehmer tragen Themen
ein, schließen sich Themen anderer an, und ein Matching-Algorithmus ordnet die
gefragtesten Themen zum Cutoff eines Slots konkreten Treffpunkten zu.

Ausgehend von einem schlanken V1-Scope sind seither u. a. dazugekommen:
Rebranding zu „Community Exchange", COMEX-Lageplan mit Pinch-Zoom, mehr Slots,
Account-Login und Admin → Teilnehmer-Nachrichten.

## Leitprinzip

> „Lieber klein und entfernbar als groß und integriert."

Eigenständig, kein JUGS-System-Hook, SQLite-Datei als einzige Persistenz,
YAML-Config statt Admin-UI.

## Tech-Stack

- **Next.js 14 (App Router)** + TypeScript — ein einziger Prozess für Frontend
  und API.
- **Tailwind CSS** für responsive, mobile-first UI.
- **better-sqlite3** — eine einzelne Datei unter `./data/bof.sqlite`.
- **YAML-Config** (`config.yaml`) für Karte, Treffpunkte, Slots und
  Cutoff-Regeln.
- **Docker** für den Betrieb auf einem kleinen Server.

## Kernfunktionen

- Account aus Anzeigename + Passwort (kein Klarname, keine E-Mail). Bei der
  Registrierung wird ein Passwort vorgeschlagen; der Browser bleibt eingeloggt.
- Themenliste mit Suche, Interessentenzähler, Wunsch-Slot-Chips.
- Thema anlegen (Titel, optionale Beschreibung, Wunsch-Slots).
- Beitreten / Austreten (Owner kann sein Thema vor Zuteilung löschen).
- Karte / Lageplan mit den Treffpunkten als nummerierte Farb-Marker in einem
  weißen „Schild"; Pinch-/Wheel-Zoom für Details auf Smartphones.
- „Meine Themen"-Status: *Wartet auf Zuordnung* / *Stand X, 14:30* /
  *diesmal leider nicht*.
- **Admin-Nachrichten:** Der Admin kann gezielt einem Teilnehmer eine kurze
  Nachricht senden („bitte am Info-Stand melden, sonst Löschung"); der
  Empfänger sieht ein Modal und kann antworten oder „komme vorbei" wählen.
- Admin-Seite (`/admin`, Token): missbräuchliche Themen entfernen, Zuteilungen
  und Karte (inkl. verschieb-/skalierbarem Treffpunkte-Schild) verwalten,
  Teilnehmer-Passwörter zurücksetzen, Nachrichten an Teilnehmer senden.
- Als **PWA installierbar** („Zum Startbildschirm hinzufügen") — läuft dann im
  Vollbild mit eigenem Icon; Offline-Hinweisseite bei fehlender Verbindung.

## Matching

- Wird **lazy** zum Cutoff-Zeitpunkt jedes Slots ausgelöst (bei der nächsten
  API-Anfrage) und pro Slot **einmal** persistiert (siehe `slot_matched`).
- Regeln:
  1. Topics mit `preferred_slots` werden im gewünschten Slot bevorzugt.
  2. Innerhalb eines Slots: Sortierung nach Interessenten absteigend.
  3. Zuweisung zu den für den Slot freigegebenen Treffpunkten; Top-Thema
     bekommt den größten Treffpunkt.
  4. Mehr Themen als Treffpunkte → die kleinsten fallen heraus und
     qualifizieren sich automatisch für den nächsten Slot (sie bleiben in
     der Themenliste, ein „kein Match"-Hinweis erscheint im „Mein Thema"-Tab).
  5. Mindestschwelle `min_interested` (Default 3, konfigurierbar).
- Erfolgreich zugeteilte Themen sind für weitere Slots **nicht** mehr aktiv
  (V1 lässt Themen nicht über mehrere Slots laufen).

## Konfiguration

Alles in `config.yaml` (wird beim Start einmal gelesen):

```yaml
matching:
  min_interested: 3

# Eine Karte unter public/. marker_box ist das weiße "Schild" auf der Karte,
# in dem die Treffpunkt-Marker liegen — im Admin verschieb-/skalierbar.
map:
  plan: "/lageplan/comex.svg"
  marker_box: { x: 0.68, y: 0.62, w: 0.27, h: 0.21 }

meeting_points:
  - id: ce-1
    name: "CE 1"
    capacity: 8
    x: 0.595           # Position auf dem Lageplan (0..1)
    y: 0.61
    slots: [vormittag-1, mittag-1]
  # Außenbereich bei Regen: slots leer lassen → nicht aktiv

slots:
  - id: vormittag-1
    name: "Vormittag · 1. Pause"
    start: "2026-07-08T09:45:00+02:00"
    end:   "2026-07-08T10:05:00+02:00"
    cutoff_minutes: 60
```

Änderungen an `config.yaml` erfordern einen Neustart des Containers.

## Lokal starten

```bash
npm install
cp .env.example .env   # BOF_ADMIN_TOKEN anpassen
export BOF_ADMIN_TOKEN=$(grep BOF_ADMIN_TOKEN .env | cut -d= -f2)
npm run dev
```

App unter http://localhost:3000, Admin unter http://localhost:3000/admin.

## Docker

```bash
cp .env.example .env        # Token setzen!
docker compose up -d --build
```

Die SQLite-Datei liegt persistent in `./data/bof.sqlite`.

## Container-Image (GHCR)

Bei jedem Push auf `main` (und bei `v*`-Tags) baut ein GitHub-Actions-Workflow
das Image und veröffentlicht es nach **GitHub Container Registry**:

```
ghcr.io/dg1001/jfs-comex:latest      # main
ghcr.io/dg1001/jfs-comex:vX.Y.Z      # Release-Tags
```

So muss zum Deployen nichts lokal gebaut werden — einfach das Image ziehen.

## Deployment hinter Traefik

Beispiel-`compose.yml` für einen Server mit Traefik (kein `ports:`-Mapping —
Traefik routet intern über das Docker-Netz; TLS macht Traefik):

```yaml
services:
  comex:
    image: ghcr.io/dg1001/jfs-comex:latest
    restart: unless-stopped
    environment:
      - BOF_ADMIN_TOKEN=${BOF_ADMIN_TOKEN:?set BOF_ADMIN_TOKEN in .env}
      - BOF_DB_PATH=/app/data/bof.sqlite
      - BOF_CONFIG_PATH=/app/config.yaml
    volumes:
      - ./data:/app/data
      - ./config.yaml:/app/config.yaml:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.comex.rule=Host(`comex.jugs.org`)"
      - "traefik.http.routers.comex.entrypoints=websecure"
      - "traefik.http.routers.comex.tls.certresolver=le"
      - "traefik.http.services.comex.loadbalancer.server.port=3000"
    networks: [web]

networks:
  web:
    external: true   # das Traefik-Netz dieses Servers
```

`entrypoints` / `certresolver` / Netzname an die jeweilige Traefik-Installation
anpassen. `config.yaml` (Karte, Treffpunkte, Slots) liegt daneben und wird
read-only gemountet; Änderungen erfordern einen Container-Neustart.

## Teilnehmer-Zugang (QR-Code)

Teilnehmer rufen die App per QR-Code vor Ort auf. Der QR-Code zeigt auf die
Domain, unter der die App erreichbar ist (z.B. `https://bof.jfs2026.de/`).
Im Browser wird nur die Participant-ID im `localStorage` gehalten (für das
automatische Wiederanmelden); Pseudonym, Passwort-Hash und Themen liegen
serverseitig in der SQLite-Datei.

## Datenschutz

- Keine Ticket-ID, keine E-Mail, kein Klarname erforderlich.
- Server speichert nur: Anzeigename, gehashtes Passwort, Participant-ID,
  Thementitel/-beschreibung, Zeitstempel.
- Persistenz liegt in der SQLite-Datei im `./data`-Volume **außerhalb** des
  Containers (bewusst so, damit ein Image-Update die Daten nicht löscht). Zum
  restlosen Entfernen nach dem Event wird von uns der Container gelöscht **und**
  `./data` (die SQLite-Datei) entfernt.

## Bewusst aus V1 ausgeklammert

Bewusst nicht in V1: Chat pro Thema, Ticket-ID-Integration,
Themen-Erweiterung durch Beitretende, Push-Benachrichtigungen, Feedback.

## Offene Punkte

- **Spam-Handling:** Admin kann Themen per `/admin` entfernen. Kein
  automatischer Filter in V1.
- **Nach-Cutoff-Themen:** Werden implizit für den nächsten offenen Slot
  aufgenommen — Wunsch-Slots, deren Cutoff bereits passiert ist, werden beim
  Anlegen ignoriert.
- **Wiederkehrende Themen über mehrere Slots:** Nicht unterstützt. Owner muss
  das Thema ggf. neu anlegen.

## Projekt-Layout

```
app/                  Next.js App Router (Pages + API-Routen)
  api/                REST-Endpunkte (topics, schedule, admin, auth,
                      config, messages)
  admin/              Admin-UI
  page.tsx            Haupt-SPA (Tabs: Themen, Karte, Meine Themen)
lib/                  Persistenz, Matching, Config, Auth
config.yaml           Karte, Treffpunkte, Slots, Cutoff, Mindestschwelle
public/lageplan/      Lageplan-SVG (eine Karte)
scripts/seed-demo.mjs Demo-Daten erzeugen
data/bof.sqlite       (entsteht beim Start)
```
