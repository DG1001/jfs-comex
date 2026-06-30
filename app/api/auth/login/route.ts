import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Meldet einen bestehenden Account per Anzeigename + Passwort an und liefert
 * die Participant-ID zurück (z.B. für ein neues Gerät). Kein Rate-Limiting,
 * bewusst schlank gehalten.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; password?: unknown }
    | null;
  const name =
    body && typeof body.name === 'string'
      ? body.name.trim().replace(/\s+/g, ' ')
      : '';
  const password =
    body && typeof body.password === 'string' ? body.password.trim() : '';
  if (!name || !password) {
    return NextResponse.json(
      { error: 'Bitte Name und Passwort eingeben.' },
      { status: 400 },
    );
  }

  const row = getDb()
    .prepare<
      [string],
      { participant_id: string; name: string; password_hash: string | null }
    >(
      'SELECT participant_id, name, password_hash FROM participants WHERE name = ? COLLATE NOCASE',
    )
    .get(name);
  if (!row) {
    return NextResponse.json(
      { error: 'Kein Account mit diesem Namen gefunden.' },
      { status: 404 },
    );
  }
  if (!verifyPassword(password, row.password_hash)) {
    return NextResponse.json(
      { error: 'Passwort stimmt nicht.' },
      { status: 401 },
    );
  }
  return NextResponse.json({ participant_id: row.participant_id, name: row.name });
}
