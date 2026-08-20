import { useState } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';

export type PageKey =
  | 'dashboard'
  | 'clients'
  | 'reabonnements'
  | 'solde'
  | 'statistiques'
  | 'parametres';

type NavItem = {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    key: 'clients',
    label: 'Clients',
    icon: Users,
  },
  {
    key: 'reabonnements',
    label: 'Réabonnements',
    icon: RefreshCw,
  },
  {
    key: 'solde',
    label: 'Solde MVola',
    icon: Wallet,
  },
  {
    key: 'statistiques',
    label: 'Statistiques',
    icon: BarChart3,
  },
  {
    key: 'parametres',
    label: 'Paramètres',
    icon: Settings,
  },
];

type Props = {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
};

export default function Layout({
  current,
  onNavigate,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: PageKey) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-slate-800 bg-slate-900 md:flex md:flex-col">
        <SidebarContent
          current={current}
          onNavigate={handleNavigate}
        />
      </aside>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="relative flex h-full w-56 flex-col bg-slate-900">
            <SidebarContent
              current={current}
              onNavigate={handleNavigate}
            />

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center text-slate-400 hover:text-white"
              aria-label="Fermer le menu"
            >
              <X className="h-4 w-4" />
            </button>
          </aside>
        </div>
      )}

      {/* Application */}
      <div className="min-h-screen md:pl-56">
        {/* Header mobile */}
        <header className="flex h-12 items-center border-b border-slate-200 bg-white px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-7 w-7 items-center justify-center text-slate-500 hover:text-slate-900"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <span className="ml-3 text-sm font-semibold text-slate-900">
            ReaboGest
          </span>
        </header>

        {/* Contenu */}
        <main className="min-h-[calc(100vh-3rem)] p-4 md:min-h-screen md:p-5">
          {children}
        </main>
      </div>
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
      {/* En-tête */}
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <div>
          <p className="text-sm font-semibold text-white">
            ReaboGest
          </p>

          <p className="text-[11px] text-slate-500">
            Gestion des abonnés
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={`mx-2 mb-0.5 flex w-[calc(100%-1rem)] items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />

              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bas de sidebar */}
      <div className="border-t border-slate-800 px-4 py-3">
        <p className="text-[11px] text-slate-600">
          ReaboGest · Version 1.0
        </p>
      </div>
    </>
  );
}