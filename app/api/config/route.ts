import { NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { getEffectiveMeetingPoints } from '@/lib/meeting-points';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = loadConfig();
  return NextResponse.json({
    event: cfg.event,
    map: {
      plan: cfg.map.plan,
      marker_box: cfg.map.marker_box,
      connector: cfg.map.connector,
    },
    meeting_points: getEffectiveMeetingPoints(),
    slots: cfg.slots,
    min_interested: cfg.matching.min_interested,
  });
}
