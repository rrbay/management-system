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

    // Veritabanından gelen verileri NormalizedTicketRow formatına dönüştür
    const normalizedRows = upload.flights.map((f: any) => ({
      pairingRoute: f.pairingRoute,
      flightNumber: f.flightNumber,
      airline: f.airline,
      depDateTime: f.depDateTime ? new Date(f.depDateTime) : null,
      arrDateTime: f.arrDateTime ? new Date(f.arrDateTime) : null,
      depPort: f.depPort,
      arrPort: f.arrPort,
      crewName: f.crewName,
      rank: f.rank,
      nationality: f.nationality,
      passportNumber: f.passportNumber,
      dateOfBirth: f.dateOfBirth ? new Date(f.dateOfBirth) : null,
      gender: f.gender,
      status: f.status,
      raw: f.rawData || {},
    }));

    const groups = groupFlights(normalizedRows);
    const email = buildEmailDraft(groups);
    return NextResponse.json({ email, groupCount: groups.length });
  } catch (err) {
    console.error('Ticket draft error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
