"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CrewMember = {
  id: string;
  rawData: any;
  import?: {
    filename: string;
    uploadedAt: string;
  };
};

export default function CrewListPage() {
  const [data, setData] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const [columns, setColumns] = useState<string[]>([]);
  useEffect(() => {
    async function loadMeta() {
      try {
        const metaRes = await fetch('/api/crew/meta');
        const metaData = await metaRes.json();
        if (metaData.exists && Array.isArray(metaData.headers)) {
          setColumns(metaData.headers);
        }
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/crew?page=${page}&limit=100`);
        const json = await res.json();
        setData(Array.isArray(json.data) ? json.data : []);
        if (json.pagination) {
          setTotal(json.pagination.total);
          setPages(json.pagination.pages);
        }
      } catch (err) {
        console.error('Error loading crew:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-lg">Loading crew list...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/modules/team-planning/admin"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Upload
              </Link>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <span className="text-3xl mr-2">📋</span>
                  Crew List
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {total} crew members total
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-full px-4 sm:px-6 lg:px-8 py-8">
        {data.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Crew Data Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upload an Excel file to see crew member information here.
            </p>
            <Link
              href="/modules/team-planning/admin"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Upload Crew List
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800">
                    <tr>
                      {columns.map((col, idx) => (
                        <th
                          key={idx}
                          className="sticky top-0 backdrop-blur bg-blue-600/95 dark:bg-blue-700/95 px-4 py-3 text-left font-bold text-white whitespace-nowrap border-r border-blue-500 dark:border-blue-600 last:border-r-0 shadow-md"
                        >
                          <span className="text-xs uppercase tracking-wider">{col.replace(/İ/g, 'I')}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.map((member, rowIdx) => (
                      <tr
                        key={member.id} 
                        className={`transition-colors ${rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/40'} hover:bg-blue-50 hover:dark:bg-blue-900/30`}
                      >
                        {columns.map((col, colIdx) => (
                          <td 
                            key={colIdx}
                            className="px-4 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap border-r border-gray-200 dark:border-gray-700 last:border-r-0 font-medium"
                          >
                            {(() => {
                              const val = member.rawData?.[col];
                              if (val === null || val === undefined || val === '') return '';
                              // Excel serial date detection
                              if (typeof val === 'number' && val > 25569 && val < 80000) {
                                const date = new Date((val - 25569) * 86400 * 1000);
                                return date.toLocaleDateString('tr-TR');
                              }
                              // Numeric string that might be excel date
                              if (typeof val === 'string' && /^\d+$/.test(val)) {
                                const num = Number(val);
                                if (num > 25569 && num < 80000) {
                                  const date = new Date((num - 25569) * 86400 * 1000);
                                  return date.toLocaleDateString('tr-TR');
                                }
                              }
                              // Pattern dates (dd.mm.yyyy, dd/mm/yyyy)
                              if (typeof val === 'string' && /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.test(val)) {
                                const m = val.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)!;
                                const d = m[1].padStart(2,'0');
                                const mn = m[2].padStart(2,'0');
                                let y = m[3];
                                if (y.length === 2) y = Number(y) > 50 ? '19'+y : '20'+y;
                                return `${d}.${mn}.${y}`;
                              }
                              // ISO date string
                              if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                                const [y,m,d] = val.split('-');
                                return `${d}.${m}.${y}`;
                              }
                              return String(val);
                            })()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow border border-gray-200 dark:border-gray-700 w-fit mx-auto">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-5 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-300 text-sm">Page</span>
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-semibold shadow">{page}</span>
                  <span className="text-gray-600 dark:text-gray-300 text-sm">/ {pages}</span>
                </div>
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="px-5 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
