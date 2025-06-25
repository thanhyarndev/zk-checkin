import { Link, useLocation } from "react-router-dom";

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    icon: "📊",
    description: "Overview & Analytics",
  },
  {
    to: "/employees",
    label: "Employees",
    icon: "👥",
    description: "Manage Staff",
  },
  {
    to: "/tags",
    label: "RFID Tags",
    icon: "🏷️",
    description: "Tag Management",
  },
  {
    to: "/logs",
    label: "Activity Logs",
    icon: "📋",
    description: "System Logs",
  },
  {
    to: "/config",
    label: "Settings",
    icon: "⚙️",
    description: "System Config",
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar */}
      <aside className="w-72 bg-white shadow-xl border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">RF</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">RFID Checkin</h1>
              <p className="text-sm text-slate-500">Management System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                )}

                {/* Icon */}
                <span
                  className={`text-xl transition-transform duration-200 ${
                    isActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                >
                  {item.icon}
                </span>

                {/* Text */}
                <div className="flex-1">
                  <div
                    className={`font-medium ${
                      isActive ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {item.label}
                  </div>
                  <div
                    className={`text-xs ${
                      isActive ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="text-center">
            <p className="text-xs text-slate-500">System Status</p>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-slate-700">Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
