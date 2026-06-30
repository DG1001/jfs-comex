# Deployment — Community Exchange (JFS 2026)

Kurzanleitung für den Betrieb. Es muss **nichts lokal gebaut** werden — das
Image wird per GitHub Actions automatisch nach GHCR veröffentlicht.

## Image (public, ohne Login ziehbar)

- `ghcr.io/dg1001/jfs-comex:1.0.0` — feste Version, **für Prod empfohlen**
- `ghcr.io/dg1001/jfs-comex:latest` — folgt `main`

Auto-Build läuft bei jedem Push auf `main` und bei `v*`-Tags.

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
```

## compose.yml (hinter Traefik, Ziel `comex.jugs.org`)

Kein `ports:`-Mapping — Traefik routet intern über das Docker-Netz und macht TLS.

```yaml
services:
  comex:
    image: ghcr.io/dg1001/jfs-comex:1.0.0
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
docker compose pull && docker compose up -d   # bei :latest
```

Bei gepinntem `:1.0.0` den Tag in der `compose.yml` auf die neue Version setzen.

## Datenschutz / Teardown

App speichert nur Anzeigename, Passwort-Hash, Participant-ID, Themen + Zeitstempel
— keine Mails/Klarnamen. Nach dem Event Container entfernen und `./data` löschen =
spurlos weg.
