import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseHotelBlockWorkbook } from '@/lib/hotel-block-parse';

export const runtime = 'nodejs';

// Hotel Blokaj Excel yükleme - en fazla son 2 yükleme sakla
export async function POST(request: Request) {
  try {
    console.log('[HotelBlockUpload] POST request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    if (!file) {
      return NextResponse.json({ error: 'Dosya yüklenmedi' }, { status: 400 });
    }

    const filename = (file as any).name || 'hotel-block.xlsx';
    console.log('[HotelBlockUpload] File received:', filename, 'Size:', file.size);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('[HotelBlockUpload] Buffer created, parsing...');
    
    const { headers, rows } = parseHotelBlockWorkbook(buffer);
    console.log('[HotelBlockUpload] Parsed:', rows.length, 'rows');

    // Upload kaydı oluştur (tablo yoksa otomatik oluştur)
    // @ts-ignore hotel block models
    let upload;
    try {
      console.log('[HotelBlockUpload] Creating upload record...');
      // @ts-ignore hotel block models
      upload = await prisma.hotelBlockUpload.create({
        data: { filename, headers },
      });
      console.log('[HotelBlockUpload] Upload record created:', upload.id);
    } catch (e: any) {
      // Tablo yoksa otomatik oluştur
      if (e?.code === 'P2021' || /does not exist/i.test(String(e))) {
        try {
          console.log('[HotelBlockUpload] Creating tables...');
          
          // Eski tabloları sil ve yeniden oluştur
          await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "HotelBlockReservation" CASCADE;`);
          await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "HotelBlockUpload" CASCADE;`);
          
          // Tabloları oluştur
          await prisma.$executeRawUnsafe(`
            CREATE TABLE "HotelBlockUpload" (
              "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
              "filename" TEXT NOT NULL,
              "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "headers" JSONB NOT NULL
            );
          `);
          
          await prisma.$executeRawUnsafe(`
            CREATE TABLE "HotelBlockReservation" (
              "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
              "uploadId" TEXT NOT NULL,
              "hotelPort" TEXT,
              "arrLeg" TEXT,
              "checkInDate" TIMESTAMP(3),
              "checkOutDate" TIMESTAMP(3),
              "depLeg" TEXT,
              "singleRoomCount" INTEGER,
              "rawData" JSONB,
              CONSTRAINT "HotelBlockReservation_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "HotelBlockUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );
          `);
          
          await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HotelBlockUpload_uploadedAt_idx" ON "HotelBlockUpload"("uploadedAt");`);
          await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HotelBlockReservation_uploadId_idx" ON "HotelBlockReservation"("uploadId");`);
          await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HotelBlockReservation_hotelPort_checkInDate_idx" ON "HotelBlockReservation"("hotelPort", "checkInDate");`);
          
          console.log('[HotelBlockUpload] Tables created successfully');
          
          // Tekrar dene
          // @ts-ignore hotel block models
          upload = await prisma.hotelBlockUpload.create({
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

    // Satırları DB'ye batch insert ile yaz (çok daha hızlı)
    if (rows.length > 0) {
      console.log('[HotelBlockUpload] Inserting', rows.length, 'reservations...');
      // @ts-ignore hotel block models
      await prisma.hotelBlockReservation.createMany({
        data: rows.map(r => ({
          uploadId: upload.id,
          hotelPort: r.hotelPort,
          arrLeg: r.arrLeg,
          checkInDate: r.checkInDate ?? undefined,
          checkOutDate: r.checkOutDate ?? undefined,
          depLeg: r.depLeg,
          singleRoomCount: r.singleRoomCount,
          rawData: r.raw,
        })),
      });
      console.log(`[HotelBlockUpload] Successfully created ${rows.length} reservations`);
    }

    // Eski yüklemeleri temizle (en fazla 2)
    console.log('[HotelBlockUpload] Checking for old uploads to cleanup...');
    // @ts-ignore hotel block models
    const uploads = await prisma.hotelBlockUpload.findMany({
      orderBy: { uploadedAt: 'desc' },
    });

    if (uploads.length > 2) {
      const toDeleteIds = uploads.slice(2).map(u => u.id);
      console.log('[HotelBlockUpload] Deleting', toDeleteIds.length, 'old uploads');
      // @ts-ignore hotel block models
      await prisma.hotelBlockReservation.deleteMany({
        where: { uploadId: { in: toDeleteIds } },
      });
      // @ts-ignore hotel block models
      await prisma.hotelBlockUpload.deleteMany({
        where: { id: { in: toDeleteIds } },
      });
      console.log(`[HotelBlockUpload] Cleanup completed`);
    }

    console.log('[HotelBlockUpload] Upload process completed successfully');
    return NextResponse.json({
      success: true,
      uploadId: upload.id,
      rowCount: rows.length,
    });
  } catch (err) {
    console.error('Hotel block upload error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
