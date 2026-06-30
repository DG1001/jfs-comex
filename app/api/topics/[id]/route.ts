import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireParticipant } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Topic-Owner darf vor dem Cutoff sein eigenes Thema wieder entfernen.
 * Nach erfolgter Zuteilung nicht mehr (um Treffpunkte nicht leer laufen zu lassen).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const pid = requireParticipant(req);
  if (typeof pid !== 'string') return pid;

  const db = getDb();
  const row = db
    .prepare<[string], { owner_id: string }>(
      'SELECT owner_id FROM topics WHERE id = ? AND removed = 0',
    )
    .get(params.id);
  if (!row) {
    return NextResponse.json({ error: 'Thema nicht gefunden' }, { status: 404 });
  }
  if (row.owner_id !== pid) {
    return NextResponse.json(
      { error: 'Nur der Themen-Owner darf das Thema löschen.' },
      { status: 403 },
    );
  }
  const assigned = db
    .prepare<[string], { c: number }>(
      'SELECT COUNT(*) AS c FROM assignments WHERE topic_id = ? AND meeting_point_id IS NOT NULL',
    )
    .get(params.id);
  if (assigned && assigned.c > 0) {
    return NextResponse.json(
      { error: 'Thema wurde bereits zugeteilt und kann nicht mehr gelöscht werden.' },
      { status: 400 },
    );
  }
  db.prepare('UPDATE topics SET removed = 1 WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
