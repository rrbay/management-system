// Dynamic airport dataset loader using OpenFlights public data.
// Kaynak: https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat
// Bu dosya IATA, ICAO ve TZ database timezone içeren satırlar sağlar.
// Cache mekanizması ile veriyi bellekte tutar ve belirli aralıklarla yeniler.

const DATA_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';

export interface DynamicAirport {
  iata: string; // 3-letter
  icao: string; // 4-letter
  name: string;
  city: string;
  country: string;
  tz: string; // IANA timezone
}

interface CacheState {
  fetchedAt: number;
  airports: DynamicAirport[];
}

let cache: CacheState | null = null;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 saat

function needsRefresh() {
  if (!cache) return true;
  return Date.now() - cache.fetchedAt > MAX_AGE_MS;
}

function parseLine(line: string): DynamicAirport | null {
  // CSV alanları tırnak içinde olabilir. Basit split kullanıyoruz çünkü airports.dat formatı sabit.
  // Bir satır örneği:
  // 507,"Heathrow","London","United Kingdom","LHR","EGLL",51.4706,-0.461941,83,0,"E","Europe/London","airport","OurAirports"
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  parts.push(current);
  if (parts.length < 12) return null;
  const name = parts[1];
  const city = parts[2];
  const country = parts[3];
  const iata = parts[4];
  const icao = parts[5];
  const tz = parts[11];
  if ((!iata || iata === '\\N') && (!icao || icao === '\\N')) return null;
  if (!tz || tz === '\\N') return null;
  return {
    iata: iata || '',
    icao: icao || '',
    name,
    city,
    country,
    tz,
  };
}

async function fetchAirportsRemote(): Promise<DynamicAirport[]> {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error('Failed to fetch airports dataset');
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  const airports: DynamicAirport[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parseLine(line);
    if (parsed) airports.push(parsed);
  }
  return airports;
}

export async function loadAirportsDynamic(): Promise<DynamicAirport[]> {
  if (!needsRefresh()) return cache!.airports;
  const airports = await fetchAirportsRemote();
  cache = { fetchedAt: Date.now(), airports };
  return airports;
}

export async function findAirportDynamic(code: string): Promise<DynamicAirport | null> {
  const list = await loadAirportsDynamic();
  const upper = code.toUpperCase();
  return (
    list.find(a => a.iata.toUpperCase() === upper) ||
    list.find(a => a.icao.toUpperCase() === upper) ||
    null
  );
}

export function getUtcOffsetHours(timezone: string, date: Date = new Date()): number {
  // Daha doğru offset hesabı: belirtilen timezone'da "sanal" tarih üretip UTC farkını hesaplıyoruz.
  const localStr = date.toLocaleString('en-US', { timeZone: timezone });
  const localDate = new Date(localStr);
  const offsetMinutes = (localDate.getTime() - date.getTime()) / 60000;
  return offsetMinutes / 60;
}

export async function airportInfoWithOffsetDynamic(code: string, date?: Date) {
  const airport = await findAirportDynamic(code);
  if (!airport) return null;
  const d = date || new Date();
  const offset = getUtcOffsetHours(airport.tz, d);
  return {
    iata: airport.iata,
    icao: airport.icao,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    timezone: airport.tz,
    utcOffsetHours: offset,
    utcOffsetLabel: (offset >= 0 ? '+' : '') + offset,
    localTime: new Date(d.toLocaleString('en-US', { timeZone: airport.tz }))
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19),
  };
}
