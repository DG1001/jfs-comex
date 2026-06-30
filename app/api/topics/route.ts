import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { loadConfig, cutoffTime } from '@/lib/config';
import { listTopics } from '@/lib/queries';
import {
  getParticipantId,
  requireParticipant,
  requireClaimedName,
  validTitle,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pid = getParticipantId(req);
  return NextResponse.json({ topics: listTopics(pid) });
}

export async function POST(req: NextRequest) {
  const pid = requireParticipant(req);
  if (typeof pid !== 'string') return pid;

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    description?: unknown;
    preferred_slots?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!validTitle(body.title)) {
    return NextResponse.json(
      { error: 'Titel zu kurz oder zu lang (4–120 Zeichen)' },
      { status: 400 },
    );
  }
  const ownerNameOrResp = requireClaimedName(pid);
  if (typeof ownerNameOrResp !== 'string') return ownerNameOrResp;
  const ownerName = ownerNameOrResp;
  const description =
    typeof body.description === 'string' && body.description.trim().length > 0
      ? body.description.trim().slice(0, 600)
      : null;

  const cfg = loadConfig();
  const knownSlots = new Set(cfg.slots.map(s => s.id));
  const preferred = Array.isArray(body.preferred_slots)
    ? (body.preferred_slots as unknown[])
        .filter((s): s is string => typeof s === 'string' && knownSlots.has(s))
    : [];

  // Reject preferred slots whose cutoff has already passed — otherwise the
  // user's preference is pointless.
  const now = Date.now();
  const stillOpen = preferred.filter(sid => {
    const s = cfg.slots.find(x => x.id === sid)!;
    return cutoffTime(s) > now;
  });

  const db = getDb();
  const id = randomUUID();
  const title = (body.title as string).trim();

  const insertTopic = db.prepare(
    `INSERT INTO topics (id, title, description, owner_name, owner_id, preferred_slots, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertInterest = db.prepare(
    `INSERT INTO interests (topic_id, participant_id, participant_name, joined_at)
     VALUES (?, ?, ?, ?)`,
  );
  const tx = db.transaction(() => {
    insertTopic.run(id, title, description, ownerName, pid, JSON.stringify(stillOpen), now);
    insertInterest.run(id, pid, ownerName, now);
  });
  tx();

  return NextResponse.json({ id }, { status: 201 });
}
