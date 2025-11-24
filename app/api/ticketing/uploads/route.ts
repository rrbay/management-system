import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Upload sayısını ve listesini getir
export async function GET() {
  try {
    const uploads = await prisma.ticketUpload.findMany({
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        uploadedAt: true,
        _count: {
          select: { flights: true }
        }
      }
    });

    return NextResponse.json(uploads);
  } catch (error: any) {
    console.error('Uploads fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Yüklemeler getirilemedi' },
      { status: 500 }
    );
  }
}
