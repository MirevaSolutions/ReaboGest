import { useState } from 'react';
import { LayoutDashboard, Users, RefreshCw, Wallet, BarChart3, Settings, Menu, X } from 'lucide-react';

export type PageKey = 'dashboard' | 'clients' | 'reabonnements' | 'solde' | 'statistiques' | 'parametres';

type NavItem = {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'reabonnements', label: 'Réabonnements', icon: RefreshCw },
  { key: 'solde', label: 'Solde MVola', icon: Wallet },
  { key: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { key: 'parametres', label: 'Paramètres', icon: Settings },
];

type Props = {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
};

export default function Layout({ current, onNavigate, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: PageKey) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-slate-900 text-slate-100">
        <SidebarContent current={current} onNavigate={handleNavigate} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col bg-slate-900 text-slate-100">
            <SidebarContent current={current} onNavigate={handleNavigate} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded hover:bg-slate-800"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">Canal+ Manager</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>

      {/* Close button inside mobile drawer */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed top-3 right-60 z-50 p-1.5 rounded text-slate-300 hover:text-white"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function SidebarContent({
  current,
  onNavigate,
}: {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-900 font-bold text-sm">
          C+
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Canal+ Manager</p>
          <p className="text-xs text-slate-400">Gestion des abonnés</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-500">
        Version 1.0
      </div>
    </>
  );
}
