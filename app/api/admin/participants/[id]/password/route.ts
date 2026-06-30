import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { requireAdmin, validPassword } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Admin-Funktion für den Infostand: setzt ein neues Passwort für einen
 * Teilnehmer (z.B. wenn er sein Passwort vergessen hat). Der Admin teilt das
 * neue Passwort dem Teilnehmer mündlich mit.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = (await req.json().catch(() => null)) as
    | { password?: unknown }
    | null;
  if (!body || !validPassword(body.password)) {
    return NextResponse.json(
      { error: 'Passwort muss mindestens 4 Zeichen haben.' },
      { status: 400 },
    );
  }

  const db = getDb();
  const exists = db
    .prepare('SELECT 1 FROM participants WHERE participant_id = ?')
    .get(params.id);
  if (!exists) {
    return NextResponse.json(
      { error: 'Teilnehmer nicht gefunden.' },
      { status: 404 },
    );
  }
  db.prepare('UPDATE participants SET password_hash = ? WHERE participant_id = ?').run(
    hashPassword((body.password as string).trim()),
    params.id,
  );
  return NextResponse.json({ ok: true });
}
