import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateCrewStatistics,
  filterAndGroupStatistics,
  calculateGroupAverage,
  type CrewStatistics,
} from '@/lib/crew-statistics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dutyType = searchParams.get('dutyType') || undefined;
    const rankType = searchParams.get('rankType') || undefined;
    const fleetType = searchParams.get('fleetType') || undefined;
    const includeZeroFT = searchParams.get('includeZeroFT') === 'true';

    console.log('[Stats API] includeZeroFT:', includeZeroFT);

    // Tüm crew member'ları çek
    const members = await prisma.crewMember.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        rawData: true,
      },
    });

    console.log('[Stats API] Total members from DB:', members.length);
    
    // Debug: İlk kaydın rawData'sını kontrol et
    if (members.length > 0) {
      const first = members[0];
      console.log('[Stats API] First member rawData keys:', Object.keys(first.rawData || {}));
      console.log('[Stats API] First member rawData sample:', first.rawData);
    }

    // Her member için istatistik hesapla
    let allStatistics: CrewStatistics[] = members
      .map(member => calculateCrewStatistics(member))
      .filter((stat): stat is CrewStatistics => stat !== null);

    console.log('[Stats API] After calculateCrewStatistics:', allStatistics.length);
    console.log('[Stats API] Sample results:', allStatistics.slice(0, 3).map(s => ({
      name: s.name,
      dutyType: s.dutyType,
      companyFT: s.companyFT,
      startDate: s.startDate
    })));

    // Uçuş saati sıfır olanları filtrele (eğer seçili değilse)
    const beforeZeroFilter = allStatistics.length;
    if (!includeZeroFT) {
      allStatistics = allStatistics.filter(stat => stat.totalMinutes > 0);
    }
    console.log('[Stats API] After zero filter:', allStatistics.length, 'removed:', beforeZeroFilter - allStatistics.length);

    // Filtreleme uygula
    const filteredStats = filterAndGroupStatistics(allStatistics, {
      dutyType,
      rankType,
      fleetType,
    });

    // Grup ortalaması hesapla
    const groupAverage = calculateGroupAverage(filteredStats);

    // Filtreleme seçenekleri için unique değerleri topla
    const uniqueDutyTypes = [...new Set(allStatistics.map(s => s.dutyType).filter(Boolean))].sort();
    const uniqueRankTypes = [...new Set(allStatistics.map(s => s.rankType).filter(Boolean))].sort();
    const uniqueFleetTypes = [...new Set(allStatistics.map(s => s.fleetType).filter(Boolean))].sort();

    return NextResponse.json({
      success: true,
      data: filteredStats,
      groupAverage,
      filters: {
        dutyType: dutyType || null,
        rankType: rankType || null,
        fleetType: fleetType || null,
      },
      filterOptions: {
        dutyTypes: uniqueDutyTypes,
        rankTypes: uniqueRankTypes,
        fleetTypes: uniqueFleetTypes,
      },
      totalCount: filteredStats.length,
      allCount: allStatistics.length,
    });
  } catch (error) {
    console.error('Crew statistics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate statistics' },
      { status: 500 }
    );
  }
}
