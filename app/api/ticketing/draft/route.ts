import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { groupFlights } from '@/lib/ticketing-parse';
import { buildEmailDraft } from '@/lib/mail-ticketing-template';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    if (!uploadId) return NextResponse.json({ error: 'uploadId required' }, { status: 400 });

    // @ts-ignore after prisma generate
    const upload = await prisma.ticketUpload.findUnique({ where: { id: uploadId }, include: { flights: true } });
    if (!upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

    const groups = groupFlights(upload.flights as any);
    const email = buildEmailDraft(groups);
    return NextResponse.json({ email, groupCount: groups.length });
  } catch (err) {
    console.error('Ticket draft error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
