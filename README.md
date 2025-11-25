# Management System - İş Süreçleri Otomasyon Platformu

Şirket içi manuel süreçleri otomatikleştiren, veri analizi yapan ve yapay zeka destekli modüler bir yönetim platformu.

## 🎯 Özellikler

### Modüller
- **👥 İnsan Kaynakları**: Personel işlemleri, izin/mesai takibi
- **💰 Finans**: Fatura, harcama ve ödeme yönetimi
- **🤝 CRM**: Müşteri ilişkileri ve iletişim yönetimi
- **📦 Stok & Envanter**: Malzeme ve envanter takibi
- **📊 Raporlama**: Veri analizi ve görselleştirme
- **🤖 AI Asistan**: Yapay zeka destekli tahmin ve öneriler

## 🚀 Teknoloji Stack

- **Framework**: Next.js 14 (App Router)
- **Dil**: TypeScript
- **Styling**: Tailwind CSS
- **Veritabanı**: PostgreSQL (Prisma ORM)
- **Auth**: NextAuth.js
- **Deploy**: Vercel (Ücretsiz)

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## ☁️ Vercel Deploy

### 1. GitHub Üzerinden Otomatik
1. Vercel hesabı aç (https://vercel.com)
2. "Add New... → Project" ile GitHub reposunu (`rrbay/management-system`) içe aktar.
3. Framework otomatik: Next.js. Build komutu otomatik belirlenir ama bu projede `vercel.json` içindeki komut kullanılacak.
4. Environment Variables bölümüne aşağıdakini ekle:
	- `DATABASE_URL` → Supabase PostgreSQL bağlantı URI'si (.env içindeki değer)
	- (İleride) `NEXTAUTH_SECRET`, `OPENAI_API_KEY`
5. Deploy'e bas. İlk derlemede Prisma Client üretilecek ve migration yoksa uyarı basacaktır.

### 2. CLI ile Manuel
```bash
npm i -g vercel          # CLI kurulumu
vercel login             # Giriş yap
vercel link              # Mevcut dizini projeye bağla
vercel env add DATABASE_URL # İstendiğinde paste et
vercel env pull .env.local  # Ortam değişkenlerini local'e çekmek için (opsiyonel)
vercel deploy --prod     # Üretim deploy
```

### 3. Prisma Migration Yönetimi
- Prod veritabanına migration uygulamak için build sürecinde `npx prisma migrate deploy` çalışır (bkz. `vercel.json`).
- Lokal ortamda yeni değişiklik eklerken:
```bash
npx prisma migrate dev --name yeni-degisiklik
git add prisma/schema.prisma
git commit -m "Prisma: yeni degisiklik"
git push
```
Deploy sonrası şema otomatik senkronize olur.

### 4. Excel / Dosya İşlemleri
- `exceljs` ve `xlsx` paketleri Node.js serverless fonksiyonlarında çalışır; büyük dosyalarda süre limitini aşmamak için gereksiz veri saklamaktan kaçının.
- Renkli Excel çıktısı `Hotel Blokaj` modülü taslak endpoint'inde üretilir.

### 5. Performans / Soğuk Başlangıç
- İlk isteklerde Next.js sunucusu 500–1000ms ek derleme süresi gösterebilir (Turbopack dev modunda). Prod modunda bu süre azalır.
- Gereksiz console.log'ları prod deploy öncesi temizlemek isteyebilirsiniz.

### 6. Ortam Değişkenleri Özet
| Değişken | Amaç | Zorunlu |
|----------|------|---------|
| DATABASE_URL | PostgreSQL bağlantısı | Evet |
| NEXTAUTH_SECRET | Auth imza anahtarı | (İleride) |
| OPENAI_API_KEY | AI özellikleri | (İleride) |

### 7. Sorun Giderme
- 500 hata: Vercel logs üzerinden fonksiyon loglarını kontrol edin.
- DB bağlantı hatası: Supabase IP allowlist gerekmez; fakat şifre doğru mu kontrol edin.
- Zaman aşımı: Excel üretimi çok büyürse satır sayısını azaltın veya stream yapısı ekleyin.


## 🏗️ Proje Yapısı

```
Management/
├── app/                    # Next.js App Router
│   ├── modules/           # Modül sayfaları
│   │   ├── hr/           # İnsan Kaynakları
│   │   ├── finance/      # Finans
│   │   ├── crm/          # CRM
│   │   ├── inventory/    # Stok & Envanter
│   │   ├── reports/      # Raporlama
│   │   └── ai/           # AI Asistan
│   ├── api/              # API routes
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Ana sayfa
├── components/            # Reusable components
├── lib/                   # Utility functions
├── prisma/               # Database schema
└── public/               # Static files
```

## 🔧 Geliştirme

### Yeni Modül Ekleme

1. `app/modules/` altına yeni klasör oluştur
2. Modül sayfasını ve bileşenlerini ekle
3. Ana sayfadaki modül listesine ekle

## 📝 Lisans

ISC

## 👨‍💻 Geliştirici

Berke Ay

# Last updated: 2025-11-25 14:50:42
