import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  try {
    const metaPath = path.join(process.cwd(), 'data', 'crew-meta.json');
    const content = await fs.readFile(metaPath, 'utf8');
    const json = JSON.parse(content);
    return NextResponse.json({ meta: json });
  } catch (err) {
    return NextResponse.json({ meta: null });
  }
}
