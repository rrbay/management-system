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
function makeGroupKey(row: HotelBlockRow): string {
  const port = row.hotelPort || 'UNKNOWN';
  const arr = row.arrLeg || '';
  const dep = row.depLeg || '';
  const checkIn = row.checkInDate ? row.checkInDate.toISOString().split('T')[0] : 'NO_DATE';
  const checkOut = row.checkOutDate ? row.checkOutDate.toISOString().split('T')[0] : 'NO_DATE';
  
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
