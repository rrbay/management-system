import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [crewMembers, total] = await Promise.all([
      prisma.crewMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          import: {
            select: {
              filename: true,
              uploadedAt: true,
            },
          },
        },
      }),
      prisma.crewMember.count({ where }),
    ]);

    return NextResponse.json({ 
      data: crewMembers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching crew:', err);
    return NextResponse.json({ data: [], error: String(err) }, { status: 500 });
  }
}
