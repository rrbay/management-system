// E-posta taslak metni üretir
// Her flightGroup için başlık ve tablo oluşturur.
import { NormalizedTicketRow } from './ticketing-parse';
import { findAirportDynamic, getUtcOffsetHours } from './airports-dynamic';

// GMT+0 tarihini port için local time'a çevir
async function toLocalTime(gmtDate: Date | null | undefined, portCode: string | undefined): Promise<Date | null> {
  if (!gmtDate || !portCode) return gmtDate || null;
  
  try {
    const airport = await findAirportDynamic(portCode);
    if (!airport || !airport.tz) return gmtDate;
    
    const offsetHours = getUtcOffsetHours(airport.tz, gmtDate);
    const localDate = new Date(gmtDate);
    localDate.setHours(localDate.getHours() + offsetHours);
    return localDate;
  } catch {
    return gmtDate;
  }
}

function formatDateLocal(d?: Date | null) {
  if (!d) return '';
  // Kullanıcıya lokal format (gün.ay.yıl) + HH:MM
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

export interface FlightEmailBlock {
  headerLine: string;
  table: string; // Plain text table
}

export async function buildFlightHeader(rows: NormalizedTicketRow[]): Promise<string> {
  if (!rows.length) return '';
  const r = rows[0];
  
  // GMT+0 tarihlerini local time'a çevir
  const depLocal = await toLocalTime(r.depDateTime, r.depPort);
  const arrLocal = await toLocalTime(r.arrDateTime, r.arrPort);
  
  // Format: DD.MM.YYYY - AIRLINE FLTNO DEPPORT-ARRPORT HH:MM L / DD.MM.YYYY HH:MM L
  const depDate = depLocal ? formatDateLocal(depLocal).split(' ')[0] : '';
  const depTime = depLocal ? formatDateLocal(depLocal).split(' ')[1] : '';
  const arrDate = arrLocal ? formatDateLocal(arrLocal).split(' ')[0] : '';
  const arrTime = arrLocal ? formatDateLocal(arrLocal).split(' ')[1] : '';
  
  const airlineFlight = `${r.airline || ''} ${r.flightNumber || ''}`.trim();
  const route = `${r.depPort || ''}-${r.arrPort || ''}`;
  
  return `${depDate} - ${airlineFlight} ${route} ${depTime} L / ${arrDate} ${arrTime} L`;
}

// Tablo: HTML tablo formatında
export function buildFlightTable(rows: NormalizedTicketRow[]): string {
  // Kolon başlıkları veri sırasıyla uyumlu olacak şekilde güncellendi.
  const headerCols = ['Rank Type','Crew Name','Passport No','Exp.','Date of Birth','Nat.','Citizenship No','Gen','Phone'];

  const crewCount = rows.length;
  let html = '<div style="margin-top:6px;margin-bottom:4px;font-size:11px;color:#2d3748;">Total Number of Crew: '+crewCount+'</div>';
  html += '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; margin-top: 4px; margin-bottom: 10px;">\n';

  // Header row
  html += '  <thead>\n    <tr style="background-color: #4a5568; color: white; font-weight: bold;">\n';
  headerCols.forEach(col => {
    html += `      <th style="border: 1px solid #ccc; padding: 6px 8px; text-align: left;">${col}</th>\n`;
  });
  html += '    </tr>\n  </thead>\n';

  // Data rows
  html += '  <tbody>\n';
  for (const r of rows) {
    const safe = (v: any) => {
      if (v === null || v === undefined || v === '') return '-';
      return String(v);
    };

    const rank = safe(r.rank);
    const name = safe(r.crewName);
    const passport = safe(r.passportNumber);

    // Passport expiry from rawData (crew list) - normalize all date formats to DD.MM.YYYY
    let expVal = '';
    if (r.raw._crewPassportExpiry) {
      try {
        let expDate: Date;
        const rawExp = String(r.raw._crewPassportExpiry);
        
        // If already DD/MM/YYYY or DD.MM.YYYY format, parse manually
        if (/^\d{2}[\/\.]\d{2}[\/\.]\d{4}$/.test(rawExp)) {
          const parts = rawExp.split(/[\/\.]/);
          expDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else {
          expDate = new Date(rawExp);
        }
        
        // Geçersiz tarih kontrolü
        if (!isNaN(expDate.getTime())) {
          expVal = formatDateLocal(expDate).split(' ')[0];
        } else {
          // Eğer tarih parse edilemiyorsa orijinal değeri nokta formatına çevir
          expVal = rawExp.replace(/\//g, '.');
        }
      } catch {
        // Parse hatası varsa orijinal değeri nokta formatına çevir
        expVal = String(r.raw._crewPassportExpiry).replace(/\//g, '.');
      }
    }
    const exp = safe(expVal);

    const dob = safe(r.dateOfBirth ? formatDateLocal(r.dateOfBirth).split(' ')[0] : '');
    const nat = safe(r.nationality);
    const citizen = safe(r.raw._crewCitizenshipNo);
    const gender = safe(r.gender);
    const phone = safe(r.raw._crewPhone);

    html += '    <tr>\n';
    [rank,name,passport,exp,dob,nat,citizen,gender,phone].forEach(val => {
      html += `      <td style="border: 1px solid #ccc; padding: 6px 8px; background-color: white; color: #1a202c;">${val}</td>\n`;
    });
    html += '    </tr>\n';
  }
  html += '  </tbody>\n';
  html += '</table>';

  return html;
}

export async function buildEmailDraft(groups: { key: string; rows: NormalizedTicketRow[] }[]): Promise<string> {
  let html = '<div style="font-family: Arial, sans-serif; color: black;">\n';
  html += '<p style="margin-bottom: 5px;">Dear Colleagues,</p>\n';
  html += '<p style="margin-top: 5px; margin-bottom: 15px;">We need ticket belowing flights;</p>\n';
  
  for (const g of groups) {
    const header = await buildFlightHeader(g.rows);
    html += `<p style="font-weight: bold; margin-top: 20px; margin-bottom: 5px; color: black;">${header}</p>\n`;
    html += buildFlightTable(g.rows);
  }
  
  html += '</div>';
  return html;
}
