import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Users,
  RefreshCw,
  Wallet,
  CalendarClock,
  ChevronRight,
  Phone,
  CreditCard,
} from 'lucide-react';
import { supabase, type ClientWithSubscriptions } from '@/lib/supabase';
import { formatDate, formatPrice, getStatus, statusLabels, statusClasses, type SubscriptionStatus } from '@/lib/status';
import { getMvolaBalance } from '@/lib/mvola';

type Props = {
  onOpenClient: (clientId: string) => void;
};

type UpcomingItem = {
  client: ClientWithSubscriptions;
  subId: string;
  numero_abonne: string | null;
  numero_carte: string | null;
  date_fin: string | null;
  status: SubscriptionStatus;
};

export default function DashboardPage({ onOpenClient }: Props) {
  const [revenuToday, setRevenuToday] = useState(0);
  const [reabonnementsToday, setReabonnementsToday] = useState(0);
  const [solde, setSolde] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const todayStr = new Date().toISOString().slice(0, 10);

    const [
      reabTodayResult,
      soldeVal,
      clientsResult,
    ] = await Promise.all([
      supabase
        .from('reabonnements')
        .select('id, montant, date_reabonnement')
        .eq('date_reabonnement', todayStr),
      getMvolaBalance(),
      supabase
        .from('clients')
        .select('*, subscriptions(*, formula:formulas(*))')
        .order('nom_complet', { ascending: true }),
    ]);

    // Revenu et nombre de réabonnements aujourd'hui
    const reabs = reabTodayResult.data ?? [];
    const totalRevenu = reabs.reduce((sum, r) => sum + r.montant, 0);
    setRevenuToday(totalRevenu);
    setReabonnementsToday(reabs.length);

    // Solde
    setSolde(soldeVal);

    // Réabonnements à venir : abonnements triés par date de fin
    const allClients = (clientsResult.data ?? []) as ClientWithSubscriptions[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: UpcomingItem[] = [];
    allClients.forEach((c) => {
      (c.subscriptions ?? []).forEach((s) => {
        if (!s.date_fin) return;
        const end = new Date(s.date_fin);
        end.setHours(0, 0, 0, 0);
        const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        // Inclure : expire aujourd'hui (0), demain (1), bientôt (2-7)
        if (diffDays >= 0 && diffDays <= 7) {
          items.push({
            client: c,
            subId: s.id,
            numero_abonne: s.numero_abonne,
            numero_carte: s.numero_carte,
            date_fin: s.date_fin,
            status: getStatus(s.date_fin),
          });
        }
      });
    });

    items.sort((a, b) => {
      const da = a.date_fin ?? '9999-12-31';
      const db = b.date_fin ?? '9999-12-31';
      return da.localeCompare(db);
    });

    setUpcoming(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayItems = upcoming.filter((i) => i.status === 'expire_aujourd_hui');
  const tomorrowItems = upcoming.filter((i) => i.status === 'expire_demain');
  const soonItems = upcoming.filter((i) => i.status === 'actif');

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Dashboard</h1>

      {/* 4 cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Banknote}
          label="Revenu aujourd'hui"
          value={formatPrice(revenuToday)}
          color="emerald"
          loading={loading}
        />
        <StatCard
          icon={Users}
          label="Clients aujourd'hui"
          value={String(reabonnementsToday)}
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={RefreshCw}
          label="Réabonnements aujourd'hui"
          value={String(reabonnementsToday)}
          color="amber"
          loading={loading}
        />
        <StatCard
          icon={Wallet}
          label="Solde MVola"
          value={formatPrice(solde)}
          color="slate"
          loading={loading}
        />
      </div>

      {/* Réabonnements à venir */}
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            Réabonnements à venir
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-slate-400">Chargement…</div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            Aucun réabonnement à venir dans les 7 prochains jours.
          </div>
        ) : (
          <div className="space-y-6">
            <UpcomingSection
              title="Aujourd'hui"
              items={todayItems}
              onOpenClient={onOpenClient}
            />
            <UpcomingSection
              title="Demain"
              items={tomorrowItems}
              onOpenClient={onOpenClient}
            />
            <UpcomingSection
              title="Bientôt"
              items={soonItems}
              onOpenClient={onOpenClient}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  color: 'emerald' | 'blue' | 'amber' | 'slate';
  loading: boolean;
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg sm:text-xl font-bold text-slate-900">
        {loading ? '—' : value}
      </p>
    </div>
  );
}

function UpcomingSection({
  title,
  items,
  onOpenClient,
}: {
  title: string;
  items: UpcomingItem[];
  onOpenClient: (clientId: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900">
          {title} <span className="text-slate-400 font-normal">({items.length})</span>
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div
            key={item.subId}
            className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50"
          >
            {/* Mobile: stacked */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-900 truncate">{item.client.nom_complet}</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses[item.status]}`}
                >
                  {statusLabels[item.status]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {item.client.telephone || '—'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {item.numero_abonne || '—'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {item.numero_carte || '—'}
                </span>
                <span>Fin : {formatDate(item.date_fin)}</span>
              </div>
            </div>
            <button
              onClick={() => onOpenClient(item.client.id)}
              className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title="Ouvrir le client"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
