import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Debug endpoint: Crew verilerini kontrol et
export async function GET() {
  try {
    // CrewMember tablosundan örnek veri çek
    const crewCount = await prisma.crewMember.count();
    const sampleCrew = await prisma.crewMember.findMany({
      take: 5,
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        nationality: true,
        passportNumber: true,
        passportExpiry: true,
        phone: true,
        position: true,
        rawData: true,
      }
    });

    // Tablo yapısını kontrol et
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    // CrewMember kolonlarını kontrol et
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'CrewMember'
      ORDER BY ordinal_position;
    `;

    return NextResponse.json({
      crewCount,
      sampleCrew,
      tables,
      crewMemberColumns: columns,
      message: 'Database debug info'
    });
  } catch (err: any) {
    console.error('Debug crew error', err);
    return NextResponse.json({ 
      error: String(err),
      code: err?.code,
      meta: err?.meta 
    }, { status: 500 });
  }
}
