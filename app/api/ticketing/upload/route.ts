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
    const { headers, rows } = await parseTicketWorkbook(buffer);

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
          // Eski tabloları sil ve yeniden oluştur (schema güncellemesi için)
          await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "TicketFlight" CASCADE;`);
          await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "TicketUpload" CASCADE;`);
          
          // Tabloları oluştur
          await prisma.$executeRawUnsafe(`
            CREATE TABLE "TicketUpload" (
              "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
              "filename" TEXT NOT NULL,
              "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "headers" JSONB NOT NULL
            );
          `);
          
          await prisma.$executeRawUnsafe(`
            CREATE TABLE "TicketFlight" (
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

    // İsim normalizasyon fonksiyonu (trim, çoklu boşluk, Türkçe karakterler)
    function normalizeName(name: string): string {
      return name
        .trim()
        .replace(/\s+/g, ' ') // Çoklu boşlukları tek boşluğa
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
    }

    // Crew eşleme için tüm crewMembers çek (isim eşleme)
    const crewMembers = await prisma.crewMember.findMany({});
    const crewIndex: Record<string, any> = {};
    crewMembers.forEach((c: any) => {
      // 1. fullName varsa (bazen sadece soyisim olabilir)
      if (c.fullName) {
        const normalized = normalizeName(c.fullName);
        crewIndex[normalized] = c;
      }
      
      // 2. firstName + lastName kombinasyonu
      const combo = `${(c.firstName||'').trim()} ${(c.lastName||'').trim()}`.trim();
      if (combo && combo !== c.lastName) { // Sadece soyisim değilse
        const normalized = normalizeName(combo);
        crewIndex[normalized] = c;
      }
      
      // 3. rawData.Name + lastName (gerçek ad genelde rawData.Name'de)
      const rawName = c.rawData?.['Name'] || c.rawData?.['NAME'];
      const rawSurname = c.rawData?.['Surname'] || c.rawData?.['SURNAME'] || c.lastName;
      if (rawName && rawSurname) {
        const fullCombo = `${rawName.trim()} ${rawSurname.trim()}`;
        const normalized = normalizeName(fullCombo);
        crewIndex[normalized] = c;
      }
      
      // 4. Sadece lastName (soyisim bazlı eşleşme)
      if (c.lastName) {
        const normalized = normalizeName(c.lastName);
        crewIndex[normalized] = c;
      }
    });

    console.log(`[Upload] Total crew members indexed: ${Object.keys(crewIndex).length}`);
    console.log(`[Upload] Sample indexed names:`, Object.keys(crewIndex).slice(0, 5));

    // Satırları DB'ye yaz
    let matchedCount = 0;
    let unmatchedNames: string[] = [];
    for (const r of rows) {
      const nameKey = normalizeName(r.crewName || '');
      const crew = crewIndex[nameKey];
      
      if (crew) {
        matchedCount++;
      } else if (r.crewName) {
        unmatchedNames.push(r.crewName);
      }
      
      // Crew data'dan güvenli bir şekilde veri al
      let dobFromCrew: Date | undefined = undefined;
      if (crew?.rawData && crew.rawData['DATE OF BIRTH']) {
        try {
          dobFromCrew = new Date(crew.rawData['DATE OF BIRTH']);
        } catch {}
      }
      
      const genderFromCrew = crew?.rawData?.['Gender'] || crew?.rawData?.['GEN'] || undefined;
      const dutyTypeFromCrew = crew?.rawData?.['DUTY TYPE'] || crew?.rawData?.['Duty Type'] || crew?.position || undefined;
      
      // Crew verilerini rawData'ya ekle
      const enrichedRaw = {
        ...r.raw,
        _crewPassportExpiry: crew?.passportExpiry || crew?.rawData?.['Valid Until'] || crew?.rawData?.['VALID UNTIL'],
        _crewCitizenshipNo: crew?.rawData?.['Citizenship No'] || crew?.rawData?.['CITIZENSHIP NO'],
        _crewPhone: crew?.phone || crew?.rawData?.['Mobile Phone'] || crew?.rawData?.['MOBILE PHONE'],
      };
      
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
          rank: r.rank || dutyTypeFromCrew,
          nationality: r.nationality || crew?.nationality || undefined,
          passportNumber: r.passportNumber || crew?.passportNumber || undefined,
          dateOfBirth: r.dateOfBirth ?? dobFromCrew,
          gender: r.gender || genderFromCrew,
          status: r.status,
          crewMemberId: crew?.id || undefined,
          rawData: enrichedRaw,
        },
      });
    }

    console.log(`[Upload] Crew matching: ${matchedCount}/${rows.length} matched`);
    if (unmatchedNames.length > 0) {
      console.log(`[Upload] Unmatched names (first 10):`, unmatchedNames.slice(0, 10));
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
