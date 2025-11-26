/**
 * Crew Statistics Calculation Library
 * Calculates crew efficiency based on Company FT (flight time) and start date
 */

/**
 * Company FT formatını (930:25) dakikaya çevirir
 * @param companyFT - "930:25" formatında saat:dakika string
 * @returns Toplam dakika
 */
export function parseCompanyFT(companyFT: string | null | undefined): number {
  if (!companyFT) return 0;
  
  const match = companyFT.match(/^(\d+):(\d+)$/);
  if (!match) return 0;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  return hours * 60 + minutes;
}

/**
 * İki tarih arasındaki gün sayısını hesaplar
 * @param startDate - Başlangıç tarihi
 * @param endDate - Bitiş tarihi (default: bugün)
 * @returns Gün sayısı
 */
export function calculateDaysSince(startDate: Date | string | null | undefined, endDate: Date = new Date()): number {
  if (!startDate) return 0;
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  if (isNaN(start.getTime())) return 0;
  
  const diffTime = endDate.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Verimlilik oranını hesaplar: (Company FT dakika) / (İşe giriş tarihinden itibaren geçen gün sayısı)
 * Dakika/Gün oranı döner - yüksek değer = daha verimli kullanım
 * 
 * @param companyFT - "930:25" formatında saat:dakika
 * @param startDate - İşe giriş tarihi
 * @returns Verimlilik oranı (dakika/gün)
 */
export function calculateEfficiency(
  companyFT: string | null | undefined,
  startDate: Date | string | null | undefined
): number {
  const totalMinutes = parseCompanyFT(companyFT);
  const daysSince = calculateDaysSince(startDate);
  
  if (daysSince === 0) return 0;
  
  return totalMinutes / daysSince;
}

/**
 * Crew member için detaylı istatistik hesaplar
 */
export interface CrewStatistics {
  id: string;
  companyId: string;
  name: string;
  dutyType: string;
  rankType: string;
  fleetType: string;
  startDate: Date | null;
  companyFT: string;
  totalMinutes: number;
  daysSince: number;
  efficiency: number; // dakika/gün
}

/**
 * Crew member'ın istatistiklerini hesaplar
 */
export function calculateCrewStatistics(member: {
  id: string;
  companyId?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dutyType?: string | null;
  rankType?: string | null;
  fleetType?: string | null;
  startDate?: Date | null;
  companyFT?: string | null;
  rawData?: any;
}): CrewStatistics | null {
  // rawData'dan da alabiliriz - birden fazla olası kolon ismi dene
  const companyId = member.companyId || 
    member.rawData?.['Company ID'] || 
    member.rawData?.['COMPANY ID'] ||
    member.rawData?.['CompanyID'] ||
    member.rawData?.['company_id'] || '';
  
  // İsim + Soyisim kombinasyonları - ayrı kolonlar da olabilir
  let name = '';
  if (member.rawData?.['Name + Surname']) {
    name = member.rawData['Name + Surname'];
  } else if (member.rawData?.['NAME + SURNAME']) {
    name = member.rawData['NAME + SURNAME'];
  } else if (member.rawData?.['CREW NAME SURNAME']) {
    name = member.rawData['CREW NAME SURNAME'];
  } else if (member.rawData?.['Name'] && member.rawData?.['Surname']) {
    name = `${member.rawData['Name']} ${member.rawData['Surname']}`;
  } else if (member.rawData?.['NAME'] && member.rawData?.['SURNAME']) {
    name = `${member.rawData['NAME']} ${member.rawData['SURNAME']}`;
  } else if (member.rawData?.['First Name'] && member.rawData?.['Last Name']) {
    name = `${member.rawData['First Name']} ${member.rawData['Last Name']}`;
  } else if (member.fullName) {
    name = member.fullName;
  } else if (member.firstName && member.lastName) {
    name = `${member.firstName} ${member.lastName}`;
  }
  
  const dutyType = member.dutyType || 
    member.rawData?.['Duty Type'] || 
    member.rawData?.['DUTY TYPE'] ||
    member.rawData?.['DutyType'] ||
    member.rawData?.['duty_type'] || '';
    
  const rankType = member.rankType || 
    member.rawData?.['Rank Type'] || 
    member.rawData?.['RANK TYPE'] ||
    member.rawData?.['RankType'] ||
    member.rawData?.['rank_type'] || '';
    
  const fleetType = member.fleetType || 
    member.rawData?.['Fleet Type'] || 
    member.rawData?.['FLEET TYPE'] ||
    member.rawData?.['FleetType'] ||
    member.rawData?.['fleet_type'] || '';
    
  const companyFT = member.companyFT || 
    member.rawData?.['Company FT'] || 
    member.rawData?.['COMPANY FT'] ||
    member.rawData?.['CompanyFT'] ||
    member.rawData?.['company_ft'] || '';
  
  let startDate = member.startDate;
  if (!startDate) {
    const sdFields = [
      'Start Date', 'START DATE', 'StartDate', 'start_date',
      'Hire Date', 'HIRE DATE', 'HireDate', 'hire_date'
    ];
    
    for (const field of sdFields) {
      const sd = member.rawData?.[field];
      if (sd) {
        if (typeof sd === 'string') {
          // DD.MM.YYYY veya DD/MM/YYYY formatını kontrol et
          const dateMatch = sd.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
          if (dateMatch) {
            const [_, day, month, year] = dateMatch;
            startDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
            break;
          } else {
            const parsed = new Date(sd);
            if (!isNaN(parsed.getTime())) {
              startDate = parsed;
              break;
            }
          }
        } else if (typeof sd === 'number' && sd > 0) {
          // Excel serial date
          startDate = new Date((sd - 25569) * 86400 * 1000);
          break;
        } else if (sd instanceof Date) {
          // Zaten Date objesi
          startDate = sd;
          break;
        }
      }
    }
  }
  
  // Geçersiz tarihleri filtrele (1970-01-01 veya invalid)
  if (startDate && (isNaN(startDate.getTime()) || startDate.getFullYear() < 1990)) {
    startDate = null;
  }
  
  // SADECE Company ID ve en az biri (name veya companyFT) varsa dahil et
  // Boş satırları atla ama kısmi veri varsa dahil et
  if (!companyId && !name && !companyFT) {
    return null;
  }
  
  const totalMinutes = parseCompanyFT(companyFT);
  const daysSince = calculateDaysSince(startDate);
  const efficiency = calculateEfficiency(companyFT, startDate);
  
  return {
    id: member.id,
    companyId: companyId || 'N/A',
    name: name || 'N/A',
    dutyType: dutyType || '',
    rankType: rankType || '',
    fleetType: fleetType || '',
    startDate: startDate || null,
    companyFT: companyFT || '0:00',
    totalMinutes,
    daysSince,
    efficiency,
  };
}

/**
 * Crew listesinin grup ortalamasını hesaplar
 */
export function calculateGroupAverage(stats: CrewStatistics[]): number {
  if (stats.length === 0) return 0;
  
  const totalEfficiency = stats.reduce((sum, s) => sum + s.efficiency, 0);
  return totalEfficiency / stats.length;
}

/**
 * Filtreleme için crew istatistiklerini gruplar
 */
export function filterAndGroupStatistics(
  allStats: CrewStatistics[],
  filters: {
    dutyType?: string;
    rankType?: string;
    fleetType?: string;
  }
): CrewStatistics[] {
  return allStats.filter(stat => {
    if (filters.dutyType && stat.dutyType !== filters.dutyType) return false;
    if (filters.rankType && stat.rankType !== filters.rankType) return false;
    if (filters.fleetType && stat.fleetType !== filters.fleetType) return false;
    return true;
  });
}
