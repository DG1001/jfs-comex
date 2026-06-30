import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { loadConfig } from '@/lib/config';
import { requireAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

interface Body {
  slots?: unknown;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const cfg = loadConfig();
  const known = cfg.meeting_points.find(mp => mp.id === params.id);
  if (!known) {
    return NextResponse.json({ error: 'Unbekannter Treffpunkt.' }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !Array.isArray(body.slots)) {
    return NextResponse.json(
      { error: 'Body muss { slots: string[] } enthalten.' },
      { status: 400 },
    );
  }
  const knownSlotIds = new Set(cfg.slots.map(s => s.id));
  const unique = Array.from(new Set(body.slots));
  if (!unique.every(s => typeof s === 'string' && knownSlotIds.has(s))) {
    return NextResponse.json(
      { error: 'Unbekannte Slot-ID in der Liste.' },
      { status: 400 },
    );
  }

  getDb()
    .prepare(
      `INSERT INTO meeting_point_slots (meeting_point_id, slots_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(meeting_point_id) DO UPDATE SET
         slots_json = excluded.slots_json, updated_at = excluded.updated_at`,
    )
    .run(params.id, JSON.stringify(unique), Date.now());

  return NextResponse.json({ ok: true, slots: unique });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const cfg = loadConfig();
  const known = cfg.meeting_points.find(mp => mp.id === params.id);
  if (!known) {
    return NextResponse.json({ error: 'Unbekannter Treffpunkt.' }, { status: 404 });
  }

  getDb()
    .prepare('DELETE FROM meeting_point_slots WHERE meeting_point_id = ?')
    .run(params.id);

  return NextResponse.json({ ok: true, slots: known.slots });
}
