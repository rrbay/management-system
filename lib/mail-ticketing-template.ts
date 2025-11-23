// E-posta taslak metni üretir
// Her flightGroup için başlık ve tablo oluşturur.
import { NormalizedTicketRow } from './ticketing-parse';

function formatDateLocal(d?: Date | null) {
  if (!d) return '';
  // Kullanıcıya lokal format (gün.ay.yıl) + HH:MM
  const dd = d.getDate();
  const mm = d.getMonth() + 1;
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

export interface FlightEmailBlock {
  headerLine: string;
  table: string; // Plain text table
}

export function buildFlightHeader(rows: NormalizedTicketRow[]): string {
  if (!rows.length) return '';
  const r = rows[0];
  const depDate = r.depDateTime ? formatDateLocal(r.depDateTime).split(' ')[0] : '';
  const depTime = r.depDateTime ? formatDateLocal(r.depDateTime).split(' ')[1] : '';
  const arrDate = r.arrDateTime ? formatDateLocal(r.arrDateTime).split(' ')[0] : '';
  const arrTime = r.arrDateTime ? formatDateLocal(r.arrDateTime).split(' ')[1] : '';
  const airlineFlight = `${r.airline || ''} ${r.flightNumber || ''}`.trim();
  // Pairing route içinden ilk segmenti basitçe göster (AYT-IST vs tam rota)
  let route = r.pairingRoute || '';
  if (route.includes('/')) route = route.split('/')[0];
  return `${depDate} - ${airlineFlight} ${route} ${depTime} L / ${arrDate} ${arrTime} L`;
}

// Tablo: HTML tablo formatında
export function buildFlightTable(rows: NormalizedTicketRow[]): string {
  const headerCols = ['Rank Type','Total Number of Crew','Passport','Exp.','Date of Birth','Nat.','Citizenship No','Gen','Phone Number'];
  
  let html = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; margin-top: 10px; margin-bottom: 10px;">\n';
  
  // Header row
  html += '  <thead>\n    <tr style="background-color: #4a5568; color: white; font-weight: bold;">\n';
  headerCols.forEach(col => {
    html += `      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">${col}</th>\n`;
  });
  html += '    </tr>\n  </thead>\n';
  
  // Data rows
  html += '  <tbody>\n';
  for (const r of rows) {
    const rank = r.rank || '';
    const name = r.crewName || '';
    const passport = r.passportNumber || '';
    
    // Passport expiry from rawData (crew list)
    let exp = '';
    if (r.raw._crewPassportExpiry) {
      try {
        const expDate = new Date(r.raw._crewPassportExpiry);
        exp = formatDateLocal(expDate).split(' ')[0];
      } catch {}
    }
    
    const dob = r.dateOfBirth ? formatDateLocal(r.dateOfBirth).split(' ')[0] : '';
    const nat = r.nationality || '';
    const citizen = r.raw._crewCitizenshipNo || '';
    const gender = r.gender || '';
    const phone = r.raw._crewPhone || '';
    
    html += '    <tr>\n';
    [rank,name,passport,exp,dob,nat,citizen,gender,phone].forEach(val => {
      html += `      <td style="border: 1px solid #ccc; padding: 8px; background-color: white; color: black;">${val}</td>\n`;
    });
    html += '    </tr>\n';
  }
  html += '  </tbody>\n';
  html += '</table>';
  
  return html;
}

export function buildEmailDraft(groups: { key: string; rows: NormalizedTicketRow[] }[]): string {
  let html = '<div style="font-family: Arial, sans-serif; color: black;">\n';
  html += '<p style="margin-bottom: 5px;">Dear Colleagues,</p>\n';
  html += '<p style="margin-top: 5px; margin-bottom: 15px;">We need ticket belowing flights;</p>\n';
  
  for (const g of groups) {
    html += `<p style="font-weight: bold; margin-top: 20px; margin-bottom: 5px; color: black;">${buildFlightHeader(g.rows)}</p>\n`;
    html += buildFlightTable(g.rows);
  }
  
  html += '</div>';
  return html;
}
