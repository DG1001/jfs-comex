import { getDb } from './db';
import { loadConfig } from './config';
import { runDueMatchings } from './matching';
import type { Topic, SlotStatus } from './types';

interface TopicRow {
  id: string;
  title: string;
  description: string | null;
  owner_name: string;
  owner_id: string;
  preferred_slots: string;
  created_at: number;
  removed: number;
  interest_count: number;
  is_owner: number;
  is_interested: number;
}

interface AssignmentRow {
  slot_id: string;
  topic_id: string;
  meeting_point_id: string | null;
  matched_at: number;
}

export function listTopics(participantId: string | null): Topic[] {
  runDueMatchings();
  const db = getDb();
  const rows = db
    .prepare<[string | null, string | null], TopicRow>(
      `SELECT t.id, t.title, t.description, t.owner_name, t.owner_id,
              t.preferred_slots, t.created_at, t.removed,
              (SELECT COUNT(*) FROM interests i WHERE i.topic_id = t.id) AS interest_count,
              CASE WHEN t.owner_id = ? THEN 1 ELSE 0 END AS is_owner,
              CASE WHEN EXISTS(SELECT 1 FROM interests i2
                WHERE i2.topic_id = t.id AND i2.participant_id = ?)
                THEN 1 ELSE 0 END AS is_interested
       FROM topics t
       WHERE t.removed = 0
       ORDER BY interest_count DESC, t.created_at DESC`,
    )
    .all(participantId, participantId);

  const assignments = db
    .prepare<[], AssignmentRow>(
      'SELECT slot_id, topic_id, meeting_point_id, matched_at FROM assignments',
    )
    .all();
  const byTopic = new Map<string, AssignmentRow>();
  for (const a of assignments) {
    const prev = byTopic.get(a.topic_id);
    if (a.meeting_point_id && (!prev || !prev.meeting_point_id)) {
      byTopic.set(a.topic_id, a);
    } else if (!prev) {
      byTopic.set(a.topic_id, a);
    }
  }

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    owner_name: r.owner_name,
    preferred_slots: JSON.parse(r.preferred_slots),
    created_at: r.created_at,
    removed: r.removed,
    interest_count: r.interest_count,
    is_owner: r.is_owner === 1,
    is_interested: r.is_interested === 1,
    assignment: byTopic.get(r.id)
      ? {
          slot_id: byTopic.get(r.id)!.slot_id,
          topic_id: r.id,
          meeting_point_id: byTopic.get(r.id)!.meeting_point_id,
          matched_at: byTopic.get(r.id)!.matched_at,
        }
      : null,
  }));
}

export function getSlotStatuses(): SlotStatus[] {
  runDueMatchings();
  const cfg = loadConfig();
  const db = getDb();
  const now = Date.now();

  const matchedRows = db
    .prepare<[], { slot_id: string }>('SELECT slot_id FROM slot_matched')
    .all();
  const matchedSet = new Set(matchedRows.map(r => r.slot_id));

  const assignRows = db
    .prepare<
      [],
      {
        slot_id: string;
        topic_id: string;
        topic_title: string;
        meeting_point_id: string | null;
        interest_count: number;
      }
    >(
      `SELECT a.slot_id, a.topic_id, t.title AS topic_title, a.meeting_point_id,
              (SELECT COUNT(*) FROM interests i WHERE i.topic_id = a.topic_id) AS interest_count
       FROM assignments a
       JOIN topics t ON t.id = a.topic_id
       WHERE t.removed = 0`,
    )
    .all();

  const mpName = new Map(cfg.meeting_points.map(mp => [mp.id, mp.name]));

  return [...cfg.slots]
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .map(slot => ({
      slot,
      cutoffPassed: new Date(slot.start).getTime() - slot.cutoff_minutes * 60_000 <= now,
      matched: matchedSet.has(slot.id),
      assignments: assignRows
        .filter(a => a.slot_id === slot.id && a.meeting_point_id !== null)
        .map(a => ({
          topic_id: a.topic_id,
          topic_title: a.topic_title,
          meeting_point_id: a.meeting_point_id,
          meeting_point_name: a.meeting_point_id
            ? mpName.get(a.meeting_point_id) ?? null
            : null,
          interest_count: a.interest_count,
        }))
        .sort((a, b) => b.interest_count - a.interest_count),
    }));
}
