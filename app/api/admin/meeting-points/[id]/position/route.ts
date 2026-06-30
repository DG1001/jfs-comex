import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { loadConfig } from '@/lib/config';
import { requireAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

interface Body {
  x?: unknown;
  y?: unknown;
}

function validCoord(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
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
  if (!body || !validCoord(body.x) || !validCoord(body.y)) {
    return NextResponse.json(
      { error: 'Body muss { x, y } mit Werten in [0, 1] enthalten.' },
      { status: 400 },
    );
  }

  getDb()
    .prepare(
      `INSERT INTO meeting_point_positions (meeting_point_id, x, y, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(meeting_point_id) DO UPDATE SET
         x = excluded.x, y = excluded.y, updated_at = excluded.updated_at`,
    )
    .run(params.id, body.x, body.y, Date.now());

  return NextResponse.json({ ok: true, x: body.x, y: body.y });
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
    .prepare('DELETE FROM meeting_point_positions WHERE meeting_point_id = ?')
    .run(params.id);

  return NextResponse.json({ ok: true, x: known.x, y: known.y });
}
