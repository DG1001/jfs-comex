import type Database from 'better-sqlite3';
import { getDb } from './db';
import { loadConfig, cutoffTime } from './config';
import { getEffectiveMeetingPoints } from './meeting-points';
import type { MeetingPoint, Slot } from './types';

interface TopicRow {
  id: string;
  preferred_slots: string;
  interest_count: number;
}

interface AssignmentRow {
  slot_id: string;
  topic_id: string;
  meeting_point_id: string | null;
}

/**
 * Lazy trigger: for every slot whose cutoff has passed but which hasn't been
 * matched yet, run the matching algorithm once. Slots are processed in
 * chronological order so earlier assignments exclude topics from later slots.
 */
export function runDueMatchings(now: number = Date.now()): void {
  const cfg = loadConfig();
  const db = getDb();
  const ordered = [...cfg.slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  for (const slot of ordered) {
    if (cutoffTime(slot) > now) continue;
    const already = db
      .prepare('SELECT 1 FROM slot_matched WHERE slot_id = ?')
      .get(slot.id);
    if (already) continue;
    matchSlot(db, cfg.matching.min_interested, getEffectiveMeetingPoints(), slot, now);
  }
}

/**
 * Force-run matching for a single slot, bypassing the cutoff check.
 * No-op (ok:false) if the slot is already matched.
 */
export function forceMatchSlot(
  slotId: string,
  now: number = Date.now(),
): { ok: boolean; error?: string } {
  const cfg = loadConfig();
  const slot = cfg.slots.find(s => s.id === slotId);
  if (!slot) return { ok: false, error: 'Unbekannter Slot.' };
  const db = getDb();
  const already = db
    .prepare('SELECT 1 FROM slot_matched WHERE slot_id = ?')
    .get(slot.id);
  if (already) return { ok: false, error: 'Slot wurde bereits zugeteilt.' };
  matchSlot(db, cfg.matching.min_interested, getEffectiveMeetingPoints(), slot, now);
  return { ok: true };
}

function matchSlot(
  db: Database.Database,
  minInterested: number,
  meetingPoints: MeetingPoint[],
  slot: Slot,
  now: number,
): void {
  const tx = db.transaction(() => {
    // Re-check inside tx for idempotency under concurrent calls.
    if (db.prepare('SELECT 1 FROM slot_matched WHERE slot_id = ?').get(slot.id)) {
      return;
    }

    const topics = db
      .prepare<[], TopicRow>(
        `SELECT t.id, t.preferred_slots,
                (SELECT COUNT(*) FROM interests i WHERE i.topic_id = t.id) AS interest_count
         FROM topics t
         WHERE t.removed = 0`,
      )
      .all();

    const priorSuccess = new Set(
      db
        .prepare<[], AssignmentRow>(
          'SELECT topic_id FROM assignments WHERE meeting_point_id IS NOT NULL',
        )
        .all()
        .map(r => r.topic_id),
    );

    const eligible = topics
      .filter(t => !priorSuccess.has(t.id))
      .filter(t => t.interest_count >= minInterested)
      .map(t => ({
        id: t.id,
        interest_count: t.interest_count,
        preferred: JSON.parse(t.preferred_slots) as string[],
      }));

    // Zwischenlösung: Themen mit genau diesem Slot als Wunsch werden in diesem
    // Slot bevorzugt platziert — sie sollen nicht durch fremde Themen verdrängt
    // werden. Alle übrigen (ohne Wunsch ODER mit einem anderen Wunsch-Slot)
    // konkurrieren gleichberechtigt. Innerhalb beider Gruppen entscheidet die
    // Teilnehmerzahl (absteigend).
    const prefersThisSlot = (t: (typeof eligible)[number]): number =>
      t.preferred.includes(slot.id) ? 0 : 1;

    const sorted = [...eligible].sort((a, b) => {
      const p = prefersThisSlot(a) - prefersThisSlot(b);
      if (p !== 0) return p;
      return b.interest_count - a.interest_count;
    });

    const venues = meetingPoints
      .filter(v => v.slots.includes(slot.id))
      .sort((a, b) => b.capacity - a.capacity);

    const placed = sorted.slice(0, venues.length);
    const notPlaced = sorted.slice(venues.length);

    const placedByInterest = [...placed].sort(
      (a, b) => b.interest_count - a.interest_count,
    );

    const insert = db.prepare(
      `INSERT OR REPLACE INTO assignments
        (slot_id, topic_id, meeting_point_id, matched_at)
       VALUES (?, ?, ?, ?)`,
    );

    for (let i = 0; i < placedByInterest.length; i++) {
      insert.run(slot.id, placedByInterest[i].id, venues[i].id, now);
    }
    for (const t of notPlaced) {
      insert.run(slot.id, t.id, null, now);
    }

    db.prepare('INSERT INTO slot_matched (slot_id, matched_at) VALUES (?, ?)').run(
      slot.id,
      now,
    );
  });
  tx();
}
