import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const latestImport = await prisma.crewImport.findFirst({
      orderBy: { uploadedAt: 'desc' },
      select: {
        filename: true,
        uploadedAt: true,
        rowCount: true,
        headers: true,
      },
    });

    if (!latestImport) {
      return NextResponse.json({ 
        exists: false,
        needsUpdate: true,
        message: 'No crew list uploaded yet'
      });
    }

    const now = new Date();
    const uploadDate = new Date(latestImport.uploadedAt);
    const daysSinceUpload = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
    const needsUpdate = daysSinceUpload > 7;

    return NextResponse.json({
      exists: true,
      filename: latestImport.filename,
      uploadedAt: latestImport.uploadedAt,
      rowCount: latestImport.rowCount,
      daysSinceUpload,
      needsUpdate,
      message: needsUpdate 
        ? `Last update was ${daysSinceUpload} days ago. Please update the crew list.`
        : `Crew list is up to date (updated ${daysSinceUpload} days ago)`,
    });
  } catch (err) {
    console.error('Error fetching crew metadata:', err);
    return NextResponse.json({ 
      exists: false, 
      needsUpdate: true,
      error: String(err) 
    }, { status: 500 });
  }
}
