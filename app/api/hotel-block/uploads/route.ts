import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Upload listesini döndür
export async function GET() {
  try {
    // @ts-ignore hotel block models
    const uploads = await prisma.hotelBlockUpload.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: { _count: { select: { reservations: true } } },
    });
    
    return NextResponse.json(uploads);
  } catch (err) {
    console.error('Hotel block uploads list error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
