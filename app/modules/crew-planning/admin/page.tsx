"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type MetaInfo = {
  exists: boolean;
  needsUpdate: boolean;
  message: string;
  filename?: string;
  uploadedAt?: string;
  rowCount?: number;
  daysSinceUpload?: number;
};

export default function CrewUploadPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeta();
  }, []);

  async function loadMeta() {
    try {
      const res = await fetch('/api/crew/meta');
      const data = await res.json();
      setMeta(data);
    } catch (err) {
      console.error('Error loading meta:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input[name="file"]') as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      setMessage('Please select a file');
      return;
    }
    const fd = new FormData();
    fd.append('file', input.files[0]);
    setMessage('Uploading...');

    try {
      const res = await fetch('/api/crew/upload', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setMessage(`✓ Successfully uploaded ${json.count} crew members`);
        setFileName(input.files[0].name);
        await loadMeta();
      } else {
        setMessage(`Error: ${json.error || 'unknown'}`);
      }
    } catch (err) {
      setMessage(String(err));
    }
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
                ← Back to Crew Planning
              </Link>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <span className="text-3xl mr-2">👥</span>
                  Crew List Upload
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload the master crew Excel file
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!loading && meta && (
          <div className={`mb-8 p-6 rounded-xl border-2 ${
            meta.needsUpdate
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
              : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
          }`}>
            <div className="flex items-start">
              <div className="text-3xl mr-4">
                {meta.needsUpdate ? '⚠️' : '✓'}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-2 ${
                  meta.needsUpdate
                    ? 'text-yellow-900 dark:text-yellow-100'
                    : 'text-green-900 dark:text-green-100'
                }`}>
                  {meta.needsUpdate ? 'Update Required' : 'Up to Date'}
                </h3>
                <p className={`text-sm mb-3 ${
                  meta.needsUpdate
                    ? 'text-yellow-800 dark:text-yellow-200'
                    : 'text-green-800 dark:text-green-200'
                }`}>
                  {meta.message}
                </p>
                {meta.exists && (
                  <div className={`text-sm space-y-1 ${
                    meta.needsUpdate
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}>
                    <p><strong>File:</strong> {meta.filename}</p>
                    <p><strong>Crew Members:</strong> {meta.rowCount}</p>
                    <p><strong>Last Updated:</strong> {new Date(meta.uploadedAt!).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upload New Crew List</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Upload an Excel file (.xlsx, .xls) containing the crew member information.
            This list will be used across all systems.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Excel File</label>
              <input
                type="file"
                name="file"
                accept=".xlsx,.xls,.csv"
                className="block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none p-2.5"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Upload Crew List
              </button>
              <Link
                href="/modules/crew-planning/crew"
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                View Current List
              </Link>
            </div>
          </form>
          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              message.includes('✓')
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : message.includes('Error')
                ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
            }`}>
              {message}
            </div>
          )}
        </div>
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 Important Notes</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <li>• The crew list should be updated at least once a week</li>
            <li>• All crew information will be stored securely in the database</li>
            <li>• Uploading a new file will add new crew members to the database</li>
            <li>• Make sure your Excel file has proper column headers</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
