"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type CrewStatistic = {
  id: string;
  companyId: string;
  name: string;
  dutyType: string;
  rankType: string;
  fleetType: string;
  startDate: string;
  companyFT: string;
  totalMinutes: number;
  daysSince: number;
  efficiency: number;
};

type StatisticsResponse = {
  success: boolean;
  data: CrewStatistic[];
  groupAverage: number;
  filters: {
    dutyType: string | null;
    rankType: string | null;
    fleetType: string | null;
  };
  filterOptions: {
    dutyTypes: string[];
    rankTypes: string[];
    fleetTypes: string[];
  };
  totalCount: number;
  allCount: number;
};

export default function CrewStatisticsPage() {
  const [data, setData] = useState<CrewStatistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupAverage, setGroupAverage] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{
    dutyTypes: string[];
    rankTypes: string[];
    fleetTypes: string[];
  }>({ dutyTypes: [], rankTypes: [], fleetTypes: [] });
  
  const [selectedDutyTypes, setSelectedDutyTypes] = useState<string[]>([]);
  const [selectedRankTypes, setSelectedRankTypes] = useState<string[]>([]);
  const [selectedFleetTypes, setSelectedFleetTypes] = useState<string[]>([]);
  const [includeZeroFT, setIncludeZeroFT] = useState(false);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('includeZeroFT', includeZeroFT.toString());
      
      const res = await fetch(`/api/crew/statistics?${params.toString()}`);
      const json: StatisticsResponse = await res.json();
      
      if (json.success) {
        let filteredData = json.data || [];
        
        // Frontend'de çoklu filtre uygula
        if (selectedDutyTypes.length > 0) {
          filteredData = filteredData.filter(d => selectedDutyTypes.includes(d.dutyType));
        }
        if (selectedRankTypes.length > 0) {
          filteredData = filteredData.filter(d => selectedRankTypes.includes(d.rankType));
        }
        if (selectedFleetTypes.length > 0) {
          filteredData = filteredData.filter(d => selectedFleetTypes.includes(d.fleetType));
        }
        
        setData(filteredData);
        
        // Filtrelenmiş verinin ortalamasını hesapla
        const avg = filteredData.length > 0
          ? filteredData.reduce((sum, d) => sum + d.efficiency, 0) / filteredData.length
          : 0;
        setGroupAverage(avg);
        
        setFilterOptions(json.filterOptions);
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [selectedDutyTypes, selectedRankTypes, selectedFleetTypes, includeZeroFT]);

  // Chart data hazırlama - verimlilik sıralaması (düşükten yükseğe grafik için)
  const sortedData = [...data].sort((a, b) => a.efficiency - b.efficiency);
  
  const chartData = {
    labels: sortedData.map(d => d.name),
    datasets: [
      {
        label: 'Verimlilik (dk/gün)',
        data: sortedData.map(d => d.efficiency),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        pointRadius: 6,
        pointHoverRadius: 10,
        pointBackgroundColor: sortedData.map(d => 
          d.efficiency >= groupAverage 
            ? 'rgb(34, 197, 94)'  // Yeşil
            : 'rgb(251, 146, 60)'  // Turuncu
        ),
        tension: 0.3,
      },
      {
        label: 'Grup Ortalaması',
        data: sortedData.map(() => groupAverage),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Crew Verimlilik Analizi (Ortalama: ${groupAverage.toFixed(2)} dk/gün)`,
        font: {
          size: 18,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const index = context.dataIndex;
            const crew = sortedData[index];
            if (context.datasetIndex === 0 && crew) {
              return [
                `ID: ${crew.companyId}`,
                `İsim: ${crew.name}`,
                `Verimlilik: ${crew.efficiency.toFixed(2)} dk/gün`,
                `Toplam Uçuş: ${crew.companyFT}`,
                `Duty: ${crew.dutyType} | Rank: ${crew.rankType} | Fleet: ${crew.fleetType}`,
                `İşe Başlama: ${crew.startDate ? new Date(crew.startDate).toLocaleDateString('tr-TR') : 'N/A'}`,
                `Geçen Gün: ${crew.daysSince}`,
              ];
            }
            return `Ortalama: ${groupAverage.toFixed(2)} dk/gün`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Verimlilik (dakika/gün)',
        },
      },
      x: {
        display: false, // İsimleri gizle
      },
    },
  };

  const toggleSelection = (
    value: string,
    selectedList: string[],
    setter: (list: string[]) => void
  ) => {
    if (selectedList.includes(value)) {
      setter(selectedList.filter(v => v !== value));
    } else {
      setter([...selectedList, value]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-lg">İstatistikler yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/modules/crew-planning"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Crew Planning
              </Link>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <span className="text-3xl mr-2">📊</span>
                  Crew Verimlilik Analizi
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {data.length} kişi • Ortalama: {groupAverage.toFixed(2)} dk/gün
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtreler */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtreler</h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeZeroFT}
                  onChange={(e) => setIncludeZeroFT(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Uçuş saati sıfır olanları göster
                </span>
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Duty Type Multi-Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duty Type (Çoklu Seçim)
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 max-h-48 overflow-y-auto">
                {filterOptions.dutyTypes.length > 0 ? (
                  filterOptions.dutyTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-600 px-2 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDutyTypes.includes(type)}
                        onChange={() => toggleSelection(type, selectedDutyTypes, setSelectedDutyTypes)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{type || '(Boş)'}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Veri yok</p>
                )}
              </div>
              {selectedDutyTypes.length > 0 && (
                <button
                  onClick={() => setSelectedDutyTypes([])}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Temizle ({selectedDutyTypes.length})
                </button>
              )}
            </div>
            
            {/* Rank Type Multi-Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rank Type (Çoklu Seçim)
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 max-h-48 overflow-y-auto">
                {filterOptions.rankTypes.length > 0 ? (
                  filterOptions.rankTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-600 px-2 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRankTypes.includes(type)}
                        onChange={() => toggleSelection(type, selectedRankTypes, setSelectedRankTypes)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{type || '(Boş)'}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Veri yok</p>
                )}
              </div>
              {selectedRankTypes.length > 0 && (
                <button
                  onClick={() => setSelectedRankTypes([])}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Temizle ({selectedRankTypes.length})
                </button>
              )}
            </div>
            
            {/* Fleet Type Multi-Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fleet Type (Çoklu Seçim)
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 max-h-48 overflow-y-auto">
                {filterOptions.fleetTypes.length > 0 ? (
                  filterOptions.fleetTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-600 px-2 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFleetTypes.includes(type)}
                        onChange={() => toggleSelection(type, selectedFleetTypes, setSelectedFleetTypes)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{type || '(Boş)'}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Veri yok</p>
                )}
              </div>
              {selectedFleetTypes.length > 0 && (
                <button
                  onClick={() => setSelectedFleetTypes([])}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Temizle ({selectedFleetTypes.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Performans Özeti */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Kişi</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.length}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ortalama Verimlilik</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{groupAverage.toFixed(1)}</p>
                <p className="text-xs text-gray-500">dk/gün</p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ortalamanın Üstü</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {data.filter(d => d.efficiency >= groupAverage).length}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ortalamanın Altı</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {data.filter(d => d.efficiency < groupAverage).length}
                </p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>
        </div>

        {/* Grafik */}
        {data.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
            <div style={{ height: '500px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Ortalamanın Üstü</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Ortalamanın Altı</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-red-500 border-dashed"></div>
                <span className="text-gray-700 dark:text-gray-300">Grup Ortalaması</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center mb-8">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Veri Bulunamadı
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Seçili filtrelere uygun crew verisi bulunamadı veya henüz crew listesi yüklenmemiş.
            </p>
          </div>
        )}

        {/* Detay Tablosu */}
        {data.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detaylı Liste
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Company ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      İsim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Duty Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rank Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fleet Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Company FT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      İşe Başlama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Geçen Gün
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Verimlilik
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {[...data].sort((a, b) => b.efficiency - a.efficiency).map((crew) => (
                    <tr key={crew.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {crew.companyId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {crew.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {crew.dutyType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {crew.rankType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {crew.fleetType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {crew.companyFT}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {crew.startDate ? new Date(crew.startDate).toLocaleDateString('tr-TR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {crew.daysSince}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-semibold min-w-[80px] ${crew.efficiency >= groupAverage ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {crew.efficiency.toFixed(2)} dk/gün
                          </span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 min-w-[120px] max-w-[200px] overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${crew.efficiency >= groupAverage ? 'bg-green-500' : 'bg-orange-500'}`}
                              style={{ 
                                width: `${Math.min(100, (crew.efficiency / (groupAverage * 2)) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
