"use client";

import { useEffect, useState } from "react";

type AnyObject = { [k: string]: any };

export default function CrewListPage() {
  const [data, setData] = useState<AnyObject[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/crew');
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        setData(rows);

        // try to get headers from meta file
        const metaRes = await fetch('/data/crew-meta.json');
        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (Array.isArray(meta.headers)) setHeaders(meta.headers);
        }
      } catch (err) {
        // ignore for now
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading crew list...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Crew List</h2>
      <div className="overflow-auto border rounded">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {(headers.length ? headers : Object.keys(data[0] || {})).map((h) => (
                <th key={h} className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {(headers.length ? headers : Object.keys(row)).map((col) => (
                  <td key={col} className="px-3 py-2 text-sm text-gray-800 align-top">
                    {String((row as AnyObject)[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <a href="/modules/team-planning/admin" className="text-blue-600">Back to Admin</a>
      </div>
    </div>
  );
}
