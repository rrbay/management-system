import Link from "next/link";

export default function HotelModulePage() {
  const subModules = [
    {
      name: "Blokaj",
      description: "Aylık hotel blokaj yönetimi, Excel yükleme ve email gönderimi",
      icon: "🔒",
      href: "/modules/crew-planning/hotel-block",
      color: "bg-purple-600",
      features: [
        "Excel ile toplu yükleme",
        "Otomatik fark analizi (Yeni/Değişen/İptal)",
        "Renkli Excel taslağı oluşturma",
        "Email ile gönderim"
      ],
    },
    {
      name: "Rezervasyon",
      description: "Crew hotel rezervasyon yönetimi ve takibi",
      icon: "📅",
      href: "/modules/crew-planning/hotel-reservation",
      color: "bg-teal-600",
      features: [
        "Check-in / Check-out takibi",
        "Oda tahsisi",
        "Maliyet hesaplama",
        "Raporlama"
      ],
      status: "coming-soon"
    },
  ];

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
                ← Crew Planning
              </Link>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <span className="text-3xl mr-2">🏨</span>
                  Hotel Module
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Blokaj ve rezervasyon yönetimi
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-12">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Hotel Yönetim Sistemi
            </h2>
            <p className="text-blue-800 dark:text-blue-200">
              Hotel blokaj işlemlerini ve rezervasyonlarını tek bir yerden yönetin. 
              Excel yükleme, otomatik diff analizi ve email gönderimi ile iş akışınızı hızlandırın.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {subModules.map((module) => (
            <div key={module.href} className="relative">
              {module.status === 'coming-soon' ? (
                <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed">
                  <div className={`${module.color} p-8 text-white relative`}>
                    <div className="absolute top-4 right-4 bg-yellow-500 text-xs font-bold px-3 py-1 rounded-full">
                      Yakında
                    </div>
                    <div className="text-6xl mb-3">{module.icon}</div>
                    <h3 className="text-2xl font-bold mb-2">{module.name}</h3>
                    <p className="text-white text-opacity-90 text-sm">{module.description}</p>
                  </div>
                  <div className="p-6">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Özellikler:</h4>
                    <ul className="space-y-2 mb-4">
                      {module.features.map((feature) => (
                        <li key={feature} className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                          <span className="text-gray-400 mr-2">○</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center text-gray-400 dark:text-gray-500 font-medium">
                      <span>Geliştirme aşamasında</span>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href={module.href}
                  className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:scale-105 block"
                >
                  <div className={`${module.color} p-8 text-white`}>
                    <div className="text-6xl mb-3">{module.icon}</div>
                    <h3 className="text-2xl font-bold mb-2">{module.name}</h3>
                    <p className="text-white text-opacity-90 text-sm">{module.description}</p>
                  </div>
                  <div className="p-6">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Özellikler:</h4>
                    <ul className="space-y-2 mb-4">
                      {module.features.map((feature) => (
                        <li key={feature} className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium group-hover:translate-x-2 transition-transform">
                      <span>Modüle Git</span>
                      <span className="ml-2">→</span>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
