import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/employees", label: "Employees", icon: "👥" },
  { to: "/tags", label: "Tags", icon: "🏷️" },
  { to: "/logs", label: "Logs", icon: "📋" },
  { to: "/config", label: "Config", icon: "⚙️" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-muted">
      {/* Sidebar */}
      <aside className="w-64 p-4 bg-background border-r">
        <Card className="p-4">
          <h2 className="text-lg font-bold mb-6 text-primary">RFID Checkin</h2>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.to
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </Card>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
