import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Mehmet Saltuk Candan'ı bul
    const members = await prisma.crewMember.findMany({
      where: {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        rawData: true,
      },
      take: 5,
    });

    const debugInfo = members.map(m => ({
      id: m.id,
      fullName: m.fullName,
      firstName: m.firstName,
      lastName: m.lastName,
      rawDataKeys: Object.keys(m.rawData || {}),
      rawDataSample: m.rawData,
    }));

    return NextResponse.json({
      success: true,
      count: members.length,
      members: debugInfo,
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debug info' },
      { status: 500 }
    );
  }
}
