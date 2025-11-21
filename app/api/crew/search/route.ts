import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const field = searchParams.get('field'); // specific field to search in
    
    if (!query) {
      return NextResponse.json({ data: [] });
    }

    // Search in rawData JSON field
    const results = await prisma.crewMember.findMany({
      where: {
        OR: [
          { employeeCode: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { passportNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ 
      data: results,
      count: results.length 
    });
  } catch (err) {
    console.error('Error searching crew:', err);
    return NextResponse.json({ data: [], error: String(err) }, { status: 500 });
  }
}
