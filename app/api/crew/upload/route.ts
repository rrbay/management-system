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
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    // read header row as array
    const rowsArray = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
    const headers: string[] = Array.isArray(rowsArray[0])
      ? rowsArray[0].map((h) => (h === null || h === undefined ? '' : String(h).trim()))
      : [];

    if (headers.length === 0) {
      return NextResponse.json({ error: 'No headers found in the sheet' }, { status: 400 });
    }

    // read as objects using header row
    const json = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

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
