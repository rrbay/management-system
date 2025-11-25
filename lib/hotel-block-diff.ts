// Hotel Blokaj diff: önceki vs yeni karşılaştırma
// Group key: hotelPort + arrLeg + checkInDate + checkOutDate + depLeg

import { HotelBlockRow } from './hotel-block-parse';

export interface HotelBlockDiffResult {
  newReservations: string[]; // Yeni group key'ler (yeşil)
  cancelledReservations: string[]; // İptal group key'ler (kırmızı)
  changedReservations: string[]; // Değişen group key'ler (sarı)
  details: Record<
    string,
    {
      prev?: HotelBlockRow;
      curr?: HotelBlockRow;
      changes?: string[];
    }
  >;
}

// Group key oluştur
function formatDateTime(d: Date | null): string {
  if (!d) return 'NO_DATE';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`; // minute precision
}

function makeGroupKey(row: HotelBlockRow): string {
  const port = row.hotelPort || 'UNKNOWN';
  const arr = row.arrLeg || '';
  const dep = row.depLeg || '';
  const checkIn = formatDateTime(row.checkInDate);
  const checkOut = formatDateTime(row.checkOutDate);
  return `${port}|${arr}|${checkIn}|${checkOut}|${dep}`;
}

export function diffHotelBlocks(
  prevRows: HotelBlockRow[],
  currRows: HotelBlockRow[]
): HotelBlockDiffResult {
  const prevMap = new Map<string, HotelBlockRow>();
  const currMap = new Map<string, HotelBlockRow>();
  
  prevRows.forEach((r) => {
    const key = makeGroupKey(r);
    prevMap.set(key, r);
  });
  
  currRows.forEach((r) => {
    const key = makeGroupKey(r);
    currMap.set(key, r);
  });
  
  const newReservations: string[] = [];
  const cancelledReservations: string[] = [];
  const changedReservations: string[] = [];
  const details: HotelBlockDiffResult['details'] = {};
  
  // Yeni rezervasyonlar
  currMap.forEach((curr, key) => {
    if (!prevMap.has(key)) {
      newReservations.push(key);
      details[key] = { curr };
    }
  });
  
  // İptal rezervasyonlar
  prevMap.forEach((prev, key) => {
    if (!currMap.has(key)) {
      cancelledReservations.push(key);
      details[key] = { prev };
    }
  });
  
  // Değişenler (single room count farklıysa)
  currMap.forEach((curr, key) => {
    const prev = prevMap.get(key);
    if (prev) {
      const changes: string[] = [];
      
      if (prev.singleRoomCount !== curr.singleRoomCount) {
        changes.push(
          `SNG: ${prev.singleRoomCount || 0} → ${curr.singleRoomCount || 0}`
        );
      }

      // Time change detection
      if (prev.checkInDate && curr.checkInDate) {
        const prevIn = formatDateTime(prev.checkInDate);
        const currIn = formatDateTime(curr.checkInDate);
        if (prevIn !== currIn) changes.push(`CheckIn: ${prevIn} → ${currIn}`);
      }
      if (prev.checkOutDate && curr.checkOutDate) {
        const prevOut = formatDateTime(prev.checkOutDate);
        const currOut = formatDateTime(curr.checkOutDate);
        if (prevOut !== currOut) changes.push(`CheckOut: ${prevOut} → ${currOut}`);
      }
      
      if (changes.length > 0) {
        changedReservations.push(key);
        details[key] = { prev, curr, changes };
      }
    }
  });
  
  console.log(
    `[HotelBlockDiff] New: ${newReservations.length}, Changed: ${changedReservations.length}, Cancelled: ${cancelledReservations.length}`
  );
  
  return {
    newReservations,
    cancelledReservations,
    changedReservations,
    details,
  };
}
