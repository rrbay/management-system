// Diff hesaplama yardımcıları
// İki yükleme arasındaki yeni / iptal / değişen uçuşları bulur.
import { flightGroupKey, NormalizedTicketRow } from './ticketing-parse';

export interface FlightDiffResult {
  newFlights: string[]; // group keys
  cancelledFlights: string[];
  changedFlights: string[]; // same group key but içerik değişik
  details: Record<string, { prev?: NormalizedTicketRow[]; curr?: NormalizedTicketRow[]; changes?: string[] }>; // değişiklik listesi
}

function crewSet(rows: NormalizedTicketRow[]): Set<string> {
  return new Set(rows.map(r => (r.crewName || '').toLowerCase()));
}

export function diffFlights(prevGroups: { key: string; rows: NormalizedTicketRow[] }[], currGroups: { key: string; rows: NormalizedTicketRow[] }[]): FlightDiffResult {
  const prevMap = new Map(prevGroups.map(g => [g.key, g.rows]));
  const currMap = new Map(currGroups.map(g => [g.key, g.rows]));
  const result: FlightDiffResult = { newFlights: [], cancelledFlights: [], changedFlights: [], details: {} };

  // New flights
  for (const key of currMap.keys()) {
    if (!prevMap.has(key)) {
      result.newFlights.push(key);
      result.details[key] = { curr: currMap.get(key) };
    }
  }
  // Cancelled flights
  for (const key of prevMap.keys()) {
    if (!currMap.has(key)) {
      result.cancelledFlights.push(key);
      result.details[key] = { prev: prevMap.get(key) };
    }
  }
  // Changed flights
  for (const key of currMap.keys()) {
    if (prevMap.has(key)) {
      const prevRows = prevMap.get(key)!;
      const currRows = currMap.get(key)!;
      const prevCrew = crewSet(prevRows);
      const currCrew = crewSet(currRows);
      const added: string[] = [];
      const removed: string[] = [];
      for (const c of currCrew) if (!prevCrew.has(c)) added.push(c);
      for (const c of prevCrew) if (!currCrew.has(c)) removed.push(c);
      const changes: string[] = [];
      if (added.length) changes.push(`Yeni eklenen ekip: ${added.join(', ')}`);
      if (removed.length) changes.push(`Silinen / iptal ekip: ${removed.join(', ')}`);
      // Saat değişimi kontrolü (ilk satır üzerinden)
      const prevDep = prevRows[0]?.depDateTime?.toISOString();
      const currDep = currRows[0]?.depDateTime?.toISOString();
      const prevArr = prevRows[0]?.arrDateTime?.toISOString();
      const currArr = currRows[0]?.arrDateTime?.toISOString();
      if (prevDep !== currDep) changes.push('Kalkış zamanı değişti');
      if (prevArr !== currArr) changes.push('Varış zamanı değişti');
      if (changes.length) {
        result.changedFlights.push(key);
        result.details[key] = { prev: prevRows, curr: currRows, changes };
      }
    }
  }
  return result;
}
