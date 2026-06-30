import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

interface Body {
  recipient_participant_id?: unknown;
  body?: unknown;
}

function validBody(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  return t.length >= 1 && t.length <= 500;
}

/** Liste aller Admin → Teilnehmer Nachrichten (für die Admin-Übersicht). */
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const rows = getDb()
    .prepare<
      [],
      {
        id: number;
        recipient_participant_id: string;
        recipient_name: string;
        body: string;
        status: string;
        reply_body: string | null;
        created_at: number;
        resolved_at: number | null;
      }
    >(
      `SELECT m.id, m.recipient_participant_id, p.name AS recipient_name,
              m.body, m.status, m.reply_body, m.created_at, m.resolved_at
       FROM admin_messages m
       JOIN participants p ON p.participant_id = m.recipient_participant_id
       ORDER BY m.created_at DESC
       LIMIT 200`,
    )
    .all();

  return NextResponse.json({ messages: rows });
}

/** Sendet eine neue Nachricht an einen Teilnehmer. */
export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (
    !body ||
    typeof body.recipient_participant_id !== 'string' ||
    !validBody(body.body)
  ) {
    return NextResponse.json(
      { error: 'Body muss { recipient_participant_id, body (1–500 Zeichen) } enthalten.' },
      { status: 400 },
    );
  }
  const text = (body.body as string).trim();
  const recipient = body.recipient_participant_id;

  const db = getDb();
  const exists = db
    .prepare('SELECT 1 FROM participants WHERE participant_id = ?')
    .get(recipient);
  if (!exists) {
    return NextResponse.json(
      { error: 'Teilnehmer nicht gefunden.' },
      { status: 404 },
    );
  }
  const res = db
    .prepare(
      `INSERT INTO admin_messages (recipient_participant_id, body, status, created_at)
       VALUES (?, ?, 'unread', ?)`,
    )
    .run(recipient, text, Date.now());

  return NextResponse.json(
    { ok: true, id: Number(res.lastInsertRowid) },
    { status: 201 },
  );
}
