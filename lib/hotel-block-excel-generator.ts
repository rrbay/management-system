// Hotel Blokaj için diff'li Excel oluştur
// Yeşil (yeni), Sarı (değişen), Kırmızı (iptal)

import ExcelJS from 'exceljs';
import { HotelBlockRow } from './hotel-block-parse';
import { HotelBlockDiffResult } from './hotel-block-diff';

function formatDateTime(d: Date | null): string {
  if (!d) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

export async function buildHotelBlockExcel(
  rows: HotelBlockRow[],
  diff: HotelBlockDiffResult | null
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheetFlat = wb.addWorksheet('Hotel Blokaj (Düz)');
  sheetFlat.columns = [
    { header: 'Hotel Port', key: 'hotelPort', width: 15 },
    { header: 'Arr Leg', key: 'arrLeg', width: 10 },
    { header: 'Check In Date-Time', key: 'checkIn', width: 18 },
    { header: 'Check Out Date-Time', key: 'checkOut', width: 18 },
    { header: 'Dep Leg', key: 'depLeg', width: 10 },
    { header: 'SNG', key: 'sng', width: 8 },
    { header: 'Status', key: 'status', width: 10 },
  ];
  sheetFlat.getColumn('status').hidden = true;

  const makeKey = (r: HotelBlockRow) => {
    const port = r.hotelPort || 'UNKNOWN';
    const arr = r.arrLeg || '';
    const dep = r.depLeg || '';
    const checkIn = r.checkInDate ? r.checkInDate.toISOString().slice(0,16) : 'NO_DATE';
    const checkOut = r.checkOutDate ? r.checkOutDate.toISOString().slice(0,16) : 'NO_DATE';
    return `${port}|${arr}|${checkIn}|${checkOut}|${dep}`;
  };

  rows.forEach(r => {
    const key = makeKey(r);
    let status = 'NORMAL';
    if (diff) {
      if (diff.newReservations.includes(key)) status = 'NEW';
      else if (diff.changedReservations.includes(key)) status = 'CHANGED';
    }
    const excelRow = sheetFlat.addRow({
      hotelPort: r.hotelPort || '',
      arrLeg: r.arrLeg || '',
      checkIn: formatDateTime(r.checkInDate),
      checkOut: formatDateTime(r.checkOutDate),
      depLeg: r.depLeg || '',
      sng: r.singleRoomCount || 0,
      status,
    });
    styleDiffRow(excelRow, status);
  });

  if (diff && diff.cancelledReservations.length > 0) {
    diff.cancelledReservations.forEach(key => {
      const detail = diff.details[key];
      if (detail?.prev) {
        const r = detail.prev;
        const excelRow = sheetFlat.addRow({
          hotelPort: r.hotelPort || '',
          arrLeg: r.arrLeg || '',
          checkIn: formatDateTime(r.checkInDate),
          checkOut: formatDateTime(r.checkOutDate),
          depLeg: r.depLeg || '',
          sng: r.singleRoomCount || 0,
          status: 'CANCELLED',
        });
        styleDiffRow(excelRow, 'CANCELLED');
      }
    });
  }

  // Gruplu sheet
  const sheetGrouped = wb.addWorksheet('Hotel Blokaj (Gruplu)');
  sheetGrouped.columns = [
    { header: 'Hotel Port Group', key: 'group', width: 22 },
    { header: 'Arr Leg', key: 'arrLeg', width: 10 },
    { header: 'Check In', key: 'checkIn', width: 17 },
    { header: 'Check Out', key: 'checkOut', width: 17 },
    { header: 'Dep Leg', key: 'depLeg', width: 10 },
    { header: 'SNG', key: 'sng', width: 8 },
    { header: 'Status', key: 'status', width: 10 },
  ];
  sheetGrouped.getColumn('status').hidden = true;

  // Group rows by port
  const byPort: Record<string, HotelBlockRow[]> = {};
  rows.forEach(r => {
    const port = r.hotelPort || 'UNKNOWN';
    if (!byPort[port]) byPort[port] = [];
    byPort[port].push(r);
  });

  Object.entries(byPort).forEach(([port, portRows]) => {
    const headerRow = sheetGrouped.addRow({ group: `PORT: ${port}`, arrLeg: '', checkIn: '', checkOut: '', depLeg: '', sng: '', status: 'HEADER' });
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FF1E3A8A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    });
    portRows.forEach(r => {
      const key = makeKey(r);
      let status = 'NORMAL';
      if (diff) {
        if (diff.newReservations.includes(key)) status = 'NEW';
        else if (diff.changedReservations.includes(key)) status = 'CHANGED';
      }
      const excelRow = sheetGrouped.addRow({
        group: r.hotelPort || '',
        arrLeg: r.arrLeg || '',
        checkIn: formatDateTime(r.checkInDate),
        checkOut: formatDateTime(r.checkOutDate),
        depLeg: r.depLeg || '',
        sng: r.singleRoomCount || 0,
        status,
      });
      styleDiffRow(excelRow, status);
    });
    if (diff) {
      diff.cancelledReservations.forEach(key => {
        const detail = diff.details[key];
        if (detail?.prev && detail.prev.hotelPort === port) {
          const r = detail.prev;
          const excelRow = sheetGrouped.addRow({
            group: r.hotelPort || '',
            arrLeg: r.arrLeg || '',
            checkIn: formatDateTime(r.checkInDate),
            checkOut: formatDateTime(r.checkOutDate),
            depLeg: r.depLeg || '',
            sng: r.singleRoomCount || 0,
            status: 'CANCELLED',
          });
          styleDiffRow(excelRow, 'CANCELLED');
        }
      });
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function styleDiffRow(row: ExcelJS.Row, status: string) {
  let fg = 'FFFFFFFF';
  let fontColor = 'FF000000';
  let bold = false;
  if (status === 'NEW') { fg = 'FFC6EFCE'; fontColor = 'FF006100'; bold = true; }
  else if (status === 'CHANGED') { fg = 'FFFFEB9C'; fontColor = 'FF9C5700'; bold = true; }
  else if (status === 'CANCELLED') { fg = 'FFFFC7CE'; fontColor = 'FFC00000'; bold = true; }
  row.eachCell(cell => {
    cell.font = { color: { argb: fontColor }, bold };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fg } };
    cell.alignment = { vertical: 'middle' };
  });
}
