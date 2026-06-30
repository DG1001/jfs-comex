import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getParticipantId } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Prüft die im Browser gespeicherte Participant-ID und liefert den
 * zugehörigen Anzeigenamen. Dient dem automatischen Einloggen beim Laden der
 * App. 401, wenn die ID unbekannt ist (→ Login/Registrierung nötig).
 */
export async function GET(req: NextRequest) {
  const pid = getParticipantId(req);
  if (!pid) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }
  const row = getDb()
    .prepare<[string], { name: string }>(
      'SELECT name FROM participants WHERE participant_id = ?',
    )
    .get(pid);
  if (!row) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }
  return NextResponse.json({ name: row.name });
}
