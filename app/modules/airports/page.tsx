"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type AirportRow = {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
};

export default function AirportsPage() {
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [data, setData] = useState<AirportRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const url = `/api/airports?page=${page}&limit=${limit}` + (appliedQ ? `&q=${encodeURIComponent(appliedQ)}` : '');
        const res = await fetch(url);
        const json = await res.json();
        if (!ignore) {
          setData(Array.isArray(json.data) ? json.data : []);
          if (json.pagination) {
            setPages(json.pagination.pages);
            setTotal(json.pagination.total);
          }
        }
      } catch (e) {
        console.error('Load airports error', e);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [page, appliedQ, limit]);

  const applySearch = () => {
    setPage(1);
    setAppliedQ(q.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">← Ana Sayfa</Link>
            <div className="border-l h-6 border-gray-300 dark:border-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="text-3xl mr-2">🛫</span> Havalimanı Listesi
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applySearch(); }}
              placeholder="Ara (IATA / ICAO / şehir / ülke)"
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <button
              onClick={applySearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md font-medium shadow"
              disabled={loading}
            >Ara</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">Toplam: {total} | Sayfa: {page}/{pages}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-700 text-white">
                  {['IATA','ICAO','İsim','Şehir','Ülke','Timezone'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap border-r border-slate-600 last:border-r-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Yükleniyor...</td></tr>
                )}
                {!loading && data.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                )}
                {!loading && data.map((a, idx) => (
                  <tr key={a.iata + a.icao + idx} className={`border-t border-gray-100 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/40'}`}>
                    <td className="px-4 py-2 font-mono text-blue-700 dark:text-blue-300">{a.iata || '-'}</td>
                    <td className="px-4 py-2 font-mono text-purple-700 dark:text-purple-300">{a.icao || '-'}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{a.name}</td>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{a.city}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{a.country}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{a.timezone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {pages > 1 && (
          <div className="mt-6 flex items-center gap-4 justify-center">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600"
            >Önceki</button>
            <span className="text-sm text-gray-600 dark:text-gray-300">{page}/{pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages || loading}
              className="px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600"
            >Sonraki</button>
          </div>
        )}
      </main>
    </div>
  );
}
