import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireParticipant } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Eigene ungelesene Admin-Nachrichten. Sortiert nach Alter (älteste zuerst —
 * sodass die App-Modal-Queue chronologisch abgearbeitet wird).
 */
export async function GET(req: NextRequest) {
  const pidOrResp = requireParticipant(req);
  if (typeof pidOrResp !== 'string') return pidOrResp;
  const pid = pidOrResp;

  const rows = getDb()
    .prepare<
      [string],
      { id: number; body: string; created_at: number }
    >(
      `SELECT id, body, created_at FROM admin_messages
       WHERE recipient_participant_id = ? AND status = 'unread'
       ORDER BY created_at ASC`,
    )
    .all(pid);

  return NextResponse.json({ messages: rows });
}
