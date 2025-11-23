import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = (file as any).name || 'uploaded.xlsx';
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read all rows including first row (merged cells)
    const allRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    
    // Skip first row (merged cells), use second row as headers (index 1)
    const headers: string[] = Array.isArray(allRows[1])
      ? allRows[1].map((h) => {
          if (h === null || h === undefined || h === '') return '';
          return String(h).trim();
        }).filter(h => h !== '')
      : [];

    if (headers.length === 0) {
      return NextResponse.json({ error: 'No headers found in the sheet (row 2)' }, { status: 400 });
    }

    console.log('Extracted headers:', headers);

    // Read data starting from row 3 (index 2), using row 2 as headers
    const dataRows = allRows.slice(2);
    
    // Helper function to format cell value properly
    const formatCellValue = (value: any): any => {
      if (value === null || value === undefined || value === '') return null;
      
      // If it's already a Date object, format it
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      
      // If it's a number that looks like an Excel date serial
      if (typeof value === 'number' && value > 25569 && value < 73050) {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
      
      return value;
    };

    // Build normalized headers for internal mapping (preserve original for display)
    const normalizedHeaderMap: Record<string, string> = {};
    headers.forEach(h => {
      const norm = h
        .toLocaleLowerCase('tr')
        .replace(/ı/g, 'i')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '');
      normalizedHeaderMap[h] = norm;
    });

    const json = dataRows.map((row: any) => {
      const original: any = {};
      headers.forEach((header, index) => {
        if (!header) return;
        const cellValue = Array.isArray(row) ? row[index] : undefined;
        original[header] = formatCellValue(cellValue);
      });
      return original;
    }).filter(row => Object.values(row).some(val => val !== null && val !== undefined && val !== ''));

    console.log('First 2 data rows:', json.slice(0, 2));

    // Delete all existing crew members and imports before inserting new data
    await prisma.crewMember.deleteMany({});
    await prisma.crewImport.deleteMany({});

    // Create import record and crew members in database
    const crewImport = await prisma.crewImport.create({
      data: {
        filename,
        rowCount: Array.isArray(json) ? json.length : 0,
        headers,
      },
    });

    // Map Excel rows to CrewMember records
    const pickFirst = (row: any, variants: string[]): any => {
      for (const v of variants) {
        if (row[v] !== undefined && row[v] !== null && row[v] !== '') return row[v];
      }
      return null;
    };

    const crewMembers = (json as any[]).map((row) => {
      // Precompute lower-case key map for flexible matching
      const lowerMap: Record<string,string> = {};
      Object.keys(row).forEach(k => {
        lowerMap[k.toLocaleLowerCase('tr')] = k;
      });
      const find = (variants: string[]) => {
        for (const v of variants) {
          const key = lowerMap[v.toLocaleLowerCase('tr')];
          if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
        }
        return null;
      };
      const passportExpiryRaw = find(['passport expiry','pasaport bitiş','pasaport bitiş tarihi','passport expire']);
      let passportExpiry: Date | null = null;
      if (passportExpiryRaw) {
        if (passportExpiryRaw instanceof Date) passportExpiry = passportExpiryRaw;
        else if (/^\d{4}-\d{2}-\d{2}$/.test(String(passportExpiryRaw))) passportExpiry = new Date(String(passportExpiryRaw));
        else if (/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.test(String(passportExpiryRaw))) {
          const m = String(passportExpiryRaw).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)!;
          const d = m[1].padStart(2,'0');
          const mn = m[2].padStart(2,'0');
          let y = m[3];
          if (y.length === 2) y = Number(y) > 50 ? '19'+y : '20'+y;
          passportExpiry = new Date(`${y}-${mn}-${d}`);
        } else if (/^\d+$/.test(String(passportExpiryRaw))) {
          const num = Number(passportExpiryRaw);
          if (num > 25569 && num < 80000) passportExpiry = new Date((num - 25569) * 86400 * 1000);
        }
      }
      return {
        employeeCode: find(['employee code','sicil','personel no','crew id']),
        firstName: find(['first name','ad','isim']),
        lastName: find(['last name','soyad','surname']),
        fullName: find(['full name','ad soyad','isim soyisim']) || ((find(['first name','ad','isim']) || '') + ' ' + (find(['last name','soyad','surname']) || '')).trim() || null,
        rank: find(['rank','rütbe','unvan']),
        position: find(['position','pozisyon','görev']),
        department: find(['department','departman','bölüm']),
        nationality: find(['nationality','uyruk','milliyet']),
        passportNumber: find(['passport number','pasaport no','passport no']),
        passportExpiry: passportExpiry,
        email: find(['email','e-posta','mail']),
        phone: find(['phone','telefon','gsm']),
        status: 'ACTIVE',
        rawData: row,
        importId: crewImport.id,
      };
    });

    // Bulk insert crew members
    await prisma.crewMember.createMany({
      data: crewMembers,
      skipDuplicates: true,
    });

    return NextResponse.json({ 
      success: true, 
      count: crewMembers.length, 
      headers,
      importId: crewImport.id 
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error parsing/uploading crew file:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
