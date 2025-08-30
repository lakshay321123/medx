import { NextRequest, NextResponse } from 'next/server';
import { fetchCtgovDetails } from '@/addons/trials/ctgov';

export const runtime = 'edge';

export async function GET(_req: NextRequest, ctx: { params: { nctId: string } }) {
  try {
    const nctId = (ctx.params?.nctId || '').toUpperCase();
    if (!/^NCT\d{8}$/.test(nctId)) return NextResponse.json({ error: 'Invalid NCT ID' }, { status: 400 });
    const details = await fetchCtgovDetails(nctId);
    return NextResponse.json(details);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
