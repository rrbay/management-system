import { NextResponse } from 'next/server';
import { airportInfoWithOffsetDynamic } from '@/lib/airports-dynamic';

export const runtime = 'nodejs';

// Next.js 16 route signature for dynamic params may wrap params in a Promise.
// Bu nedenle context.params'i await ediyoruz.
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const info = await airportInfoWithOffsetDynamic(code);
    if (!info) {
      return NextResponse.json({ error: 'Airport not found' }, { status: 404 });
    }
    return NextResponse.json(info);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
