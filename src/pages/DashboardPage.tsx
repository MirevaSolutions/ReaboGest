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
  Inbox,
} from 'lucide-react';
import { supabase, type ClientWithSubscriptions } from '@/lib/supabase';
import { formatDate, formatPrice, getStatus, statusLabels, statusClasses, type SubscriptionStatus } from '@/lib/status';
import { getMvolaBalance } from '@/lib/mvola';
import { todayLocal } from '@/lib/date';

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
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const todayStr = todayLocal();

    const [reabTodayResult, soldeVal, clientsResult] = await Promise.all([
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

    const reabs = reabTodayResult.data ?? [];
    const totalRevenu = reabs.reduce((sum, r) => sum + r.montant, 0);
    setRevenuToday(totalRevenu);
    // TODO: si 'reabonnements' contient un client_id, compter les clients
    // distincts ici plutôt que reabs.length pour différencier des réabonnements.
    setReabonnementsToday(reabs.length);

    setSolde(soldeVal);

    const allClients = (clientsResult.data ?? []) as ClientWithSubscriptions[];
    const today = new Date(todayStr + 'T00:00:00');

    const items: UpcomingItem[] = [];
    allClients.forEach((c) => {
      (c.subscriptions ?? []).forEach((s) => {
        if (!s.date_fin) return;
        const end = new Date(s.date_fin + 'T00:00:00');
        const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayItems = upcoming.filter((i) => i.status === 'expire_aujourd_hui');
  const tomorrowItems = upcoming.filter((i) => i.status === 'expire_demain');
  const soonItems = upcoming.filter((i) => i.status === 'actif');

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* 4 cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
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
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          Réabonnements à venir
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-md bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-md border border-slate-200 p-6 text-center">
            <Inbox className="h-5 w-5 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Aucun réabonnement à venir dans les 7 prochains jours.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <UpcomingSection title="Aujourd'hui" items={todayItems} onOpenClient={onOpenClient} accent="border-rose-400" />
            <UpcomingSection title="Demain" items={tomorrowItems} onOpenClient={onOpenClient} accent="border-amber-400" />
            <UpcomingSection title="Bientôt" items={soonItems} onOpenClient={onOpenClient} accent="border-slate-200" />
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
    emerald: 'text-emerald-600 border-emerald-200',
    blue: 'text-blue-600 border-blue-200',
    amber: 'text-amber-600 border-amber-200',
    slate: 'text-slate-600 border-slate-200',
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 p-3 sm:p-4">
      <div className={`flex h-7 w-7 items-center justify-center rounded border ${colorMap[color]} mb-2`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-xs text-slate-400 mb-0.5 truncate">{label}</p>
      {loading ? (
        <div className="h-5 w-16 rounded bg-slate-100 animate-pulse" />
      ) : (
        <p className="text-base sm:text-lg font-bold text-slate-900">{value}</p>
      )}
    </div>
  );
}

function UpcomingSection({
  title,
  items,
  onOpenClient,
  accent,
}: {
  title: string;
  items: UpcomingItem[];
  onOpenClient: (clientId: string) => void;
  accent: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
          {title} <span className="text-slate-400 font-normal normal-case">({items.length})</span>
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div
            key={item.subId}
            className={`px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 border-l-2 ${accent}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-900 truncate">{item.client.nom_complet}</p>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusClasses[item.status]}`}
                >
                  {statusLabels[item.status]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
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
              className="shrink-0 p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              title="Ouvrir le client"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}