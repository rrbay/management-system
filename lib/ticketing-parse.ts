// Ticketing Excel parse utilities
// Türkçe açıklamalar iş mantığını açıklar.
import * as xlsx from 'xlsx';
import { findAirportDynamic, getUtcOffsetHours } from './airports-dynamic';

// GMT+0 tarihini verilen port için local time'a çevir (dinamik havalimanı veritabanı kullanarak)
async function convertToLocalTime(gmtDate: Date | null, portCode: string | undefined): Promise<Date | null> {
  if (!gmtDate || !portCode) return gmtDate;
  
  try {
    const airport = await findAirportDynamic(portCode);
    if (!airport || !airport.tz) return gmtDate; // Havalimanı bulunamazsa GMT+0 kalsın
    
    const offsetHours = getUtcOffsetHours(airport.tz, gmtDate);
    const localDate = new Date(gmtDate);
    localDate.setHours(localDate.getHours() + offsetHours);
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
  if (value instanceof Date) return value;
  const s = String(value).trim();
  // 21/11/2025 18:25:00 veya 21.11.2025 18:25
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    let d = m[1].padStart(2,'0');
    let mn = m[2].padStart(2,'0');
    let y = m[3];
    if (y.length === 2) y = Number(y) > 50 ? '19'+y : '20'+y;
    const hh = m[4] ? m[4].padStart(2,'0') : '00';
    const mm = m[5] ? m[5] : '00';
    const ss = m[6] ? m[6] : '00';
    return new Date(`${y}-${mn}-${d}T${hh}:${mm}:${ss}`);
  }
  // Excel seri numarası
  if (/^\d+$/.test(s)) {
    const num = Number(s);
    if (num > 25569 && num < 80000) {
      return new Date((num - 25569) * 86400 * 1000);
    }
  }
  return null;
}

// Ad Soyad normalize (büyük harfleri küçült + fazlalıkları kaldır)
function normalizeName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return name.replace(/\s+/g,' ').trim();
}

export async function parseTicketWorkbook(buffer: Buffer) {
  const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });
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

  const mapped: NormalizedTicketRow[] = await Promise.all(rows.map(async r => {
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
    const flightNumber = get(['FLTNO','FLIGHT NO','FLIGHT NUMBER']);
    const airline = get(['AIRLINE']);
    const depPort = get(['DEP PORT','DEPARTURE PORT','ORIGIN']);
    const arrPort = get(['ARR PORT','ARRIVAL PORT','DEST']);
    const depDateRaw = get(['DEP DATE','DEPARTURE DATE','DEP DATETIME']);
    const arrDateRaw = get(['ARR DATE','ARRIVAL DATE','ARR DATETIME']);
    const crewName = normalizeName(get(['CREW NAME SURNAME','NAME SURNAME','NAME']));
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
      depDateTime: await convertToLocalTime(depDateTimeGMT, depPortStr),
      arrDateTime: await convertToLocalTime(arrDateTimeGMT, arrPortStr),
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
  }));
  
  const filtered = mapped.filter(r => r.pairingRoute || r.flightNumber || r.crewName);

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
