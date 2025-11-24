// Ticketing Excel parse utilities
// Türkçe açıklamalar iş mantığını açıklar.
import * as xlsx from 'xlsx';
import { findAirportDynamic, getUtcOffsetHours } from './airports-dynamic';

// GMT+0 tarihini verilen port için local time'a çevir (dinamik havalimanı veritabanı kullanarak)
async function convertToLocalTime(gmtDate: Date | null, portCode: string | undefined): Promise<Date | null> {
  if (!gmtDate || !portCode) {
    console.log(`[Timezone] Skipping conversion - gmtDate: ${gmtDate}, portCode: ${portCode}`);
    return gmtDate;
  }
  
  try {
    const airport = await findAirportDynamic(portCode);
    if (!airport || !airport.tz) {
      console.warn(`[Timezone] Airport not found or no timezone for ${portCode}`);
      return gmtDate; // Havalimanı bulunamazsa GMT+0 kalsın
    }
    
    const offsetHours = getUtcOffsetHours(airport.tz, gmtDate);
    const localDate = new Date(gmtDate);
    localDate.setHours(localDate.getHours() + offsetHours);
    
    console.log(`[Timezone] ${portCode}: GMT ${gmtDate.toISOString()} -> Local ${localDate.toISOString()} (offset: ${offsetHours}h, tz: ${airport.tz})`);
    return localDate;
  } catch (err) {
    console.warn(`[Ticketing] Timezone conversion failed for ${portCode}:`, err);
    return gmtDate; // Hata durumunda GMT+0 kalsın
  }
}

export interface RawTicketRow {
  [key: string]: any;
}

export interface NormalizedTicketRow {
  pairingRoute?: string;
  flightNumber?: string;
  airline?: string;
  depDateTime?: Date | null;
  arrDateTime?: Date | null;
  depPort?: string;
  arrPort?: string;
  crewName?: string;
  rank?: string;
  nationality?: string;
  passportNumber?: string;
  dateOfBirth?: Date | null;
  gender?: string;
  status?: string;
  raw: RawTicketRow;
}

// Excel tarih/saat hücresi farklı formatlarda olabilir.
function parseDateTime(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    console.log(`[parseDateTime] Already Date object: ${value.toISOString()}`);
    return value;
  }
  const s = String(value).trim();
  // 21/11/2025 18:25:00 veya 21.11.2025 18:25
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    let d = parseInt(m[1]);
    let mn = parseInt(m[2]);
    let y = m[3];
    if (y.length === 2) y = Number(y) > 50 ? '19'+y : '20'+y;
    const hh = m[4] ? parseInt(m[4]) : 0;
    const mm = m[5] ? parseInt(m[5]) : 0;
    const ss = m[6] ? parseInt(m[6]) : 0;
    // Date.UTC kullanarak UTC timestamp oluştur (GMT+0 olarak parse et)
    const parsed = new Date(Date.UTC(parseInt(y), mn - 1, d, hh, mm, ss));
    console.log(`[parseDateTime] String "${s}" -> ${parsed.toISOString()}`);
    return parsed;
  }
  // Excel seri numarası
  if (/^\d+$/.test(s)) {
    const num = Number(s);
    if (num > 25569 && num < 80000) {
      const parsed = new Date((num - 25569) * 86400 * 1000);
      console.log(`[parseDateTime] Excel serial ${num} -> ${parsed.toISOString()}`);
      return parsed;
    }
  }
  console.warn(`[parseDateTime] Could not parse: "${s}"`);
  return null;
}

// Ad Soyad normalize (büyük harfleri küçült + fazlalıkları kaldır)
function normalizeName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return name.replace(/\s+/g,' ').trim();
}

export function parseTicketWorkbook(buffer: Buffer) {
  // cellDates: false kullanarak ham string/serial değerleri alıyoruz, 
  // böylece GMT+0 olarak parse edip local'e çevirebiliriz
  const wb = xlsx.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  
  // İlk satır başlık satırıdır, veri ikinci satırdan başlar
  const allRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
  if (allRows.length < 2) return { headers: [], rows: [] }; // Boş veya sadece başlık varsa
  
  const headersRow = allRows[0];
  const headers = Array.isArray(headersRow) ? headersRow.map(h => h === null ? '' : String(h)) : [];
  
  // Başlık satırını kullanarak veri satırlarını objelere dönüştür
  const rows = allRows.slice(1).map(row => {
    const obj: any = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] !== undefined ? row[idx] : null;
    });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== null && v !== ''));

  const mapped: NormalizedTicketRow[] = rows.map(r => {
    const obj: RawTicketRow = r;
    const get = (variants: string[]): any => {
      for (const v of variants) {
        for (const key of Object.keys(obj)) {
          if (key.toLowerCase() === v.toLowerCase()) return obj[key];
        }
      }
      return null;
    };
    const pairingRoute = get(['PAIRING ROUTE','ROUTE','PAIRING']);
    const flightNumber = get(['FLT NO','FLTNO','FLIGHT NO','FLIGHT NUMBER']);
    const airline = get(['AIRLINE']);
    const depPort = get(['DEP PORT','DEPARTURE PORT','ORIGIN']);
    const arrPort = get(['ARR PORT','ARRIVAL PORT','DEST']);
    const depDateRaw = get(['DEP DATE','DEPARTURE DATE','DEP DATETIME']);
    const arrDateRaw = get(['ARR DATE','ARRIVAL DATE','ARR DATETIME']);
    const crewName = normalizeName(get(['RESERVED CREW LIST','CREW NAME SURNAME','NAME SURNAME','NAME']));
    const rank = get(['RANK','DUTY','DUTY TYPE','RANK TYPE']);
    const nationality = get(['NAT','NATIONALITY']);
    const passportNumber = get(['PASSPORT NUMBER','PASSPORT NO']);
    const dobRaw = get(['DATE OF BIRTH','BIRTH DATE']);
    const gender = get(['GENDER','GEN']);
    const status = get(['STATUS']);

    const depPortStr = depPort ? String(depPort).trim() : undefined;
    const arrPortStr = arrPort ? String(arrPort).trim() : undefined;
    const depDateTimeGMT = parseDateTime(depDateRaw);
    const arrDateTimeGMT = parseDateTime(arrDateRaw);
    
    return {
      pairingRoute: pairingRoute ? String(pairingRoute).trim() : undefined,
      flightNumber: flightNumber ? String(flightNumber).trim() : undefined,
      airline: airline ? String(airline).trim() : undefined,
      depDateTime: depDateTimeGMT, // GMT+0 olarak sakla
      arrDateTime: arrDateTimeGMT, // GMT+0 olarak sakla
      depPort: depPortStr,
      arrPort: arrPortStr,
      crewName,
      rank: rank ? String(rank).trim() : undefined,
      nationality: nationality ? String(nationality).trim() : undefined,
      passportNumber: passportNumber ? String(passportNumber).trim() : undefined,
      dateOfBirth: parseDateTime(dobRaw),
      gender: gender ? String(gender).trim() : undefined,
      status: status ? String(status).trim() : undefined,
      raw: obj,
    };
  });
  
  // RESERVED CREW LIST boş olan satırları filtrele (crew name zorunlu)
  const filtered = mapped.filter(r => r.crewName && r.crewName.trim() !== '');

  return { headers, rows: filtered };
}

// Uçuş grup anahtarı üretimi (aynı pairingRoute + kalkış tarih-saat + flightNumber + airline)
export function flightGroupKey(r: NormalizedTicketRow): string {
  return [
    r.pairingRoute || '',
    r.depDateTime ? r.depDateTime.toISOString() : '',
    r.flightNumber || '',
    r.airline || ''
  ].join('|');
}

export interface FlightGroup {
  key: string;
  rows: NormalizedTicketRow[];
}

export function groupFlights(rows: NormalizedTicketRow[]): FlightGroup[] {
  const map: Record<string, NormalizedTicketRow[]> = {};
  for (const r of rows) {
    const key = flightGroupKey(r);
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  return Object.keys(map).map(k => ({ key: k, rows: map[k] }));
}
