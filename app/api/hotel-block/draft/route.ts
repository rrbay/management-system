import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { diffHotelBlocks } from '@/lib/hotel-block-diff';
import { buildHotelBlockExcel } from '@/lib/hotel-block-excel-generator';
import { buildHotelBlockEmailBody, getMonthName } from '@/lib/hotel-block-template';
import { HotelBlockRow } from '@/lib/hotel-block-parse';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    
    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId gerekli' }, { status: 400 });
    }
    
    // Son 2 upload'u çek
    // @ts-ignore hotel block models
    const uploads = await prisma.hotelBlockUpload.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: 2,
      include: { reservations: true },
    });
    
    const upload = uploads.find((u: any) => u.id === uploadId);
    if (!upload) {
      return NextResponse.json({ error: 'Upload bulunamadı' }, { status: 404 });
    }
    
    // Current rows
    const currRows: HotelBlockRow[] = upload.reservations.map((r: any) => ({
      hotelPort: r.hotelPort,
      arrLeg: r.arrLeg,
      checkInDate: r.checkInDate ? new Date(r.checkInDate) : null,
      checkOutDate: r.checkOutDate ? new Date(r.checkOutDate) : null,
      depLeg: r.depLeg,
      singleRoomCount: r.singleRoomCount,
      raw: r.rawData || {},
    }));
    
    // Diff hesapla (önceki varsa)
    let diff = null;
    const prevUpload = uploads.length > 1 && uploads[0].id !== uploadId ? uploads[0] : uploads[1];
    
    if (prevUpload && prevUpload.id !== uploadId) {
      const prevRows: HotelBlockRow[] = prevUpload.reservations.map((r: any) => ({
        hotelPort: r.hotelPort,
        arrLeg: r.arrLeg,
        checkInDate: r.checkInDate ? new Date(r.checkInDate) : null,
        checkOutDate: r.checkOutDate ? new Date(r.checkOutDate) : null,
        depLeg: r.depLeg,
        singleRoomCount: r.singleRoomCount,
        raw: r.rawData || {},
      }));
      
      diff = diffHotelBlocks(prevRows, currRows);
    }
    
    // Ay adını belirle (ilk check-in tarihinden)
    let monthName = 'December';
    if (currRows.length > 0 && currRows[0].checkInDate) {
      monthName = getMonthName(currRows[0].checkInDate);
    }
    
    // Email body
    const emailBody = buildHotelBlockEmailBody(monthName);
    
    // Excel oluştur
    const excelBuffer = buildHotelBlockExcel(currRows, diff);
    const excelBase64 = excelBuffer.toString('base64');
    
    return NextResponse.json({
      emailBody,
      excelBase64,
      filename: `Hotel_Blokaj_${monthName}.xlsx`,
      diff: diff
        ? {
            new: diff.newReservations.length,
            changed: diff.changedReservations.length,
            cancelled: diff.cancelledReservations.length,
          }
        : null,
    });
  } catch (err) {
    console.error('Hotel block draft error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
