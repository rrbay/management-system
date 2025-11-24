import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { groupFlights } from '@/lib/ticketing-parse';
import { buildEmailDraft } from '@/lib/mail-ticketing-template';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    const debug = searchParams.get('debug');
    if (!uploadId) return NextResponse.json({ error: 'uploadId required' }, { status: 400 });

    // Uçuşları ve eşleşmiş crewMember verisini çek
    // @ts-ignore after prisma generate
    const upload = await prisma.ticketUpload.findUnique({ where: { id: uploadId }, include: { flights: { include: { crewMember: true } } } });
    if (!upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

    // Eksik alanları uçuş anında doldurmamışsak burada zenginleştir.
    const normalizedRows = upload.flights.map((f: any) => {
      const raw = f.rawData || {};
      const crew = f.crewMember;

      // Crew fallback verileri
      const passportExpiry = raw._crewPassportExpiry || crew?.passportExpiry || crew?.rawData?.['Valid Until'] || crew?.rawData?.['VALID UNTIL'];
      const citizenshipNo = raw._crewCitizenshipNo || crew?.rawData?.['Citizenship No'] || crew?.rawData?.['CITIZENSHIP NO'];
      const phone = raw._crewPhone || crew?.phone || crew?.rawData?.['Mobile Phone'] || crew?.rawData?.['MOBILE PHONE'];
      const dutyType = f.rank || crew?.rawData?.['DUTY TYPE'] || crew?.rawData?.['Duty Type'] || crew?.position;
      const nationality = f.nationality || crew?.nationality || crew?.rawData?.['NATIONALITY'];
      const passportNumber = f.passportNumber || crew?.passportNumber || crew?.rawData?.['PASSPORT NUMBER'] || crew?.rawData?.['PASSPORT NO'];
      const gender = f.gender || crew?.rawData?.['Gender'] || crew?.rawData?.['GEN'];
      let dateOfBirth = f.dateOfBirth ? new Date(f.dateOfBirth) : null;
      if (!dateOfBirth && crew?.rawData?.['DATE OF BIRTH']) {
        try { dateOfBirth = new Date(crew.rawData['DATE OF BIRTH']); } catch {}
      }

      // Zenginleştirilmiş ham veri geri yaz (email template _crew* alanlarını okur)
      raw._crewPassportExpiry = passportExpiry || raw._crewPassportExpiry;
      raw._crewCitizenshipNo = citizenshipNo || raw._crewCitizenshipNo;
      raw._crewPhone = phone || raw._crewPhone;

      return {
        pairingRoute: f.pairingRoute,
        flightNumber: f.flightNumber,
        airline: f.airline,
        depDateTime: f.depDateTime ? new Date(f.depDateTime) : null,
        arrDateTime: f.arrDateTime ? new Date(f.arrDateTime) : null,
        depPort: f.depPort,
        arrPort: f.arrPort,
        crewName: f.crewName,
        rank: dutyType || '',
        nationality,
        passportNumber,
        dateOfBirth,
        gender,
        status: f.status,
        raw,
      };
    });

    const groups = groupFlights(normalizedRows);
    const email = await buildEmailDraft(groups);
    if (debug === '1') {
      const matchStats = {
        total: upload.flights.length,
        matched: upload.flights.filter((f: any) => f.crewMemberId).length,
        unmatched: upload.flights.filter((f: any) => !f.crewMemberId).length,
      };
      const unmatchedNames = upload.flights
        .filter((f: any) => !f.crewMemberId && f.crewName)
        .map((f: any) => f.crewName)
        .slice(0, 10);
      
      return NextResponse.json({
        email,
        groupCount: groups.length,
        uploadFlightCount: upload.flights.length,
        matchStats,
        unmatchedNames,
        firstRaw: normalizedRows[0]?.raw || null,
        firstRow: normalizedRows[0] || null,
        firstCrewMember: normalizedRows[0] ? upload.flights[0]?.crewMember : null,
        headers: upload.headers,
      });
    }
    return NextResponse.json({ email, groupCount: groups.length });
  } catch (err) {
    console.error('Ticket draft error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
