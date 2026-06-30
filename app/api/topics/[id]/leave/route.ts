import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireParticipant } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const pid = requireParticipant(req);
  if (typeof pid !== 'string') return pid;

  const db = getDb();
  const topic = db
    .prepare<[string], { owner_id: string }>('SELECT owner_id FROM topics WHERE id = ? AND removed = 0')
    .get(params.id);
  if (!topic) {
    return NextResponse.json({ error: 'Thema nicht gefunden' }, { status: 404 });
  }
  if (topic.owner_id === pid) {
    return NextResponse.json(
      { error: 'Als Themen-Owner kannst du deinen eigenen Beitritt nicht zurückziehen. Lösche ggf. das Thema.' },
      { status: 400 },
    );
  }
  db.prepare(
    'DELETE FROM interests WHERE topic_id = ? AND participant_id = ?',
  ).run(params.id, pid);

  return NextResponse.json({ ok: true });
}
