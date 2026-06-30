# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BoF-App JFS 2026 — a Birds-of-a-Feather / un-conference web app for Java Forum
Stuttgart 2026. Attendees submit topics, join others' topics, and a matching
algorithm assigns the most-wanted topics to physical meeting points at each
slot's cutoff. Guiding principle: "lieber klein und entfernbar als groß und
integriert" — standalone, single SQLite file, YAML config instead of an
admin UI. The original spec is `doc/Anforderungsdokument_BoF_App_JFS2026.pdf`.

The product, code comments, and UI are in German; keep new text German.

## Commands

```bash
npm run dev      # dev server on 0.0.0.0:3000
npm run build    # production build
npm run start    # production server on 0.0.0.0:3000
npm run lint     # next lint
```

There is no test suite. The server **must** bind to `0.0.0.0` (already set in
the npm scripts) so it is reachable when running behind a reverse proxy or in a
container, where binding to `localhost` only would not be reachable.

```bash
node scripts/seed-demo.mjs   # wipe + write a curated demo dataset
```

`seed-demo.mjs` resets topics/participants/interests/assignments and writes a
demo set; it also force-matches the first two slots via the admin API if the
dev server is running. Run the app once first so the DB schema exists.

Before running locally, set `BOF_ADMIN_TOKEN` (copy `.env.example` to `.env`).
The admin page at `/admin` requires this token.

Docker: `docker compose up -d --build`. The SQLite file is bind-mounted at
`./data/bof.sqlite` so it survives redeploys.

## Required workflow

After any change, append a dated entry to `doc/Anpassungen.md` (newest first)
with both a *fachlich* (what/why) and *technisch* (how/where) section. This is
the running changelog of all post-V1 changes.

Only run `git commit` when the user explicitly asks. "fertig" / "done" do not
count as a request to commit.

## Architecture

Single Next.js 14 (App Router) process serving both the UI and the API. No
separate backend. Two pages — `app/page.tsx` (attendee view) and
`app/admin/page.tsx` — are large client components; all server logic lives in
route handlers under `app/api/` and in `lib/`.

**Persistence** is one SQLite file via `better-sqlite3`. `lib/db.ts` owns the
connection (lazy singleton, WAL mode) and the schema — `migrate()` runs
idempotent `CREATE TABLE IF NOT EXISTS` on first access, so schema changes go
there. Override the path with `BOF_DB_PATH`. `closeDb()` is provided for the
admin restore endpoint, which needs to release the file handle to swap the
DB file; the next `getDb()` reopens it.

**Backup & restore** — `POST /api/admin/backup` returns a consistent SQLite
snapshot via the online-backup API (works while the app keeps serving);
`POST /api/admin/restore` (multipart, field `backup`) validates the upload
(probe-open + required tables), takes a pre-restore snapshot into the
`data/` volume as `bof-pre-restore-<timestamp>.sqlite`, then hot-swaps the
DB file. Both endpoints are exposed in the admin UI via the
`BackupRestore` component.

**Config** is `config.yaml`, read once and cached by `lib/config.ts` (override
with `BOF_CONFIG_PATH`). It is the single source of truth for slots,
meeting-point identity (name, capacity), and the map. A single
`map.plan` path points at the background SVG under `public/lageplan/`; the
map UI renders that SVG, overlays meeting-point markers, and is wrapped in a
pinch-/wheel-zoom container (`PinchZoomContainer` in `app/page.tsx`). Editing
the config requires a process restart.

**Config-vs-DB overlay pattern** — meeting-point *positions* (`x`/`y`) and
per-meeting-point *slot availability* are editable from the admin UI at
runtime. They are stored as DB overlay tables (`meeting_point_positions`,
`meeting_point_slots`); when a row is absent the `config.yaml` value applies.
Always read meeting points through `getEffectiveMeetingPoints()`
(`lib/meeting-points.ts`), never directly from config, so overrides are
honored. The *marker box* (the visible container that holds the markers on
the map) is **not** editable at runtime — its position/size live exclusively
in `config.yaml` (`map.marker_box`) and require a process restart to change.

**Matching** (`lib/matching.ts`) runs lazily: `runDueMatchings()` is called at
the top of read queries (`lib/queries.ts`) and assigns every slot whose cutoff
has passed but is not yet in `slot_matched`. Each slot is matched exactly once
(idempotent, re-checked inside a transaction). Slots are processed
chronologically so a topic placed in an earlier slot is excluded from later
ones. Admins can `forceMatchSlot()` before cutoff. Matching rules: preferred
slots first, then interest count descending, biggest venue to the top topic;
topics below `min_interested` or beyond the venue count get a `null`
`meeting_point_id` assignment row (the "no match this time" state).

**Identity** is a lightweight account — a display name plus a password, no
email. `/api/auth/register` creates a `participants` row (case-insensitive
unique name, scrypt password hash via `lib/auth.ts`) and returns a
server-generated participant ID. The browser keeps that ID in `localStorage`
(`lib/client.ts`) and sends it as the `x-participant-id` header — it is the
bearer credential and is deliberately **never returned in API responses** (so
`owner_id` is omitted from the `Topic` payload). `/api/auth/login` re-issues
the ID for a known name+password (new device); `/api/me` auto-logs-in a stored
ID on load. Admins reset a password via `/api/admin/participants/[id]/password`.
Server-side, `lib/http.ts` provides `requireParticipant`, `requireClaimedName`,
`requireAdmin` (checks the `x-admin-token` header) and the input validators
(`validDisplayName`, `validTitle`, `validPassword`).

**Client API layer** — `lib/client.ts` (`apiGet`/`apiPost`/`apiDelete`,
`ApiError`) wraps fetch, injects the participant-ID header, and distinguishes
network errors (`status === 0`) from server rejections. Pages use this rather
than calling fetch directly.

**Admin → Participant messages** — admins can send a short note to a
specific participant (clarification questions, "please show up at the info
desk"). Stored in the `admin_messages` table with status `unread | replied |
dismissed`. The attendee's `refresh()` (15-s polling) also fetches
`/api/messages`; the first unread message that the user hasn't dismissed in
this session is shown as a modal. The user can reply (`POST
/api/messages/[id]/reply`), mark as personally clarified (`POST
/api/messages/[id]/dismiss`), or close the modal (sees it again on the next
refresh — soft nudge). The admin side lives in the `MessagesEditor`
component (`app/admin/page.tsx`).

**PWA** — the app is installable. `app/manifest.ts` is the web manifest;
`app/icon.tsx` and `app/apple-icon.tsx` render PNG icons via `next/og`
(`ImageResponse`) from the shared motif in `lib/icon-art.tsx` — no image
tooling or extra dependency. `public/sw.js` is a hand-written service worker
(app-shell precache, cache-first static assets, network-first navigation with
`public/offline.html` fallback, `/api/*` always live); `app/sw-register.tsx`
registers it.
