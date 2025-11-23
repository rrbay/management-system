import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Mevcut TicketFlight ve TicketUpload tablolarını sil
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Tabloları sil
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "TicketFlight" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "TicketUpload" CASCADE;`);

    return NextResponse.json({ 
      success: true, 
      message: 'TicketFlight ve TicketUpload tabloları silindi' 
    });
  } catch (err) {
    console.error('Drop tables error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
