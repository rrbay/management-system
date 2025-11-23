import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Mevcut TicketFlight tablosuna yeni kolonları ekler
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Yeni kolonları ekle
    await prisma.$executeRawUnsafe(`ALTER TABLE "TicketFlight" ADD COLUMN IF NOT EXISTS "passportExpiry" TIMESTAMP(3);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "TicketFlight" ADD COLUMN IF NOT EXISTS "citizenshipNo" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "TicketFlight" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;`);

    return NextResponse.json({ 
      success: true, 
      message: 'Kolonlar eklendi: passportExpiry, citizenshipNo, phoneNumber' 
    });
  } catch (err) {
    console.error('Alter columns error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
