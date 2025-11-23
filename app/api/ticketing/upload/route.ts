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

    // TicketUpload oluştur (tablo yoksa otomatik oluştur)
    // @ts-ignore prisma client will include ticketUpload after generate
    let upload;
    try {
      upload = await prisma.ticketUpload.create({
        data: { filename, headers },
      });
    } catch (e: any) {
      // Tablo yoksa otomatik oluştur
      if (e?.code === 'P2021' || /does not exist/i.test(String(e))) {
        try {
          // Tabloları oluştur
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "TicketUpload" (
              "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
              "filename" TEXT NOT NULL,
              "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "headers" JSONB NOT NULL
            );
          `);
          
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "TicketFlight" (
              "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
              "uploadId" TEXT NOT NULL,
              "pairingRoute" TEXT,
              "flightNumber" TEXT,
              "airline" TEXT,
              "depDateTime" TIMESTAMP(3),
              "arrDateTime" TIMESTAMP(3),
              "depPort" TEXT,
              "arrPort" TEXT,
              "crewName" TEXT,
              "rank" TEXT,
              "nationality" TEXT,
              "passportNumber" TEXT,
              "dateOfBirth" TIMESTAMP(3),
              "gender" TEXT,
              "status" TEXT,
              "rawData" JSONB,
              "crewMemberId" TEXT,
              CONSTRAINT "TicketFlight_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "TicketUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
              CONSTRAINT "TicketFlight_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE SET NULL ON UPDATE CASCADE
            );
          `);
          
          await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TicketFlight_uploadId_idx" ON "TicketFlight"("uploadId");`);
          await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TicketFlight_pairingRoute_depDateTime_idx" ON "TicketFlight"("pairingRoute", "depDateTime");`);
          
          // Tekrar dene
          upload = await prisma.ticketUpload.create({
            data: { filename, headers },
          });
        } catch (createErr: any) {
          return NextResponse.json({
            error: 'Tablolar oluşturulamadı: ' + String(createErr),
          }, { status: 500 });
        }
      } else {
        throw e;
      }
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
      
      // Crew data'dan güvenli bir şekilde veri al
      let dobFromCrew: Date | undefined = undefined;
      if (crew?.rawData && crew.rawData['DATE OF BIRTH']) {
        try {
          dobFromCrew = new Date(crew.rawData['DATE OF BIRTH']);
        } catch {}
      }
      
      const genderFromCrew = crew?.rawData?.['Gender'] || crew?.rawData?.['GEN'] || undefined;
      
      // @ts-ignore prisma client will include ticketFlight after generate
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
          nationality: r.nationality || crew?.nationality || undefined,
          passportNumber: r.passportNumber || crew?.passportNumber || undefined,
          dateOfBirth: r.dateOfBirth ?? dobFromCrew,
          gender: r.gender || genderFromCrew,
          status: r.status,
          crewMemberId: crew?.id || undefined,
          rawData: r.raw,
        },
      });
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
