import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Tüm ticketing kayıtlarını sil (yeni aya geçerken)
export async function DELETE() {
  try {
    // Önce flights'ı sil (foreign key constraint)
    await prisma.ticketFlight.deleteMany({});
    
    // Sonra uploads'ı sil
    await prisma.ticketUpload.deleteMany({});

    return NextResponse.json({ 
      success: true,
      message: 'Tüm kayıtlar silindi' 
    });
  } catch (error: any) {
    console.error('Clear error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Silme hatası' },
      { status: 500 }
    );
  }
}
