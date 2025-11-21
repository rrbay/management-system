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
