import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireParticipant } from '@/lib/http';

export const dynamic = 'force-dynamic';

interface Body {
  body?: unknown;
}

/** Kurz-Antwort auf eine Admin-Nachricht. */
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

  const body = (await req.json().catch(() => null)) as Body | null;
  const reply = typeof body?.body === 'string' ? body.body.trim() : '';
  if (reply.length < 1 || reply.length > 500) {
    return NextResponse.json(
      { error: 'Antwort muss 1–500 Zeichen lang sein.' },
      { status: 400 },
    );
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
      { error: 'Nachricht wurde bereits beantwortet.' },
      { status: 409 },
    );
  }
  db.prepare(
    `UPDATE admin_messages
     SET status = 'replied', reply_body = ?, resolved_at = ?
     WHERE id = ?`,
  ).run(reply, Date.now(), id);

  return NextResponse.json({ ok: true });
}
