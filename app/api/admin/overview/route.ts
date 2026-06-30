import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { loadConfig } from '@/lib/config';
import { requireAdmin } from '@/lib/http';
import { getSlotStatuses, listTopics } from '@/lib/queries';
import { getEffectiveMeetingPoints } from '@/lib/meeting-points';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const topics = listTopics(null);
  const removed = db
    .prepare<
      [],
      {
        id: string;
        title: string;
        owner_name: string;
        created_at: number;
      }
    >(
      `SELECT id, title, owner_name, created_at FROM topics
       WHERE removed = 1 ORDER BY created_at DESC LIMIT 50`,
    )
    .all();

  const interestRows = db
    .prepare<
      [],
      { topic_id: string; participant_name: string; joined_at: number }
    >(
      `SELECT i.topic_id, i.participant_name, i.joined_at
       FROM interests i
       JOIN topics t ON t.id = i.topic_id
       WHERE t.removed = 0
       ORDER BY i.joined_at ASC`,
    )
    .all();

  const participants: Record<string, Array<{ name: string; joined_at: number }>> = {};
  for (const r of interestRows) {
    (participants[r.topic_id] ??= []).push({
      name: r.participant_name,
      joined_at: r.joined_at,
    });
  }

  // Alle registrierten Teilnehmer — für die Passwort-Verwaltung im Admin.
  const participantsAll = db
    .prepare<
      [],
      {
        participant_id: string;
        name: string;
        claimed_at: number;
        password_hash: string | null;
      }
    >(
      `SELECT participant_id, name, claimed_at, password_hash
       FROM participants ORDER BY name COLLATE NOCASE`,
    )
    .all()
    .map(p => ({
      participant_id: p.participant_id,
      name: p.name,
      claimed_at: p.claimed_at,
      has_password: !!p.password_hash,
    }));

  return NextResponse.json({
    topics,
    participants,
    participants_all: participantsAll,
    removed,
    slots: getSlotStatuses(),
    map: { plan: loadConfig().map.plan, marker_box: loadConfig().map.marker_box },
    meeting_points: getEffectiveMeetingPoints(),
  });
}
