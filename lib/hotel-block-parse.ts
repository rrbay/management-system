// Hotel Blokaj Excel parse modülü
// Kolonlar: Hotel Port, Arr Leg, Check In Date, Check Out Date, Dep Leg, Single Room Count W/O Crew

import * as xlsx from 'xlsx';

export interface HotelBlockRow {
  hotelPort: string | null;
  arrLeg: string | null;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  depLeg: string | null;
  singleRoomCount: number | null;
  raw: Record<string, any>;
}

// Tarih parse (GMT+0)
function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  
  // Excel serial number
  if (typeof val === 'number') {
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const date = new Date(utcValue * 1000);
    return new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0
    ));
  }
  
  // String parse
  const str = String(val).trim();
  if (!str) return null;
  
  // DD.MM.YYYY veya DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), 0, 0, 0, 0));
  }
  
  // Fallback
  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0, 0, 0, 0
      ));
    }
  } catch {}
  
  return null;
}

// Integer parse
function parseInteger(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = parseInt(String(val));
  return isNaN(num) ? null : num;
}

// Kolon normalize
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '');
}

// Kolon eşleme
const COLUMN_MAP: Record<string, string> = {
  'hotel port': 'hotelPort',
  'hotelport': 'hotelPort',
  'port': 'hotelPort',
  'arr leg': 'arrLeg',
  'arrleg': 'arrLeg',
  'check in date': 'checkInDate',
  'checkindate': 'checkInDate',
  'check in': 'checkInDate',
  'checkin': 'checkInDate',
  'check out date': 'checkOutDate',
  'checkoutdate': 'checkOutDate',
  'check out': 'checkOutDate',
  'checkout': 'checkOutDate',
  'dep leg': 'depLeg',
  'depleg': 'depLeg',
  'single room count wo crew': 'singleRoomCount',
  'single room count w o crew': 'singleRoomCount',
  'singleroomcountwocrew': 'singleRoomCount',
  'sng': 'singleRoomCount',
};

export function parseHotelBlockWorkbook(buffer: Buffer): {
  headers: string[];
  rows: HotelBlockRow[];
} {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel dosyası boş');
  
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { raw: false, defval: null });
  
  if (!jsonData.length) throw new Error('Excel dosyasında veri yok');
  
  // Header mapping
  const firstRow: any = jsonData[0];
  const headers = Object.keys(firstRow);
  const columnMapping: Record<string, string> = {};
  
  headers.forEach((h) => {
    const normalized = normalizeColumnName(h);
    const mapped = COLUMN_MAP[normalized];
    if (mapped) {
      columnMapping[h] = mapped;
    }
  });
  
  console.log('[HotelBlockParse] Column mapping:', columnMapping);
  
  // Parse rows
  const rows: HotelBlockRow[] = [];
  for (const rawRow of jsonData) {
    const raw = rawRow as Record<string, any>;
    const row: HotelBlockRow = {
      hotelPort: null,
      arrLeg: null,
      checkInDate: null,
      checkOutDate: null,
      depLeg: null,
      singleRoomCount: null,
      raw,
    };
    
    // Map columns
    Object.entries(columnMapping).forEach(([excelCol, fieldName]) => {
      const val = raw[excelCol];
      
      switch (fieldName) {
        case 'hotelPort':
        case 'arrLeg':
        case 'depLeg':
          row[fieldName] = val ? String(val).trim() : null;
          break;
        case 'checkInDate':
        case 'checkOutDate':
          row[fieldName] = parseDate(val);
          break;
        case 'singleRoomCount':
          row.singleRoomCount = parseInteger(val);
          break;
      }
    });
    
    rows.push(row);
  }
  
  console.log(`[HotelBlockParse] Parsed ${rows.length} rows`);
  return { headers, rows };
}
