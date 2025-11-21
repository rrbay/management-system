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
    const allRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
    
    // Skip first row (merged cells), use second row as headers (index 1)
    const headers: string[] = Array.isArray(allRows[1])
      ? allRows[1].map((h) => (h === null || h === undefined ? '' : String(h).trim())).filter(h => h)
      : [];

    if (headers.length === 0) {
      return NextResponse.json({ error: 'No headers found in the sheet (row 2)' }, { status: 400 });
    }

    // Read data starting from row 3 (index 2), using row 2 as headers
    const dataRows = allRows.slice(2);
    
    // Helper function to format cell value properly
    const formatCellValue = (value: any): any => {
      if (value === null || value === undefined) return null;
      
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

    const json = dataRows.map((row: any) => {
      const obj: any = {};
      headers.forEach((header, index) => {
        if (header) {
          const cellValue = row[index];
          obj[header] = formatCellValue(cellValue);
        }
      });
      return obj;
    }).filter(row => {
      return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
    });

    // Create import record and crew members in database
    const crewImport = await prisma.crewImport.create({
      data: {
        filename,
        rowCount: Array.isArray(json) ? json.length : 0,
        headers,
      },
    });

    // Map Excel rows to CrewMember records
    const crewMembers = (json as any[]).map((row) => ({
      employeeCode: row['Employee Code'] || row['Sicil'] || null,
      firstName: row['First Name'] || row['Ad'] || null,
      lastName: row['Last Name'] || row['Soyad'] || null,
      fullName: row['Full Name'] || row['Ad Soyad'] || null,
      rank: row['Rank'] || row['Rütbe'] || null,
      position: row['Position'] || row['Pozisyon'] || null,
      department: row['Department'] || row['Departman'] || null,
      nationality: row['Nationality'] || row['Uyruk'] || null,
      passportNumber: row['Passport Number'] || row['Pasaport No'] || null,
      passportExpiry: row['Passport Expiry'] ? new Date(row['Passport Expiry']) : null,
      email: row['Email'] || row['E-posta'] || null,
      phone: row['Phone'] || row['Telefon'] || null,
      status: 'ACTIVE',
      rawData: row, // Store all original data
      importId: crewImport.id,
    }));

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
