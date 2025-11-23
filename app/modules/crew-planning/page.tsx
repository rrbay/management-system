import Link from "next/link";

export default function CrewPlanningPage() {
  const subModules = [
    {
      name: "Hotel Module",
      description: "Hotel reservations, accommodation planning and tracking",
      icon: "🏨",
      href: "/modules/crew-planning/hotel",
      color: "bg-blue-600",
      features: ["Reservation Management", "Price Comparison", "Booking Tracking"],
    },
    {
      name: "Tickets Section",
      description: "Flight, bus and train ticket management",
      icon: "🎫",
      href: "/modules/crew-planning/tickets",
      color: "bg-indigo-600",
      features: ["Ticket Booking", "Travel Planning", "Cost Tracking"],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Home
              </Link>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <span className="text-3xl mr-2">✈️</span>
                  Crew Planning
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Hotel and ticket reservation management
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-12">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Crew Planning Module
              </h2>
              <p className="text-blue-800 dark:text-blue-200">
                Easily plan crew travels, make hotel reservations and manage transportation tickets
                from one place. Optimize costs with automatic price comparison and reporting features.
              </p>
            </div>
            <Link
              href="/modules/crew-planning/admin"
              className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              👥 Crew List
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {subModules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:scale-105"
            >
              <div className={`${module.color} p-8 text-white`}>
                <div className="text-6xl mb-3">{module.icon}</div>
                <h3 className="text-2xl font-bold mb-2">{module.name}</h3>
                <p className="text-blue-100 text-sm">{module.description}</p>
              </div>
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Features:</h4>
                <ul className="space-y-2 mb-4">
                  {module.features.map((feature) => (
                    <li key={feature} className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-2 transition-transform">
                  <span>Go to Module</span>
                  <span className="ml-2">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Reservations</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">0</p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month's Travels</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">0</p>
              </div>
              <div className="text-4xl">✈️</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Spending</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">$0</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
