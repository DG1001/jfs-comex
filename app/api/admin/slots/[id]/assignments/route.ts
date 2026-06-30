import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { loadConfig } from '@/lib/config';
import { getEffectiveMeetingPoints } from '@/lib/meeting-points';
import { requireAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

interface Body {
  meeting_points?: Record<string, string | null>;
}

/**
 * Manuelle Zuweisung pro Slot. Body:
 *   { meeting_points: { "stand-3": "topic-uuid", "stand-5": null, ... } }
 *
 * Keys müssen Treffpunkte sein, die für diesen Slot konfiguriert sind; `null`
 * bedeutet „leer lassen". Ein Thema darf nur einmal vorkommen. Bestehende
 * platzierte Zuweisungen für diesen Slot werden ersetzt; "kein Match"-Hinweise
 * (meeting_point_id IS NULL) aus einem vorherigen Auto-Matching bleiben
 * erhalten, es sei denn, das Thema wird nun manuell platziert.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const cfg = loadConfig();
  const slot = cfg.slots.find(s => s.id === params.id);
  if (!slot) {
    return NextResponse.json({ error: 'Unbekannter Slot.' }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body.meeting_points !== 'object' || body.meeting_points === null) {
    return NextResponse.json(
      { error: 'Body muss { meeting_points: {...} } enthalten.' },
      { status: 400 },
    );
  }

  const slotMpIds = new Set(
    getEffectiveMeetingPoints()
      .filter(mp => mp.slots.includes(slot.id))
      .map(mp => mp.id),
  );

  const db = getDb();
  const knownTopics = new Set(
    db
      .prepare<[], { id: string }>('SELECT id FROM topics WHERE removed = 0')
      .all()
      .map(r => r.id),
  );

  const seenTopics = new Set<string>();
  const entries: Array<{ meeting_point_id: string; topic_id: string | null }> = [];
  for (const [mpId, topicId] of Object.entries(body.meeting_points)) {
    if (!slotMpIds.has(mpId)) {
      return NextResponse.json(
        { error: `Treffpunkt ${mpId} ist in diesem Slot nicht verfügbar.` },
        { status: 400 },
      );
    }
    if (topicId !== null) {
      if (typeof topicId !== 'string' || !knownTopics.has(topicId)) {
        return NextResponse.json(
          { error: `Unbekanntes Thema: ${topicId}` },
          { status: 400 },
        );
      }
      if (seenTopics.has(topicId)) {
        return NextResponse.json(
          { error: 'Ein Thema darf nur einem Treffpunkt zugewiesen sein.' },
          { status: 400 },
        );
      }
      seenTopics.add(topicId);
    }
    entries.push({ meeting_point_id: mpId, topic_id: topicId });
  }

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare(
      'DELETE FROM assignments WHERE slot_id = ? AND meeting_point_id IS NOT NULL',
    ).run(slot.id);
    const insert = db.prepare(
      `INSERT OR REPLACE INTO assignments
        (slot_id, topic_id, meeting_point_id, matched_at)
       VALUES (?, ?, ?, ?)`,
    );
    for (const e of entries) {
      if (e.topic_id) insert.run(slot.id, e.topic_id, e.meeting_point_id, now);
    }
    db.prepare(
      `INSERT INTO slot_matched (slot_id, matched_at) VALUES (?, ?)
       ON CONFLICT(slot_id) DO UPDATE SET matched_at = excluded.matched_at`,
    ).run(slot.id, now);
  });
  tx();

  return NextResponse.json({ ok: true });
}
