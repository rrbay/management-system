"use client";

import { useState, useEffect } from 'react';

export default function TicketingPage() {
  const [uploading, setUploading] = useState(false);
  const [lastUploadId, setLastUploadId] = useState<string | null>(null);
  const [diff, setDiff] = useState<any>(null);
  const [emailDraft, setEmailDraft] = useState<string>('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [error, setError] = useState<string>('');

  async function refreshDiff() {
    try {
      const res = await fetch('/api/ticketing/diff');
      const json = await res.json();
      if (json.diff) {
        setDiff(json.diff);
        setLastUploadId(json.currUploadId);
      } else {
        setDiff(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { refreshDiff(); }, []);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = (e.currentTarget.elements.namedItem('file') as HTMLInputElement) || null;
    if (!fileInput?.files?.[0]) {
      setError('Dosya seçilmedi');
      return;
    }
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      const res = await fetch('/api/ticketing/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Yükleme hatası');
      } else {
        setLastUploadId(json.uploadId);
        await refreshDiff();
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

  async function buildEmail() {
    if (!lastUploadId) return;
    setLoadingDraft(true);
    try {
      const res = await fetch(`/api/ticketing/draft?uploadId=${lastUploadId}`);
      const json = await res.json();
      if (json.email) setEmailDraft(json.email);
    } catch (e) { console.error(e); }
    finally { setLoadingDraft(false); }
  }

  return (
    <div className="max-w-6xl mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Ticketing - Rezervasyon Talepleri</h1>
        <div className="flex gap-2">
          <a href="/modules/crew-planning" className="text-sm text-gray-600 hover:text-gray-900">← Crew Planning</a>
        </div>
      </div>

      <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Excel Yükle</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Son iki yükleme otomatik karşılaştırılır. Üçüncü yükleme önceki ilk kaydı siler.</p>
        <form onSubmit={handleUpload} className="space-y-4">
          <input type="file" name="file" accept=".xlsx,.xls" className="block" />
          <button disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {uploading ? 'Yükleniyor...' : 'Yükle'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Fark Analizi</h2>
        {!diff && <p className="text-sm text-gray-500">Henüz karşılaştırma verisi yok.</p>}
        {diff && (
          <div className="space-y-4 text-sm">
            <p><span className="font-medium">Yeni Uçuşlar:</span> {diff.newFlights.length}</p>
            <p><span className="font-medium">İptal Uçuşlar:</span> {diff.cancelledFlights.length}</p>
            <p><span className="font-medium">Değişen Uçuşlar:</span> {diff.changedFlights.length}</p>
            <details className="border rounded p-3">
              <summary className="cursor-pointer font-medium">Detaylar</summary>
              <div className="mt-2 space-y-3">
                {Object.entries(diff.details).map(([key, val]: any) => (
                  <div key={key} className="border-b pb-2">
                    <p className="font-mono text-xs break-all">{key}</p>
                    {val.changes && val.changes.length > 0 && (
                      <ul className="list-disc ml-5 mt-1">
                        {val.changes.map((c: string, i: number) => <li key={i}>{c}</li>)}
                      </ul>
                    )}
                    {!val.changes && val.curr && <p className="text-gray-500">Yeni uçuş</p>}
                    {!val.changes && val.prev && <p className="text-gray-500">İptal edildi</p>}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </section>

      <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">E-posta Taslağı</h2>
        <button onClick={buildEmail} disabled={!lastUploadId || loadingDraft} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {loadingDraft ? 'Hazırlanıyor...' : 'Taslak Oluştur'}
        </button>
        {emailDraft && (
          <div className="mt-4">
            <textarea value={emailDraft} readOnly rows={15} className="w-full text-xs font-mono p-3 border rounded bg-gray-50 dark:bg-gray-700" />
            <p className="text-xs text-gray-500 mt-2">Tab karakterleri \t şeklindedir. Mail istemcisinde tabloya dönüştürebilirsiniz.</p>
          </div>
        )}
      </section>
    </div>
  );
}
