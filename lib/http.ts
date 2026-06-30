import { NextRequest, NextResponse } from 'next/server';
import { getDb } from './db';

export function getParticipantId(req: NextRequest): string | null {
  const h = req.headers.get('x-participant-id');
  if (!h) return null;
  const v = h.trim();
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(v)) return null;
  return v;
}

export function requireParticipant(req: NextRequest): string | NextResponse {
  const pid = getParticipantId(req);
  if (!pid) {
    return NextResponse.json(
      { error: 'Participant ID missing or invalid' },
      { status: 400 },
    );
  }
  return pid;
}

/**
 * Liefert den claimed Anzeigenamen für die Participant-ID oder eine 400-Response,
 * wenn der Teilnehmer noch keinen Namen reserviert hat.
 */
export function requireClaimedName(pid: string): string | NextResponse {
  const row = getDb()
    .prepare<[string], { name: string }>(
      'SELECT name FROM participants WHERE participant_id = ?',
    )
    .get(pid);
  if (!row) {
    return NextResponse.json(
      { error: 'Bitte zuerst einen Anzeigenamen wählen.' },
      { status: 400 },
    );
  }
  return row.name;
}

export function requireAdmin(req: NextRequest): NextResponse | null {
  const token = req.headers.get('x-admin-token') ?? '';
  const expected = process.env.BOF_ADMIN_TOKEN ?? '';
  if (!expected) {
    return NextResponse.json(
      { error: 'Admin token not configured on server' },
      { status: 500 },
    );
  }
  if (token !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export function validDisplayName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 40) return false;
  if (!/[a-zA-ZäöüÄÖÜß]/.test(trimmed)) return false;
  if (/^(.)\1{2,}$/.test(trimmed)) return false;
  const banned = ['abc', 'xyz', 'test', '123', 'asdf'];
  if (banned.includes(trimmed.toLowerCase())) return false;
  return true;
}

export function validTitle(t: unknown): t is string {
  if (typeof t !== 'string') return false;
  const s = t.trim();
  return s.length >= 4 && s.length <= 120;
}

/**
 * Bewusst minimale Passwort-Regel: mindestens 4 Zeichen (eine 4-stellige PIN
 * genügt), keine Komplexitätsvorgaben. Vorn/hinten getrimmt geprüft.
 */
export function validPassword(p: unknown): p is string {
  if (typeof p !== 'string') return false;
  const s = p.trim();
  return s.length >= 4 && s.length <= 64;
}
