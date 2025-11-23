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

// Tablo: İlk satır header, sonra satırlar
export function buildFlightTable(rows: NormalizedTicketRow[]): string {
  const headerCols = ['Rank Type','Total Number of Crew','Passport','Exp.','Date of Birth','Nat.','Citizenship No','Gen','Phone Number'];
  const lines: string[] = [];
  lines.push(headerCols.join('\t'));
  for (const r of rows) {
    const rank = r.rank || '-';
    const name = r.crewName || '-';
    const passport = r.passportNumber || '-';
    const exp = ''; // Pasaport bitişi crew listten ileride eklenebilir
    const dob = r.dateOfBirth ? formatDateLocal(r.dateOfBirth).split(' ')[0] : '-';
    const nat = r.nationality || '-';
    const citizen = ''; // Citizenship No ileride crewMember rawData'dan çekilebilir
    const gender = r.gender || '-';
    const phone = ''; // Telefon: crewMember'dan eşleşince eklenebilir
    lines.push([rank,name,passport,exp,dob,nat,citizen,gender,phone].join('\t'));
  }
  return lines.join('\n');
}

export function buildEmailDraft(groups: { key: string; rows: NormalizedTicketRow[] }[]): string {
  const parts: string[] = [];
  parts.push('Dear Colleagues,');
  parts.push('We need ticket belowing flights;');
  parts.push('');
  for (const g of groups) {
    parts.push(buildFlightHeader(g.rows));
    parts.push(buildFlightTable(g.rows));
    parts.push('');
  }
  return parts.join('\n');
}
