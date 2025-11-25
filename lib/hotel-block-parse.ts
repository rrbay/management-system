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

// Tarih + Saat parse (GMT+0) - Turkish ÖÖ / ÖS desteği
function parseDate(val: any): Date | null {
  const originalVal = val;
  if (val === null || val === undefined || val === '') return null;

  // Excel serial number (içinde saat olabilir - fractional day)
  if (typeof val === 'number') {
    const base = new Date(Math.round((val - 25569) * 86400 * 1000)); // include time fraction
    return new Date(Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      base.getUTCHours(),
      base.getUTCMinutes(),
      base.getUTCSeconds(),
      0
    ));
  }

  // Date instance
  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Date(Date.UTC(
      val.getFullYear(),
      val.getMonth(),
      val.getDate(),
      val.getHours(),
      val.getMinutes(),
      val.getSeconds(),
      0
    ));
  }

  let str = String(val).trim();
  if (!str) return null;

  // Normalleştir: özel boşlukları, çift boşlukları tek boşluğa indir
  str = str.replace(/\u202F/g, ' ').replace(/\s+/g, ' ').trim();

  // ÖÖ / ÖS (AM/PM) tespiti
  let ampm: 'AM' | 'PM' | null = null;
  if (/\bÖÖ\b/i.test(str)) ampm = 'AM';
  if (/\bÖS\b/i.test(str)) ampm = 'PM';
  str = str.replace(/\bÖÖ\b|\bÖS\b/gi, '').trim();

  // Pattern: DD.MM.YYYY HH[:| ]MM[:| ]SS (opsiyonel) veya HH MM SS
  const dateTimeRegex = /^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})\s+(\d{1,2})(?:[:\s](\d{1,2}))?(?:[:\s](\d{1,2}))?$/;
  const dtMatch = str.match(dateTimeRegex);
  if (dtMatch) {
    const [, d, m, y, hhRaw, mmRaw, ssRaw] = dtMatch;
    let hh = parseInt(hhRaw || '0');
    const mm = parseInt(mmRaw || '0');
    const ss = parseInt(ssRaw || '0');
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
    return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), hh, mm, ss, 0));
  }

  // Sadece tarih: DD.MM.YYYY
  const dmyOnly = str.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
  if (dmyOnly) {
    const [, d, m, y] = dmyOnly;
    return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), 0, 0, 0, 0));
  }

  // ISO benzeri: YYYY-MM-DD HH:MM(:SS)?
  const isoLike = str.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?$/);
  if (isoLike) {
    const [, y, m, d, hhRaw, mmRaw, ssRaw] = isoLike;
    let hh = parseInt(hhRaw || '0');
    const mm = parseInt(mmRaw || '0');
    const ss = parseInt(ssRaw || '0');
    return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), hh, mm, ss, 0));
  }

  // US format MM/DD/YYYY HH:MM AM/PM
  const usFmt = str.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/);
  if (usFmt) {
    const [, m, d, y, hhRaw, mmRaw, ssRaw] = usFmt;
    let hh = parseInt(hhRaw || '0');
    const mm = parseInt(mmRaw || '0');
    const ss = parseInt(ssRaw || '0');
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
    return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), hh, mm, ss, 0));
  }

  // Native Date fallback
  const native = new Date(str);
  if (!isNaN(native.getTime())) {
    return new Date(Date.UTC(
      native.getFullYear(),
      native.getMonth(),
      native.getDate(),
      native.getHours(),
      native.getMinutes(),
      native.getSeconds(),
      0
    ));
  }

  console.warn('[HotelBlockParse] Could not parse date-time', originalVal);
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
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true, dateNF: 'dd.mm.yyyy' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel dosyası boş');
  
  const sheet = workbook.Sheets[sheetName];
  // cellDates ile tarihleri Date objesi olarak al
  const jsonData = xlsx.utils.sheet_to_json(sheet, { 
    raw: false,
    defval: '',
    blankrows: true,
    dateNF: 'dd.mm.yyyy'
  });
  
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
  let dateParseWarnings = 0;
  const failedDateExamples: Array<{field: string, value: any, type: string}> = [];
  
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
          const parsedDate = parseDate(val);
          if (val && !parsedDate) {
            dateParseWarnings++;
            if (failedDateExamples.length < 5) {
              failedDateExamples.push({
                field: fieldName,
                value: val,
                type: typeof val
              });
            }
          }
          row[fieldName] = parsedDate;
          break;
        case 'singleRoomCount':
          row.singleRoomCount = parseInteger(val);
          break;
      }
    });
    
    // Sadece tamamen boş olmayan satırları ekle
    const hasData = row.hotelPort || row.arrLeg || row.checkInDate || 
                    row.checkOutDate || row.depLeg || row.singleRoomCount;
    if (hasData) {
      rows.push(row);
    }
  }
  
  if (dateParseWarnings > 0) {
    console.warn(`[HotelBlockParse] ⚠️  ${dateParseWarnings} date parsing failures`);
    console.warn('[HotelBlockParse] Failed date examples:', failedDateExamples);
  }
  console.log(`[HotelBlockParse] Parsed ${rows.length} rows`);
  return { headers, rows };
}
