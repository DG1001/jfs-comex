import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireParticipant, requireClaimedName } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const pid = requireParticipant(req);
  if (typeof pid !== 'string') return pid;

  const nameOrResp = requireClaimedName(pid);
  if (typeof nameOrResp !== 'string') return nameOrResp;
  const name = nameOrResp;

  const db = getDb();
  const topic = db
    .prepare<[string], { id: string }>('SELECT id FROM topics WHERE id = ? AND removed = 0')
    .get(params.id);
  if (!topic) {
    return NextResponse.json({ error: 'Thema nicht gefunden' }, { status: 404 });
  }

  db.prepare(
    `INSERT INTO interests (topic_id, participant_id, participant_name, joined_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(topic_id, participant_id) DO UPDATE SET participant_name = excluded.participant_name`,
  ).run(params.id, pid, name, Date.now());

  return NextResponse.json({ ok: true });
}
