import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Tüm hotel blokaj yüklemelerini ve rezervasyonlarını temizle
export async function POST() {
  try {
    // @ts-ignore hotel block models
    await prisma.hotelBlockReservation.deleteMany({});
    // @ts-ignore hotel block models
    await prisma.hotelBlockUpload.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
