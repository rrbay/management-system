import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Uzaktan tablo oluşturma endpointi. Sadece geçici kullanım.
// Güvenlik: ?secret= parametresi process.env.MIGRATION_SECRET ile eşleşmeli.
// Kullanım: https://<prod-domain>/api/ticketing/migrate?secret=YOUR_SECRET

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (!process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: 'MIGRATION_SECRET not set on server' }, { status: 500 });
  }
  if (secret !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    // Kontrol: tablolar var mı?
    const check: any = await prisma.$queryRaw`SELECT to_regclass('public."TicketUpload"') AS tu, to_regclass('public."TicketFlight"') AS tf;`;
    const row = Array.isArray(check) ? check[0] : check;
    const existsUpload = !!row?.tu;
    const existsFlight = !!row?.tf;

    const statements: string[] = [];

    if (!existsUpload) {
      statements.push(`CREATE TABLE "TicketUpload" (\n  id text PRIMARY KEY,\n  filename text NOT NULL,\n  uploadedAt timestamp(3) NOT NULL DEFAULT now(),\n  headers jsonb NOT NULL\n);`);
    }
    if (!existsFlight) {
      statements.push(`CREATE TABLE "TicketFlight" (\n  id text PRIMARY KEY,\n  uploadId text REFERENCES "TicketUpload"(id) ON DELETE CASCADE,\n  pairingRoute text,\n  flightNumber text,\n  airline text,\n  depDateTime timestamp(3),\n  arrDateTime timestamp(3),\n  depPort text,\n  arrPort text,\n  crewName text,\n  rank text,\n  nationality text,\n  passportNumber text,\n  dateOfBirth timestamp(3),\n  gender text,\n  status text,\n  rawData jsonb,\n  crewMemberId text REFERENCES "CrewMember"(id) ON DELETE SET NULL\n);`);
      statements.push(`CREATE INDEX IF NOT EXISTS "TicketFlight_uploadId_idx" ON "TicketFlight"(uploadId);`);
      statements.push(`CREATE INDEX IF NOT EXISTS "TicketFlight_pairing_dep_idx" ON "TicketFlight"(pairingRoute, depDateTime);`);
    }

    for (const sql of statements) {
      // Çok satırlı stringleri executeRawUnsafe ile çalıştırıyoruz.
      // @ts-ignore
      await prisma.$executeRawUnsafe(sql);
    }

    return NextResponse.json({
      success: true,
      createdUpload: !existsUpload,
      createdFlight: !existsFlight,
      message: statements.length === 0 ? 'Tablolar zaten mevcut' : 'Eksik tablolar oluşturuldu'
    });
  } catch (err) {
    console.error('Migration error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
