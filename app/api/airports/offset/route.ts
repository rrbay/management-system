import { NextResponse } from 'next/server';
import { airportInfoWithOffsetDynamic } from '@/lib/airports-dynamic';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const at = searchParams.get('at'); // ISO UTC tarih opsiyonel
    if (!code) {
      return NextResponse.json({ error: 'code query param required' }, { status: 400 });
    }
    const date = at ? new Date(at) : new Date();
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    const info = await airportInfoWithOffsetDynamic(code, date);
    if (!info) {
      return NextResponse.json({ error: 'Airport not found' }, { status: 404 });
    }
    return NextResponse.json(info);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
