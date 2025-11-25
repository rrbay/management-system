"use client";

import { useState, useEffect } from 'react';

export default function HotelBlockPage() {
  const [uploading, setUploading] = useState(false);
  const [lastUploadId, setLastUploadId] = useState<string | null>(null);
  const [diff, setDiff] = useState<any>(null);
  const [emailBody, setEmailBody] = useState('');
  const [excelBase64, setExcelBase64] = useState('');
  const [filename, setFilename] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [error, setError] = useState('');
  const [uploadCount, setUploadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [toEmails, setToEmails] = useState<string[]>(['']);
  const [ccEmails, setCcEmails] = useState<string[]>(['']);
  const [emailSubject, setEmailSubject] = useState('Hotel Blokaj Update');
  const [preview, setPreview] = useState<any>(null);
  const [groupByPort, setGroupByPort] = useState(true); // Varsayılan gruplu

  async function refreshUploads() {
    try {
      const res = await fetch('/api/hotel-block/uploads');
      const uploads = await res.json();
      setUploadCount(uploads.length || 0);
      if (uploads.length > 0) {
        setLastUploadId(uploads[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { refreshUploads(); }, []);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = (e.currentTarget.elements.namedItem('file') as HTMLInputElement) || null;
    if (!fileInput?.files?.[0]) {
      setError('Dosya seçilmedi');
      return;
    }
    setUploading(true); setError('');
    
    // Timeout kontrolü - 60 saniye
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    try {
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      const res = await fetch('/api/hotel-block/upload', { 
        method: 'POST', 
        body: fd,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Yükleme hatası');
      } else {
        setLastUploadId(json.uploadId);
        await refreshUploads();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('Yükleme çok uzun sürdü (timeout). Lütfen daha küçük bir dosya deneyin veya internet bağlantınızı kontrol edin.');
      } else {
        setError(String(err));
      }
    } finally {
      setUploading(false);
    }
  }

  async function buildDraft() {
    if (!lastUploadId) return;
    setLoadingDraft(true);
    try {
      const url = `/api/hotel-block/draft?uploadId=${lastUploadId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.emailBody) {
        setEmailBody(json.emailBody);
        setExcelBase64(json.excelBase64);
        setFilename(json.filename);
        setDiff(json.diff);
        setPreview(json.preview);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingDraft(false); }
  }

  function downloadExcel() {
    if (!excelBase64 || !filename) return;
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBase64}`;
    link.download = filename;
    link.click();
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
    if (!emailBody || !excelBase64 || !filename) {
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
      const res = await fetch('/api/hotel-block/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: validToEmails,
          cc: ccEmails.filter(e => e.trim()),
          subject: emailSubject,
          text: emailBody,
          excelBase64,
          filename,
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
        <h1 className="text-3xl font-bold">Hotel Blokaj</h1>
        <div className="flex items-center gap-4">
          {/* Build / Commit Bilgisi */}
          <CommitBadge />
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
          <a href="/modules/crew-planning" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">← Crew Planning</a>
        </div>
      </div>

      <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Excel Yükle</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Hotel Port, Arr Leg, Check In Date, Check Out Date, Dep Leg, Single Room Count W/O Crew kolonlarını içeren Excel dosyası yükleyin.
        </p>
        <form onSubmit={handleUpload} className="space-y-4">
          <input type="file" name="file" accept=".xlsx,.xls" className="block" />
          <button disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {uploading ? 'Yükleniyor...' : 'Yükle'}
          </button>
          {uploadCount > 0 && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch('/api/hotel-block/clear', { method: 'POST' });
                  const json = await res.json();
                  if (json.success) {
                    setLastUploadId(null);
                    setDiff(null);
                    setPreview(null);
                    setEmailBody('');
                    setExcelBase64('');
                    setFilename('');
                    await refreshUploads();
                    alert('Veriler temizlendi');
                  } else {
                    alert('Temizleme hatası: ' + (json.error || '')); 
                  }
                } catch (e: any) {
                  alert('Temizleme hatası: ' + String(e));
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Verileri Temizle
            </button>
          )}
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {diff && (
        <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Fark Analizi</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium text-green-600">Yeni Rezervasyonlar:</span> {diff.new}</p>
            <p><span className="font-medium text-yellow-600">Değişen Rezervasyonlar:</span> {diff.changed}</p>
            <p><span className="font-medium text-red-600">İptal Rezervasyonlar:</span> {diff.cancelled}</p>
          </div>
        </section>
      )}

      <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Email Taslağı</h2>
        <button onClick={buildDraft} disabled={!lastUploadId || loadingDraft} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 mb-4">
          {loadingDraft ? 'Hazırlanıyor...' : 'Taslak Oluştur'}
        </button>

        {emailBody && (
          <>
            <div className="mt-4 mb-6">
              <div className="p-4 border rounded bg-gray-50 dark:bg-gray-900 whitespace-pre-wrap text-sm">
                {emailBody}
              </div>
              {excelBase64 && (
                <div className="mt-3">
                  <button
                    onClick={downloadExcel}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel İndir ({filename})
                  </button>
                </div>
              )}
            </div>

            {/* Önizleme Tablosu */}
            {preview && preview.rows && preview.rows.length > 0 && (
              <div className="mb-6 border rounded-lg overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Excel Önizleme ({preview.rows.length} / {preview.totalRows} satır)
                  </h3>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupByPort}
                      onChange={(e) => setGroupByPort(e.target.checked)}
                      className="rounded"
                    />
                    <span>Hotel Port'a göre grupla</span>
                  </label>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Hotel Port</th>
                        <th className="px-3 py-2 text-left font-medium">Arr Leg</th>
                        <th className="px-3 py-2 text-left font-medium">Check In (Tarih/Saat)</th>
                        <th className="px-3 py-2 text-left font-medium">Check Out (Tarih/Saat)</th>
                        <th className="px-3 py-2 text-left font-medium">Dep Leg</th>
                        <th className="px-3 py-2 text-left font-medium">SNG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        if (!groupByPort) {
                          // Normal görünüm
                          return preview.rows.map((row: any, idx: number) => (
                            <>
                              <tr 
                                key={idx} 
                                className={`border-b ${
                                  row.status === 'new' ? 'text-green-700 dark:text-green-400 font-semibold' :
                                  row.status === 'changed' ? 'text-yellow-700 dark:text-yellow-400 font-semibold' :
                                  ''
                                }`}
                              >
                                <td className="px-3 py-2">{row.hotelPort}</td>
                                <td className="px-3 py-2">{row.arrLeg}</td>
                                <td className="px-3 py-2">{row.checkInDate}</td>
                                <td className="px-3 py-2">{row.checkOutDate}</td>
                                <td className="px-3 py-2">{row.depLeg}</td>
                                <td className="px-3 py-2">{row.singleRoomCount}</td>
                              </tr>
                              {row.status === 'changed' && row.changes && row.changes.length > 0 && (
                                <tr className="border-b bg-yellow-50 dark:bg-yellow-900/20 text-xs">
                                  <td colSpan={6} className="px-3 py-1 text-yellow-800 dark:text-yellow-300">
                                    Değişiklikler: {row.changes.join(' | ')}
                                  </td>
                                </tr>
                              )}
                            </>
                          ));
                        } else {
                          // Gruplu görünüm
                          const grouped: Record<string, any[]> = {};
                          preview.rows.forEach((row: any) => {
                            const port = row.hotelPort || 'BELİRTİLMEMİŞ';
                            if (!grouped[port]) grouped[port] = [];
                            grouped[port].push(row);
                          });
                          
                          return Object.entries(grouped).map(([port, rows]) => (
                            <>
                              <tr key={`header-${port}`} className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-300 dark:border-blue-700">
                                <td colSpan={6} className="px-3 py-2 font-bold text-blue-900 dark:text-blue-100">
                                  📍 {port} ({rows.length} rezervasyon)
                                </td>
                              </tr>
                              {rows.map((row: any, idx: number) => (
                                <>
                                  <tr 
                                    key={`${port}-${idx}`} 
                                    className={`border-b ${
                                      row.status === 'new' ? 'text-green-700 dark:text-green-400 font-semibold' :
                                      row.status === 'changed' ? 'text-yellow-700 dark:text-yellow-400 font-semibold' :
                                      ''
                                    }`}
                                  >
                                    <td className="px-3 py-2 pl-8">{row.hotelPort}</td>
                                    <td className="px-3 py-2">{row.arrLeg}</td>
                                    <td className="px-3 py-2">{row.checkInDate}</td>
                                    <td className="px-3 py-2">{row.checkOutDate}</td>
                                    <td className="px-3 py-2">{row.depLeg}</td>
                                    <td className="px-3 py-2">{row.singleRoomCount}</td>
                                  </tr>
                                  {row.status === 'changed' && row.changes && row.changes.length > 0 && (
                                    <tr className="border-b bg-yellow-50 dark:bg-yellow-900/20 text-xs">
                                      <td colSpan={6} className="px-3 py-1 text-yellow-800 dark:text-yellow-300">
                                        Değişiklikler: {row.changes.join(' | ')}
                                      </td>
                                    </tr>
                                  )}
                                </>
                              ))}
                            </>
                          ));
                        }
                      })()}
                      {preview.cancelled && preview.cancelled.length > 0 && preview.cancelled.map((row: any, idx: number) => (
                        <tr key={`c-${idx}`} className="border-b text-red-700 dark:text-red-400 font-semibold">
                          <td className="px-3 py-2">{row.hotelPort}</td>
                          <td className="px-3 py-2">{row.arrLeg}</td>
                          <td className="px-3 py-2">{row.checkInDate}</td>
                          <td className="px-3 py-2">{row.checkOutDate}</td>
                          <td className="px-3 py-2">{row.depLeg}</td>
                          <td className="px-3 py-2">{row.singleRoomCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="text-green-600 dark:text-green-400 font-semibold">Yeşil: Yeni</span>
                  <span className="mx-3">|</span>
                  <span className="text-yellow-600 dark:text-yellow-400 font-semibold">Sarı: Değişen</span>
                  <span className="mx-3">|</span>
                  <span className="text-red-600 dark:text-red-400 font-semibold">Kırmızı: İptal</span>
                </div>
              </div>
            )}

            {/* Email Gönderme */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold mb-4">E-posta Gönder</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Konu</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

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

              <div>
                <label className="block text-sm font-medium mb-2">Kopya (CC)</label>
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

function CommitBadge() {
  const [info, setInfo] = useState<{ shortSha: string; branch: string } | null>(null);
  useEffect(() => {
    fetch('/api/version')
      .then(r => r.json())
      .then(d => setInfo({ shortSha: d.shortSha, branch: d.branch }))
      .catch(() => {});
  }, []);
  if (!info) return null;
  return (
    <div className="text-xs px-2 py-1 rounded border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-mono">
      {info.branch}:{info.shortSha}
    </div>
  );
}
