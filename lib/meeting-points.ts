import { getDb } from './db';
import { loadConfig } from './config';
import type { MeetingPoint } from './types';

export function getEffectiveMeetingPoints(): MeetingPoint[] {
  const cfg = loadConfig();
  const db = getDb();
  const posRows = db
    .prepare<[], { meeting_point_id: string; x: number; y: number }>(
      'SELECT meeting_point_id, x, y FROM meeting_point_positions',
    )
    .all();
  const posOverrides = new Map(
    posRows.map(r => [r.meeting_point_id, { x: r.x, y: r.y }]),
  );
  const slotRows = db
    .prepare<[], { meeting_point_id: string; slots_json: string }>(
      'SELECT meeting_point_id, slots_json FROM meeting_point_slots',
    )
    .all();
  const slotOverrides = new Map<string, string[]>();
  for (const r of slotRows) {
    try {
      const parsed = JSON.parse(r.slots_json) as unknown;
      if (Array.isArray(parsed) && parsed.every(s => typeof s === 'string')) {
        slotOverrides.set(r.meeting_point_id, parsed as string[]);
      }
    } catch {
      // defekter JSON-Eintrag → Config-Default verwenden
    }
  }
  return cfg.meeting_points.map(mp => {
    const pos = posOverrides.get(mp.id);
    const slots = slotOverrides.get(mp.id);
    return {
      ...mp,
      ...(pos ? { x: pos.x, y: pos.y } : {}),
      ...(slots ? { slots } : {}),
    };
  });
}
