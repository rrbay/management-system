"use client";

import { useState } from "react";

export default function CrewAdminPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        setMessage(`Uploaded ${json.count} rows`);
        setFileName(input.files[0].name);
      } else {
        setMessage(`Error: ${json.error || 'unknown'}`);
      }
    } catch (err) {
      setMessage(String(err));
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h2 className="text-2xl font-semibold mb-4">Crew List Administration</h2>
      <p className="text-sm text-gray-600 mb-6">Upload the master Excel file used across systems.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="file" name="file" accept=".xlsx,.xls,.csv" />
        <div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded">Upload</button>
        </div>
      </form>
      {fileName && <p className="mt-4 text-sm">Last uploaded: {fileName}</p>}
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}
