# Deployment — Community Exchange (JFS 2026)

Kurzanleitung für den Betrieb. Es muss **nichts lokal gebaut** werden — das
Image wird per GitHub Actions automatisch nach GHCR veröffentlicht.

## Image (public, ohne Login ziehbar)

- `ghcr.io/dg1001/jfs-comex:latest` — folgt `main`
- `ghcr.io/dg1001/jfs-comex:<vX.Y.Z>` — konkrete Release-Version, **für Prod
  empfohlen**. Verfügbare Tags:
  <https://github.com/DG1001/jfs-comex/tags>

Auto-Build läuft bei jedem Push auf `main` und bei `v*`-Tags. Welche Version
konkret läuft, wird **nicht hier gepinnt**, sondern über `COMEX_VERSION` in der
`.env` gesteuert (siehe unten) — so muss dieses Dokument bei neuen Tags nicht
angefasst werden.

## Eckdaten

- App lauscht im Container auf **Port 3000** (Next.js, läuft als non-root).
- Persistenz: SQLite-Datei unter `/app/data/bof.sqlite` → **Volume `./data` mounten**.
- Config (Karte/Treffpunkte/Slots) liegt als `/app/config.yaml` **im Image** —
  läuft also out-of-the-box. Eigene Slot-Zeiten/Treffpunkte → eigene
  `config.yaml` read-only drübermounten (Änderung = Container-Neustart).
- Admin-UI unter **`/admin`**, geschützt per Token.

## Was du setzen musst

Eine `.env` mit einem langen Zufalls-Token:

```
BOF_ADMIN_TOKEN=<langer-zufallswert>      # z.B. openssl rand -hex 24
COMEX_VERSION=latest                      # oder ein Release-Tag, z.B. 1.0.3
```

`COMEX_VERSION` ist optional: ohne Angabe läuft `latest` (folgt `main`). Für
einen reproduzierbaren Prod-Stand hier den gewünschten Release-Tag eintragen.

## compose.yml (hinter Traefik, Ziel `comex.jugs.org`)

Kein `ports:`-Mapping — Traefik routet intern über das Docker-Netz und macht TLS.

```yaml
services:
  comex:
    image: ghcr.io/dg1001/jfs-comex:${COMEX_VERSION:-latest}
    restart: unless-stopped
    environment:
      - BOF_ADMIN_TOKEN=${BOF_ADMIN_TOKEN:?set BOF_ADMIN_TOKEN in .env}
      - BOF_DB_PATH=/app/data/bof.sqlite
      - BOF_CONFIG_PATH=/app/config.yaml
    volumes:
      - ./data:/app/data
      # optional eigene Config statt der eingebackenen:
      # - ./config.yaml:/app/config.yaml:ro
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.comex.rule=Host(`comex.jugs.org`)"
      - "traefik.http.routers.comex.entrypoints=websecure"
      - "traefik.http.routers.comex.tls.certresolver=le"
      - "traefik.http.services.comex.loadbalancer.server.port=3000"
    networks: [web]

networks:
  web:
    external: true        # dein Traefik-Netz
```

> `entrypoints`, `certresolver` und Netzname an die jeweilige Traefik-Installation
> anpassen.

## Start

```bash
echo "BOF_ADMIN_TOKEN=$(openssl rand -hex 24)" > .env
docker compose up -d
```

App: `https://comex.jugs.org/` · Admin: `https://comex.jugs.org/admin` (Token aus `.env`).

## Update

```bash
docker compose pull && docker compose up -d   # bei COMEX_VERSION=latest
```

Für einen gepinnten Stand `COMEX_VERSION` in der `.env` auf den gewünschten
`vX.Y.Z`-Release-Tag setzen und `docker compose up -d` — kein Editieren der
`compose.yml` nötig.

## Datenschutz / Teardown

App speichert nur Anzeigename, Passwort-Hash, Participant-ID, Themen + Zeitstempel
— keine Mails/Klarnamen. Nach dem Event Container entfernen und `./data` löschen =
spurlos weg.
