// Hotel Blokaj için diff'li Excel oluştur
// Yeşil (yeni), Sarı (değişen), Kırmızı (iptal)

import * as xlsx from 'xlsx';
import { HotelBlockRow } from './hotel-block-parse';
import { HotelBlockDiffResult } from './hotel-block-diff';

function formatDate(d: Date | null): string {
  if (!d) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function buildHotelBlockExcel(
  rows: HotelBlockRow[],
  diff: HotelBlockDiffResult | null
): Buffer {
  // Tablo verileri
  const data: any[] = [];
  
  // Header
  data.push(['Hotel Port', 'Arr Leg', 'Check In Date', 'Check Out Date', 'Dep Leg', 'SNG']);
  
  // Group rows by diff status
  const makeKey = (r: HotelBlockRow) => {
    const port = r.hotelPort || 'UNKNOWN';
    const arr = r.arrLeg || '';
    const dep = r.depLeg || '';
    const checkIn = r.checkInDate ? r.checkInDate.toISOString().split('T')[0] : 'NO_DATE';
    const checkOut = r.checkOutDate ? r.checkOutDate.toISOString().split('T')[0] : 'NO_DATE';
    return `${port}|${arr}|${checkIn}|${checkOut}|${dep}`;
  };
  
  rows.forEach((r) => {
    const key = makeKey(r);
    let status = 'NORMAL';
    
    if (diff) {
      if (diff.newReservations.includes(key)) status = 'NEW';
      else if (diff.changedReservations.includes(key)) status = 'CHANGED';
    }
    
    data.push([
      r.hotelPort || '',
      r.arrLeg || '',
      formatDate(r.checkInDate),
      formatDate(r.checkOutDate),
      r.depLeg || '',
      r.singleRoomCount || 0,
      status, // Hidden column for styling
    ]);
  });
  
  // İptal edilenler (kırmızı)
  if (diff && diff.cancelledReservations.length > 0) {
    diff.cancelledReservations.forEach((key) => {
      const detail = diff.details[key];
      if (detail?.prev) {
        const r = detail.prev;
        data.push([
          r.hotelPort || '',
          r.arrLeg || '',
          formatDate(r.checkInDate),
          formatDate(r.checkOutDate),
          r.depLeg || '',
          r.singleRoomCount || 0,
          'CANCELLED',
        ]);
      }
    });
  }
  
  // Workbook oluştur
  const ws = xlsx.utils.aoa_to_sheet(data);
  
  // Renklendirme
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = 1; R <= range.e.r; R++) {
    const statusCell = xlsx.utils.encode_cell({ r: R, c: 6 });
    const status = ws[statusCell]?.v;
    
    let bgColor = 'FFFFFF'; // Beyaz
    if (status === 'NEW') bgColor = 'C6EFCE'; // Yeşil
    else if (status === 'CHANGED') bgColor = 'FFEB9C'; // Sarı
    else if (status === 'CANCELLED') bgColor = 'FFC7CE'; // Kırmızı
    
    // Satırın tüm hücrelerine renk uygula
    for (let C = 0; C <= 5; C++) {
      const cellAddr = xlsx.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddr]) continue;
      
      if (!ws[cellAddr].s) ws[cellAddr].s = {};
      ws[cellAddr].s.fill = {
        patternType: 'solid',
        fgColor: { rgb: bgColor },
      };
    }
  }
  
  // Status kolonunu gizle
  ws['!cols'] = [
    { wch: 15 }, // Hotel Port
    { wch: 10 }, // Arr Leg
    { wch: 12 }, // Check In
    { wch: 12 }, // Check Out
    { wch: 10 }, // Dep Leg
    { wch: 8 },  // SNG
    { hidden: true }, // Status (hidden)
  ];
  
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Hotel Blokaj');
  
  return Buffer.from(xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
