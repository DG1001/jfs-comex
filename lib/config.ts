import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import type { AppConfig, Slot } from './types';

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const configPath = process.env.BOF_CONFIG_PATH
    ?? path.join(process.cwd(), 'config.yaml');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = parse(raw) as AppConfig;
  validate(parsed);
  cached = parsed;
  return parsed;
}

function validate(c: AppConfig): void {
  if (!c.slots?.length) throw new Error('config: slots missing');
  if (!c.map?.plan) throw new Error('config: map.plan missing');
  if (!c.map?.marker_box) throw new Error('config: map.marker_box missing');
  const mb = c.map.marker_box;
  for (const k of ['x', 'y', 'w', 'h'] as const) {
    if (typeof mb[k] !== 'number' || !Number.isFinite(mb[k])) {
      throw new Error(`config: map.marker_box.${k} muss eine Zahl sein`);
    }
  }
  if (c.map.connector) {
    for (const end of ['from', 'to'] as const) {
      const p = c.map.connector[end];
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') {
        throw new Error(`config: map.connector.${end} braucht {x, y} (Zahlen)`);
      }
    }
  }
  if (!c.meeting_points?.length) throw new Error('config: meeting_points missing');
  const slotIds = new Set(c.slots.map(s => s.id));
  for (const mp of c.meeting_points) {
    for (const sid of mp.slots) {
      if (!slotIds.has(sid)) {
        throw new Error(`config: meeting_point ${mp.id} references unknown slot ${sid}`);
      }
    }
  }
}

export function cutoffTime(slot: Slot): number {
  return new Date(slot.start).getTime() - slot.cutoff_minutes * 60_000;
}

export function slotStartTime(slot: Slot): number {
  return new Date(slot.start).getTime();
}

export function slotEndTime(slot: Slot): number {
  return new Date(slot.end).getTime();
}
