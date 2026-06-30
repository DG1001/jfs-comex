#!/bin/sh
set -e

# Das Datenverzeichnis ist im Betrieb meist ein Bind-Mount (./data). Docker
# legt ein fehlendes Mount-Ziel als root an, wodurch der unprivilegierte
# App-User (bof) die SQLite-Datei nicht öffnen kann (SQLITE_CANTOPEN).
# Darum hier als root die Rechte geraderücken und erst dann die Rechte ablegen.
DATA_DIR="$(dirname "${BOF_DB_PATH:-/app/data/bof.sqlite}")"
mkdir -p "$DATA_DIR"
chown -R bof:bof "$DATA_DIR"

# Privilegien auf den App-User ablegen und den eigentlichen Befehl (CMD) starten.
exec setpriv --reuid=bof --regid=bof --init-groups "$@"
