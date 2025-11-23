import fs from 'fs';
import path from 'path';

export type AirportRecord = {
  iata: string;
  icao: string;
  name: string;
  country: string;
  timezone: string; // IANA timezone identifier
};

let cache: AirportRecord[] | null = null;

function loadAirports(): AirportRecord[] {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), 'data', 'airports-sample.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  cache = JSON.parse(raw) as AirportRecord[];
  return cache!;
}

export function findAirport(code: string): AirportRecord | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  const list = loadAirports();
  return (
    list.find(a => a.iata.toUpperCase() === upper) ||
    list.find(a => a.icao.toUpperCase() === upper) ||
    null
  );
}

export function getUtcOffsetHours(timezone: string, date: Date = new Date()): number {
  // Use Intl.DateTimeFormat to derive offset in minutes
  const dtf = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, timeZoneName: 'short', hour: '2-digit', minute: '2-digit' });
  const parts = dtf.formatToParts(date);
  // Fallback method: create two dates and compare
  const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const utc = new Date(date.toISOString());
  const offsetMinutes = (local.getTime() - utc.getTime()) / 60000;
  return offsetMinutes / 60;
}

export function airportInfoWithOffset(code: string, date?: Date) {
  const airport = findAirport(code);
  if (!airport) return null;
  const d = date || new Date();
  const offset = getUtcOffsetHours(airport.timezone, d);
  return {
    ...airport,
    utcOffsetHours: offset,
    utcOffsetLabel: (offset >= 0 ? '+' : '') + offset,
    localTime: new Date(d.toLocaleString('en-US', { timeZone: airport.timezone }))
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19)
  };
}
