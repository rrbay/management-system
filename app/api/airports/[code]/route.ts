import { NextResponse } from 'next/server';
import { airportInfoWithOffsetDynamic } from '@/lib/airports-dynamic';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  try {
    const info = await airportInfoWithOffsetDynamic(params.code);
    if (!info) {
      return NextResponse.json({ error: 'Airport not found' }, { status: 404 });
    }
    return NextResponse.json(info);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
