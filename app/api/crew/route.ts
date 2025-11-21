import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'crew.json');
    const content = await fs.readFile(dataPath, 'utf8');
    const json = JSON.parse(content);
    return NextResponse.json({ data: json });
  } catch (err) {
    return NextResponse.json({ data: [] });
  }
}
