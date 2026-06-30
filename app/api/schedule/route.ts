import { NextResponse } from 'next/server';
import { getSlotStatuses } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ slots: getSlotStatuses(), now: Date.now() });
}
