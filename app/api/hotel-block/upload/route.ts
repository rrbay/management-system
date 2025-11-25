import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseHotelBlockWorkbook } from '@/lib/hotel-block-parse';

export const runtime = 'nodejs';

// Hotel Blokaj Excel yükleme - en fazla son 2 yükleme sakla
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    if (!file) {
      return NextResponse.json({ error: 'Dosya yüklenmedi' }, { status: 400 });
    }

    const filename = (file as any).name || 'hotel-block.xlsx';
    const buffer = Buffer.from(await file.arrayBuffer());
    const { headers, rows } = parseHotelBlockWorkbook(buffer);

    // Upload kaydı oluştur
    // @ts-ignore hotel block models
    const upload = await prisma.hotelBlockUpload.create({
      data: { filename, headers },
    });

    // Satırları DB'ye yaz
    for (const r of rows) {
      // @ts-ignore hotel block models
      await prisma.hotelBlockReservation.create({
        data: {
          uploadId: upload.id,
          hotelPort: r.hotelPort,
          arrLeg: r.arrLeg,
          checkInDate: r.checkInDate ?? undefined,
          checkOutDate: r.checkOutDate ?? undefined,
          depLeg: r.depLeg,
          singleRoomCount: r.singleRoomCount,
          rawData: r.raw,
        },
      });
    }

    console.log(`[HotelBlockUpload] Created ${rows.length} reservations for upload ${upload.id}`);

    // Eski yüklemeleri temizle (en fazla 2)
    // @ts-ignore hotel block models
    const uploads = await prisma.hotelBlockUpload.findMany({
      orderBy: { uploadedAt: 'desc' },
    });

    if (uploads.length > 2) {
      const toDelete = uploads.slice(2);
      for (const u of toDelete) {
        // @ts-ignore hotel block models
        await prisma.hotelBlockReservation.deleteMany({
          where: { uploadId: u.id },
        });
        // @ts-ignore hotel block models
        await prisma.hotelBlockUpload.delete({ where: { id: u.id } });
      }
      console.log(`[HotelBlockUpload] Deleted ${toDelete.length} old uploads`);
    }

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
