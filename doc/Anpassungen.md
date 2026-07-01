# Anpassungen (nach V1)

Laufendes Änderungsprotokoll aller Anpassungen nach dem V1-Stand. Neueste
Einträge stehen oben.

## 2026-07-01 — PWA-Cache-Bump + Doku-Korrekturen (Persistenz/Teardown)

**Fachlich (was/warum):** Zwei README-Aussagen waren irreführend: Es klang, als
lägen Teilnehmerdaten nur im Browser-`localStorage` und als genüge das
Abschalten des Containers, um alles spurlos zu entfernen. Tatsächlich liegen
Anzeigename, Passwort-Hash, Participant-ID und Themen serverseitig in der
SQLite-Datei, und die liegt bewusst im `./data`-Volume **außerhalb** des
Containers (damit ein Image-Update die Daten nicht löscht). Aufräumen nach dem
Event heißt daher: Container **und** `./data` löschen. Außerdem für das
PWA-Update die Service-Worker-Cache-Version hochgezogen, damit Clients nach dem
Release die neue App-Shell laden statt einer veralteten aus dem Cache.

**Technisch (wie/wo):** In `README.md` den QR-Code-Abschnitt (im `localStorage`
liegt nur die Participant-ID fürs Auto-Login) und den Datenschutz-Punkt
(Persistenz im externen `./data`-Volume, Teardown = Container + `./data`)
korrigiert — konsistent zum Teardown-Absatz in `DEPLOY.md`. In `public/sw.js`
`CACHE` von `ce-shell-v1` auf `ce-shell-v2` erhöht; der `activate`-Handler
löscht dadurch den alten Cache und precached die Shell (`/`, `/offline.html`)
neu. Konvention (Kommentar ergänzt): bei jeder App-Änderung hochzählen.

## 2026-07-01 — Vortragsprogramm: echte Saalnamen + aktuelle Zeitslots (finales Programm)

**Fachlich (was/warum):** Das JFS-2026-Programm steht inzwischen fest, inkl.
Raumzuteilung und einiger seit dem letzten Scrape (2026-06-27) verschobener
Vorträge (java-forum-stuttgart.de/vortraege/2026). In der Programm-Übersicht
der App (Button „Vortragsprogramm anzeigen") stand bei jedem Vortrag bislang
nur ein Platzhalter-Kürzel (`A1`, `B2`, …) und zum Teil ein veralteter
Zeitslot. Jetzt zeigt die Übersicht den tatsächlichen **Saal** (Beethoven,
Mozart, Silcher, Hegel, Schiller Saal, Bonn-Hamburg, Köln) und die **aktuellen
Zeitblöcke**. Konkret geänderte Platzierungen gegenüber vorher: „Dein Coding
Agent belügt dich nicht – er vergisst dich" (Frederik Wystup) läuft jetzt am
Nachmittag **15:35–16:20** (Beethoven Saal) statt vormittags; im Gegenzug ist
„Just like the simulations: Teaching robots to play chess" von 15:35 auf
**09:50–10:35** (Silcher Saal) gerückt; „Der Keycloak-Fehler …" heißt nun
vollständig „… (und wie du ihn vermeidest)". Die Säle sind feste Spalten je
Track (A = Beethoven … G = Köln).

**Technisch (wie/wo):** `lib/programm.ts` vollständig aus dem aktuellen,
maßgeblichen Raster der offiziellen Seite neu generiert (7 Blöcke × 7 Säle =
49 Vorträge). Die Zuordnung Block→Saal→Vortrag wurde direkt aus den
Zeit-Header- und Zellen-Markern der Seite abgeleitet (die Zeit-Header sind im
HTML durch Kommentar-Knoten zerstückelt — `15:35<!-- --> -<!-- -->16:20` —
und wurden vor dem Parsen bereinigt). Speaker-Listen unverändert und 1:1 gegen
den vorherigen Stand gegengeprüft (0 Abweichungen). `track` jetzt konsistent
als Spaltenkennung A–G aus der festen Saal-Reihenfolge; Interface-Kommentare
und Scrape-Datum aktualisiert. In `app/page.tsx` (`ProgrammModal`) das
Raum-Badge auf `whitespace-nowrap shrink-0` gesetzt, damit die längeren
Saalnamen nicht umbrechen, und das „Stand"-Datum im Footer auf 2026-07-01
gezogen.

## 2026-06-30 — Matching: Wunsch-Slot schützt, sonst Teilnehmerzahl (Zwischenlösung)

**Fachlich (was/warum):** Verfeinerung der vorherigen Änderung. Statt rein nach
Teilnehmerzahl zu sortieren, gibt es jetzt zwei Gruppen: Themen, die *genau
diesen* Slot als Wunsch angegeben haben, werden hier zuerst platziert (damit
ein Wunsch-Thema nicht durch fremde Themen aus seinem Slot verdrängt wird).
Alle übrigen Themen — ob ohne Wunsch oder mit einem *anderen* Wunsch-Slot —
konkurrieren danach gleichberechtigt. Innerhalb beider Gruppen entscheidet die
Teilnehmerzahl (absteigend). Hintergrund: Die reine Teilnehmerzahl-Sortierung
konnte ein großes Thema in einen früheren, nicht gewünschten Slot „vorziehen"
und so seinen eigentlichen Wunsch-Slot blockieren. Da Überbuchung allenfalls an
einem einzelnen Slot erwartet wird, ist diese Variante der bessere Kompromiss.

**Technisch (wie/wo):** In `lib/matching.ts` (`matchSlot`) die dreistufige
`priority()`-Funktion durch das zweistufige `prefersThisSlot()` ersetzt (0 =
Wunsch ist dieser Slot, sonst 1). Sortierung: zuerst `prefersThisSlot`
aufsteigend, bei Gleichstand `interest_count` absteigend. Verifiziert mit einem
konstruierten Szenario (Slot mit nur 2 Standorten, zwei große wunschlose Themen
+ ein kleines Thema mit Wunsch auf diesen Slot): das kleine Wunsch-Thema wird
geschützt platziert, das zweitgrößte wunschlose Thema fällt heraus.

## 2026-06-30 — Matching: Teilnehmerzahl als primäres Sortierkriterium

**Fachlich (was/warum):** Beim Zuteilen von Themen zu Standorten zählt jetzt
zuerst die Teilnehmerzahl, der Wunsch-Slot ist nur noch zweitrangig. Wenn für
einen Slot mehr Themen als verfügbare Standorte vorliegen, werden also die
Themen mit den meisten Interessenten bevorzugt platziert. Bisher wurde primär
nach Wunsch-Slot sortiert — dadurch konnte ein kleines Thema mit Wunsch-Slot
ein deutlich größeres Thema (ohne bzw. mit anderem Wunsch-Slot) verdrängen.
Der Wunsch-Slot wirkt jetzt nur noch als Tie-Breaker bei gleicher
Teilnehmerzahl (Wunsch-Slot dieses Slots > kein Wunsch-Slot > anderer
Wunsch-Slot).

**Technisch (wie/wo):** In `lib/matching.ts` (`matchSlot`) die beiden
Sortierschlüssel der `sorted`-Berechnung getauscht: zuerst
`b.interest_count - a.interest_count`, bei Gleichstand `priority(a) -
priority(b)`. Die `priority()`-Funktion und alle übrigen Regeln
(`min_interested`-Filter, chronologische Slot-Reihenfolge, Ausschluss bereits
platzierter Themen, größter Standort an das stärkste Thema) bleiben
unverändert.
