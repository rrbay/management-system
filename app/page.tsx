import Link from "next/link";

export default function Home() {
  const modules = [
    {
      name: "Crew Planning",
      description: "Hotel reservations and ticket management",
      icon: "✈️",
      href: "/modules/crew-planning",
      color: "bg-blue-500",
      subModules: ["Hotel Module", "Tickets Section"]
    },
    {
      name: "Human Resources",
      description: "Employee management, leave tracking, attendance",
      icon: "👥",
      href: "/modules/hr",
      color: "bg-emerald-500"
    },
    {
      name: "Finance",
      description: "Invoice, expense and payment tracking",
      icon: "💰",
      href: "/modules/finance",
      color: "bg-green-500"
    },
    {
      name: "CRM",
      description: "Customer relationship management",
      icon: "🤝",
      href: "/modules/crm",
      color: "bg-purple-500"
    },
    {
      name: "Inventory",
      description: "Stock and material tracking",
      icon: "📦",
      href: "/modules/inventory",
      color: "bg-orange-500"
    },
    {
      name: "Reports",
      description: "Data analysis and reporting",
      icon: "📊",
      href: "/modules/reports",
      color: "bg-indigo-500"
    },
    {
      name: "AI Assistant",
      description: "AI-powered recommendations",
      icon: "🤖",
      href: "/modules/ai",
      color: "bg-pink-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Management System
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Business Process Automation Platform
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Modules
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Select the module you need to get started
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:scale-105"
            >
              <div className={`${module.color} p-6 text-white`}>
                <div className="text-5xl mb-2">{module.icon}</div>
                <h3 className="text-xl font-bold">{module.name}</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {module.description}
                </p>
                {module.subModules && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {module.subModules.map((sub) => (
                        <span
                          key={sub}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:translate-x-2 transition-transform">
                  <span className="text-sm font-medium">Go to Module</span>
                  <span className="ml-2">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-600 dark:text-gray-400">
          <p>© 2025 Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
