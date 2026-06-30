import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireParticipant } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** "Komme am Info-Stand vorbei" — markiert die Nachricht als persönlich geklärt. */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const pidOrResp = requireParticipant(req);
  if (typeof pidOrResp !== 'string') return pidOrResp;
  const pid = pidOrResp;

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare<[number, string], { id: number; status: string }>(
      `SELECT id, status FROM admin_messages
       WHERE id = ? AND recipient_participant_id = ?`,
    )
    .get(id, pid);
  if (!row) {
    return NextResponse.json({ error: 'Nachricht nicht gefunden.' }, { status: 404 });
  }
  if (row.status !== 'unread') {
    return NextResponse.json(
      { error: 'Nachricht wurde bereits geklärt.' },
      { status: 409 },
    );
  }
  db.prepare(
    `UPDATE admin_messages
     SET status = 'dismissed', resolved_at = ?
     WHERE id = ?`,
  ).run(Date.now(), id);

  return NextResponse.json({ ok: true });
}
