import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as xlsx from 'xlsx';
import { parseTicketWorkbook } from '@/lib/ticketing-parse';

export const runtime = 'nodejs';

// Yeni yükleme: en fazla son 2 yükleme tutulur (önceki + yeni)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const filename = (file as any).name || 'ticketing.xlsx';
    const buffer = Buffer.from(await file.arrayBuffer());
    const { headers, rows } = parseTicketWorkbook(buffer);

    // TicketUpload oluştur
    // @ts-ignore prisma client will include ticketUpload after generate
    let upload;
    try {
      upload = await prisma.ticketUpload.create({
        data: { filename, headers },
      });
    } catch (e: any) {
      // Tablo yoksa kullanıcıya açıklayıcı mesaj ver
      if (e?.code === 'P2021' || /does not exist/i.test(String(e))) {
        return NextResponse.json({
          error: 'Ticketing tabloları veritabanında yok. Önce lokal olarak prisma db push ile TicketUpload ve TicketFlight tablolarını oluşturun.',
          action: 'Run: prisma db push (direct 5432 connection).'
        }, { status: 500 });
      }
      throw e;
    }

    // Crew eşleme için tüm crewMembers çek (isim eşleme)
    const crewMembers = await prisma.crewMember.findMany({});
    const crewIndex: Record<string, any> = {};
    crewMembers.forEach((c: any) => {
      if (c.fullName) crewIndex[c.fullName.toLowerCase()] = c;
      const combo = `${(c.firstName||'').trim()} ${(c.lastName||'').trim()}`.trim();
      if (combo) crewIndex[combo.toLowerCase()] = c;
    });

    // Satırları DB'ye yaz
    for (const r of rows) {
      const nameKey = (r.crewName || '').toLowerCase();
      const crew = crewIndex[nameKey];
      // @ts-ignore prisma client will include ticketFlight after generate
      try {
        await prisma.ticketFlight.create({
        data: {
          uploadId: upload.id,
          pairingRoute: r.pairingRoute,
          flightNumber: r.flightNumber,
            airline: r.airline,
          depDateTime: r.depDateTime ?? undefined,
          arrDateTime: r.arrDateTime ?? undefined,
          depPort: r.depPort,
          arrPort: r.arrPort,
          crewName: r.crewName,
          rank: r.rank,
          nationality: r.nationality || crew?.nationality,
          passportNumber: r.passportNumber || crew?.passportNumber,
          dateOfBirth: r.dateOfBirth ?? crew?.rawData?.['DATE OF BIRTH'] ? new Date(crew.rawData['DATE OF BIRTH']) : undefined,
          gender: r.gender || crew?.rawData?.['Gender'] || crew?.rawData?.['GEN'],
          status: r.status,
          crewMemberId: crew?.id,
          rawData: r.raw,
        },
        });
      } catch (e: any) {
        if (e?.code === 'P2021' || /does not exist/i.test(String(e))) {
          return NextResponse.json({
            error: 'TicketFlight tablosu eksik. prisma db push çalıştırmanız gerekiyor.',
          }, { status: 500 });
        }
        throw e;
      }
    }

    // Eski yüklemeleri temizle (yalnızca son iki)
    // @ts-ignore access new model
    const uploads = await prisma.ticketUpload.findMany({ orderBy: { uploadedAt: 'desc' } });
    if (uploads.length > 2) {
      const toDelete = uploads.slice(2);
      for (const u of toDelete) {
        // @ts-ignore cleanup
        await prisma.ticketFlight.deleteMany({ where: { uploadId: u.id } });
        // @ts-ignore cleanup
        await prisma.ticketUpload.delete({ where: { id: u.id } });
      }
    }

    return NextResponse.json({ success: true, uploadId: upload.id, rowCount: rows.length });
  } catch (err) {
    console.error('Ticket upload error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
