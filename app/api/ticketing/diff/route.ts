import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { diffFlights } from '@/lib/ticketing-diff';
import { groupFlights } from '@/lib/ticketing-parse';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // @ts-ignore after prisma generate
    const uploads = await prisma.ticketUpload.findMany({ orderBy: { uploadedAt: 'desc' }, take: 2, include: { flights: true } });
    if (uploads.length === 0) return NextResponse.json({ diff: null, message: 'No uploads yet' });
    const curr = uploads[0];
    const prev = uploads[1];

    const currGroups = groupFlights(curr.flights as any);
    const prevGroups = prev ? groupFlights(prev.flights as any) : [];
    const diff = diffFlights(prevGroups, currGroups);
    return NextResponse.json({ diff, currUploadId: curr.id, prevUploadId: prev?.id || null });
  } catch (err) {
    console.error('Ticket diff error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
