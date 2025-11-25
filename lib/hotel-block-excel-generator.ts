// Hotel Blokaj için diff'li Excel oluştur
// Yeşil (yeni), Sarı (değişen), Kırmızı (iptal)

import * as xlsx from 'xlsx';
import { HotelBlockRow } from './hotel-block-parse';
import { HotelBlockDiffResult } from './hotel-block-diff';

function formatDateTime(d: Date | null): string {
  if (!d) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

export function buildHotelBlockExcel(
  rows: HotelBlockRow[],
  diff: HotelBlockDiffResult | null
): Buffer {
  // Tablo verileri
  const data: any[] = [];
  
  // Header
  data.push(['Hotel Port', 'Arr Leg', 'Check In Date-Time', 'Check Out Date-Time', 'Dep Leg', 'SNG']);
  
  // Group rows by diff status
  const makeKey = (r: HotelBlockRow) => {
    const port = r.hotelPort || 'UNKNOWN';
    const arr = r.arrLeg || '';
    const dep = r.depLeg || '';
    const checkIn = r.checkInDate ? r.checkInDate.toISOString().slice(0,16) : 'NO_DATE';
    const checkOut = r.checkOutDate ? r.checkOutDate.toISOString().slice(0,16) : 'NO_DATE';
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
      formatDateTime(r.checkInDate),
      formatDateTime(r.checkOutDate),
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
          formatDateTime(r.checkInDate),
          formatDateTime(r.checkOutDate),
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
  // İlk tabloda port başlıkları üretmek için grouping
  // Build groups
  const groups: Record<string, number[]> = {};
  for (let rIndex = 1; rIndex <= range.e.r; rIndex++) {
    const portCell = xlsx.utils.encode_cell({ r: rIndex, c: 0 });
    const portVal = ws[portCell]?.v || 'UNKNOWN';
    if (!groups[portVal]) groups[portVal] = [];
    groups[portVal].push(rIndex);
  }

  // Renklendirme (satır bazlı diff durumuna göre)
  for (let R = 1; R <= range.e.r; R++) {
    const statusCell = xlsx.utils.encode_cell({ r: R, c: 6 });
    const status = ws[statusCell]?.v;
    
    let textColor = '000000';
    let fillColor = 'FFFFFF';
    if (status === 'NEW') { textColor = '006100'; fillColor = 'C6EFCE'; }
    else if (status === 'CHANGED') { textColor = '9C5700'; fillColor = 'FFEB9C'; }
    else if (status === 'CANCELLED') { textColor = 'C00000'; fillColor = 'FFC7CE'; }

    // Satırın tüm hücrelerine stil uygula
    for (let C = 0; C <= 5; C++) {
      const cellAddr = xlsx.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddr]) continue;
      
      if (!ws[cellAddr].s) ws[cellAddr].s = {};
      ws[cellAddr].s = {
        font: {
          color: { rgb: textColor },
          bold: status !== 'NORMAL',
        },
        fill: {
          patternType: 'solid',
          fgColor: { rgb: fillColor },
        },
        alignment: { vertical: 'center' }
      };
    }
  }

  // Port başlıkları eklemek için yeni bir sheet oluştur (Gruplu görünüm)
  const groupedData: any[] = [];
  groupedData.push(['Hotel Port Group', 'Arr Leg', 'Check In', 'Check Out', 'Dep Leg', 'SNG', 'Status']);
  Object.entries(groups).forEach(([port, rowIndexes]) => {
    groupedData.push([`PORT: ${port}`, '', '', '', '', '', 'HEADER']);
    rowIndexes.forEach(rIdx => {
      const baseRow = [] as any[];
      for (let C = 0; C <= 6; C++) {
        const addr = xlsx.utils.encode_cell({ r: rIdx, c: C });
        baseRow.push(ws[addr]?.v ?? '');
      }
      groupedData.push(baseRow);
    });
  });
  const wsGrouped = xlsx.utils.aoa_to_sheet(groupedData);
  const groupedRange = xlsx.utils.decode_range(wsGrouped['!ref'] || 'A1');
  for (let R = 1; R <= groupedRange.e.r; R++) {
    const statusCell = xlsx.utils.encode_cell({ r: R, c: 6 });
    const status = wsGrouped[statusCell]?.v;
    const firstCell = xlsx.utils.encode_cell({ r: R, c: 0 });
    if (status === 'HEADER') {
      for (let C = 0; C <= 6; C++) {
        const addr = xlsx.utils.encode_cell({ r: R, c: C });
        if (!wsGrouped[addr]) continue;
        wsGrouped[addr].s = {
          font: { bold: true, color: { rgb: '1E3A8A' } },
          fill: { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } },
        };
      }
    } else {
      // Diff row styles (use existing status coloring logic similar to main sheet)
      let textColor = '000000';
      let fillColor = 'FFFFFF';
      if (status === 'NEW') { textColor = '006100'; fillColor = 'C6EFCE'; }
      else if (status === 'CHANGED') { textColor = '9C5700'; fillColor = 'FFEB9C'; }
      else if (status === 'CANCELLED') { textColor = 'C00000'; fillColor = 'FFC7CE'; }
      for (let C = 0; C <= 6; C++) {
        const addr = xlsx.utils.encode_cell({ r: R, c: C });
        if (!wsGrouped[addr]) continue;
        wsGrouped[addr].s = {
          font: { color: { rgb: textColor }, bold: status !== 'NORMAL' },
          fill: { patternType: 'solid', fgColor: { rgb: fillColor } },
        };
      }
    }
  }
  wsGrouped['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 17 }, { wch: 17 }, { wch: 10 }, { wch: 8 }, { hidden: true }
  ];
  
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
  xlsx.utils.book_append_sheet(wb, ws, 'Hotel Blokaj (Düz)');
  xlsx.utils.book_append_sheet(wb, wsGrouped, 'Hotel Blokaj (Gruplu)');
  
  return Buffer.from(xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
