"use client";

import { useEffect, useState } from "react";

type CrewMember = {
  id: string;
  employeeCode: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  rank: string | null;
  position: string | null;
  department: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  email: string | null;
  phone: string | null;
  status: string;
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

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/crew?page=${page}&limit=50`);
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

  // Get all column names from rawData
  const getAllColumns = () => {
    if (data.length === 0 || !data[0].rawData) return [];
    return Object.keys(data[0].rawData);
  };

  const columns = getAllColumns();

  if (loading) return <div className="p-6">Loading crew list...</div>;

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Crew List ({total} total)</h2>
        <a href="/modules/team-planning/admin" className="text-blue-600 hover:underline">
          Back to Admin
        </a>
      </div>

      {data.length === 0 ? (
        <div className="text-gray-500">No crew members found. Upload an Excel file first.</div>
      ) : (
        <>
          <div className="overflow-auto border rounded">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((member, i) => (
                  <tr key={member.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-sm text-gray-800 whitespace-nowrap">
                        {member.rawData?.[col] !== null && member.rawData?.[col] !== undefined 
                          ? String(member.rawData[col]) 
                          : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
