import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { validDisplayName, validPassword } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Legt einen neuen Account an: eindeutiger Anzeigename + Passwort. Die
 * Participant-ID wird serverseitig erzeugt und zurückgegeben — der Client
 * speichert sie als Login-Geheimnis im localStorage.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; password?: unknown }
    | null;
  if (!body || !validDisplayName(body.name)) {
    return NextResponse.json(
      { error: 'Anzeigename wirkt zu generisch oder ist zu kurz.' },
      { status: 400 },
    );
  }
  if (!validPassword(body.password)) {
    return NextResponse.json(
      { error: 'Passwort muss mindestens 4 Zeichen haben.' },
      { status: 400 },
    );
  }
  const name = (body.name as string).trim().replace(/\s+/g, ' ');
  const password = (body.password as string).trim();

  const db = getDb();
  const taken = db
    .prepare('SELECT 1 FROM participants WHERE name = ? COLLATE NOCASE')
    .get(name);
  if (taken) {
    return NextResponse.json(
      {
        error:
          'Name ist schon vergeben — bitte einen anderen wählen oder dich anmelden.',
      },
      { status: 409 },
    );
  }

  const participantId = randomUUID().replace(/-/g, '');
  try {
    db.prepare(
      `INSERT INTO participants (participant_id, name, claimed_at, password_hash)
       VALUES (?, ?, ?, ?)`,
    ).run(participantId, name, Date.now(), hashPassword(password));
  } catch {
    // Unique-Index auf name greift bei einer Kollision im selben Moment.
    return NextResponse.json(
      { error: 'Name ist schon vergeben — bitte einen anderen wählen.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ participant_id: participantId, name });
}
