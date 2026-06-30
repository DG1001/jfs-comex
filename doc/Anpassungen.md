# Anpassungen (nach V1)

Laufendes Änderungsprotokoll aller Anpassungen nach dem V1-Stand. Neueste
Einträge stehen oben.

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
