import { NextRequest, NextResponse } from 'next/server';
import { forceMatchSlot } from '@/lib/matching';
import { requireAdmin } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const result = forceMatchSlot(params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
