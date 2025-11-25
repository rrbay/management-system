"use client";

import { useState, useEffect } from 'react';

export default function TicketingPage() {
  const [uploading, setUploading] = useState(false);
  const [lastUploadId, setLastUploadId] = useState<string | null>(null);
  const [diff, setDiff] = useState<any>(null);
  const [emailDraft, setEmailDraft] = useState<string>('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [error, setError] = useState<string>('');
  const [showAll, setShowAll] = useState(false);
  const [includePast, setIncludePast] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [sending, setSending] = useState(false);
  const [toEmails, setToEmails] = useState<string[]>(['']);
  const [ccEmails, setCcEmails] = useState<string[]>(['']);
  const [emailSubject, setEmailSubject] = useState('Crew Ticketing Request');

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
      // Upload sayısını da al
      const uploadsRes = await fetch('/api/ticketing/uploads');
      const uploadsData = await uploadsRes.json();
      setUploadCount(uploadsData.length || 0);
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
      const url = `/api/ticketing/draft?uploadId=${lastUploadId}${showAll ? '&showAll=1' : ''}${includePast ? '&includePast=1' : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.email) setEmailDraft(json.email);
    } catch (e) { console.error(e); }
    finally { setLoadingDraft(false); }
  }

  async function clearAllUploads() {
    if (!confirm('Tüm yüklenen dosyalar ve uçuş kayıtları silinecek. Emin misiniz?')) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch('/api/ticketing/clear', { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Temizleme başarısız');
      } else {
        setUploadCount(0);
        setDiff(null);
        setLastUploadId(null);
        setEmailDraft('');
        alert('Tüm kayıtlar başarıyla silindi');
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setClearing(false);
    }
  }

  const addEmailField = (type: 'to' | 'cc') => {
    if (type === 'to') {
      setToEmails([...toEmails, '']);
    } else {
      setCcEmails([...ccEmails, '']);
    }
  };

  const removeEmailField = (type: 'to' | 'cc', index: number) => {
    if (type === 'to') {
      const newTo = toEmails.filter((_, i) => i !== index);
      setToEmails(newTo.length > 0 ? newTo : ['']);
    } else {
      setCcEmails(ccEmails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (type: 'to' | 'cc', index: number, value: string) => {
    if (type === 'to') {
      const newTo = [...toEmails];
      newTo[index] = value;
      setToEmails(newTo);
    } else {
      const newCc = [...ccEmails];
      newCc[index] = value;
      setCcEmails(newCc);
    }
  };

  async function sendEmail() {
    if (!emailDraft) {
      alert('Önce taslak oluşturun');
      return;
    }

    const validToEmails = toEmails.filter(e => e.trim());
    if (validToEmails.length === 0) {
      alert('En az bir alıcı adresi girin');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/ticketing/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: validToEmails,
          cc: ccEmails.filter(e => e.trim()),
          subject: emailSubject,
          html: emailDraft,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Email gönderme başarısız');
        alert(json.error || 'Email gönderme başarısız');
      } else {
        alert('Email başarıyla gönderildi!');
      }
    } catch (err: any) {
      setError(String(err));
      alert('Email gönderme hatası: ' + String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Ticketing - Rezervasyon Talepleri</h1>
        <div className="flex items-center gap-4">
          {/* Durum Göstergesi */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {uploadCount === 0 && 'Dosya yüklenmedi'}
              {uploadCount === 1 && '1. dosya yüklendi'}
              {uploadCount >= 2 && 'Her iki dosya yüklendi'}
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
              ({uploadCount}/2)
            </span>
          </div>

          {uploadCount > 0 && (
            <button
              onClick={clearAllUploads}
              disabled={clearing}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {clearing ? 'Temizleniyor...' : 'Tüm Kayıtları Temizle'}
            </button>
          )}

          <a href="/modules/crew-planning" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">← Crew Planning</a>
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
        <div className="flex items-center gap-4 mb-4">
          <button onClick={buildEmail} disabled={!lastUploadId || loadingDraft} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {loadingDraft ? 'Hazırlanıyor...' : 'Taslak Oluştur'}
          </button>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={showAll} 
              onChange={(e) => setShowAll(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-gray-700 dark:text-gray-300">Tüm Rezervasyonları Göster</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={includePast} 
              onChange={(e) => setIncludePast(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-gray-700 dark:text-gray-300">Geçmiş biletleri göster (gri)</span>
          </label>
        </div>

        {emailDraft && (
          <>
            {/* Email Preview */}
            <div className="mt-4 mb-6">
              <div 
                className="w-full p-4 border rounded overflow-auto max-h-96"
                style={{ backgroundColor: 'white', color: 'black' }}
                dangerouslySetInnerHTML={{ __html: emailDraft }}
              />
              <button 
                onClick={() => navigator.clipboard.writeText(emailDraft)}
                className="mt-3 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                HTML Kopyala
              </button>
            </div>

            {/* Email Gönderme Formu */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold mb-4">E-posta Gönder</h3>
              
              {/* Konu */}
              <div>
                <label className="block text-sm font-medium mb-2">Konu</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Email konusu"
                />
              </div>

              {/* To (Alıcılar) */}
              <div>
                <label className="block text-sm font-medium mb-2">Alıcılar (To)</label>
                {toEmails.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail('to', index, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      placeholder="email@example.com"
                    />
                    {toEmails.length > 1 && (
                      <button
                        onClick={() => removeEmailField('to', index)}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addEmailField('to')}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  + Alıcı Ekle
                </button>
              </div>

              {/* CC (Kopya) */}
              <div>
                <label className="block text-sm font-medium mb-2">Kopya (CC) - Opsiyonel</label>
                {ccEmails.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail('cc', index, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      placeholder="email@example.com"
                    />
                    <button
                      onClick={() => removeEmailField('cc', index)}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addEmailField('cc')}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  + CC Ekle
                </button>
              </div>

              {/* Gönder Butonu */}
              <button
                onClick={sendEmail}
                disabled={sending}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {sending ? 'Gönderiliyor...' : 'E-posta Gönder'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
