import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as xlsx from 'xlsx';

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

    const dataDir = path.join(process.cwd(), 'data');
    const dataPath = path.join(dataDir, 'crew.json');
    const metaPath = path.join(dataDir, 'crew-meta.json');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(json, null, 2), 'utf8');

    const meta = {
      uploadedAt: new Date().toISOString(),
      filename,
      count: Array.isArray(json) ? json.length : 0,
      headers,
    };
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    return NextResponse.json({ success: true, count: meta.count, headers: meta.headers });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error parsing/uploading crew file:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
