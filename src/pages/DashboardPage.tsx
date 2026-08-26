import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Clock3,
  AlertCircle,
} from 'lucide-react';

import type { ClientWithSubscriptions } from '@/lib/supabase';
import { getDashboardData } from '@/services/dashboard.service';
import {
  formatDate,
  formatPrice,
  statusLabels,
  statusClasses,
  type SubscriptionStatus,
} from '@/lib/status';

type Props = {
  onOpenClient: (clientId: string) => void;
};

type FilterType =
  | 'tous'
  | 'aujourd_hui'
  | 'demain'
  | '7_jours'
  | 'expires';

type UpcomingItem = {
  client: ClientWithSubscriptions;
  subId: string;
  numero_abonne: string | null;
  numero_carte: string | null;
  date_fin: string | null;
  status: SubscriptionStatus;
};

export default function DashboardPage({
  onOpenClient,
}: Props) {
  const [revenuToday, setRevenuToday] = useState(0);
  const [reabonnementsToday, setReabonnementsToday] =
    useState(0);
  const [solde, setSolde] = useState(0);

  const [upcoming, setUpcoming] = useState<
    UpcomingItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] =
    useState<FilterType>('tous');

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await getDashboardData();

        setRevenuToday(data.revenuToday);
        setReabonnementsToday(
          data.reabonnementsToday
        );
        setSolde(data.solde);
        setUpcoming(data.upcoming);
      } catch (error) {
        console.error(
          'Erreur chargement dashboard:',
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'aujourd_hui':
        return upcoming.filter(
          (item) =>
            item.status === 'expire_aujourd_hui'
        );

      case 'demain':
        return upcoming.filter(
          (item) =>
            item.status === 'expire_demain'
        );

      case '7_jours':
        return upcoming.filter(
          (item) =>
            item.status === 'actif'
        );

      case 'expires':
        return upcoming.filter(
          (item) =>
            item.status === 'expire'
        );

      case 'tous':
      default:
        return upcoming;
    }
  }, [upcoming, filter]);

  const filterCount = (type: FilterType) => {
    switch (type) {
      case 'aujourd_hui':
        return upcoming.filter(
          (item) =>
            item.status === 'expire_aujourd_hui'
        ).length;

      case 'demain':
        return upcoming.filter(
          (item) =>
            item.status === 'expire_demain'
        ).length;

      case '7_jours':
        return upcoming.filter(
          (item) =>
            item.status === 'actif'
        ).length;

      case 'expires':
        return upcoming.filter(
          (item) =>
            item.status === 'expire'
        ).length;

      case 'tous':
      default:
        return upcoming.length;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-slate-900">
          Dashboard
        </h1>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              refreshing ? 'animate-spin' : ''
            }`}
          />
          Actualiser
        </button>
      </div>

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

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            Réabonnements
          </h2>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterButton
            label="Tous"
            count={filterCount('tous')}
            active={filter === 'tous'}
            onClick={() => setFilter('tous')}
          />

          <FilterButton
            label="Aujourd'hui"
            count={filterCount('aujourd_hui')}
            active={filter === 'aujourd_hui'}
            onClick={() =>
              setFilter('aujourd_hui')
            }
          />

          <FilterButton
            label="Demain"
            count={filterCount('demain')}
            active={filter === 'demain'}
            onClick={() => setFilter('demain')}
          />

          <FilterButton
            label="7 prochains jours"
            count={filterCount('7_jours')}
            active={filter === '7_jours'}
            onClick={() => setFilter('7_jours')}
          />

          <FilterButton
            label="Expirés non réabonnés"
            count={filterCount('expires')}
            active={filter === 'expires'}
            onClick={() => setFilter('expires')}
            danger
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 rounded-md bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <UpcomingList
            items={filteredItems}
            onOpenClient={onOpenClient}
          />
        )}
      </div>
    </div>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
  danger = false,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1.5
        rounded-md
        border
        text-xs font-medium
        transition-colors
        ${
          active
            ? danger
              ? 'bg-rose-50 border-rose-300 text-rose-700'
              : 'bg-slate-800 border-slate-800 text-white'
            : danger
              ? 'bg-white border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-700'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900'
        }
      `}
    >
      {label}

      <span
        className={`
          min-w-4 h-4 px-1
          inline-flex items-center justify-center
          rounded-full
          text-[10px]
          ${
            active
              ? danger
                ? 'bg-rose-100 text-rose-700'
                : 'bg-white/15 text-white'
              : 'bg-slate-100 text-slate-500'
          }
        `}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({
  filter,
}: {
  filter: FilterType;
}) {
  const content = {
    tous: {
      icon: Inbox,
      text: 'Aucun réabonnement à afficher.',
    },
    aujourd_hui: {
      icon: CalendarClock,
      text: "Aucun abonnement n'expire aujourd'hui.",
    },
    demain: {
      icon: Clock3,
      text: "Aucun abonnement n'expire demain.",
    },
    '7_jours': {
      icon: CalendarClock,
      text: "Aucun abonnement n'expire dans les 7 prochains jours.",
    },
    expires: {
      icon: AlertCircle,
      text: 'Aucun abonnement expiré non réabonné.',
    },
  }[filter];

  const Icon = content.icon;

  return (
    <div className="bg-white rounded-md border border-slate-200 p-6 text-center">
      <Icon className="h-5 w-5 text-slate-300 mx-auto mb-2" />

      <p className="text-sm text-slate-400">
        {content.text}
      </p>
    </div>
  );
}

function UpcomingList({
  items,
  onOpenClient,
}: {
  items: UpcomingItem[];
  onOpenClient: (clientId: string) => void;
}) {
  return (
    <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <UpcomingRow
            key={item.subId}
            item={item}
            onOpenClient={onOpenClient}
          />
        ))}
      </div>
    </div>
  );
}

function UpcomingRow({
  item,
  onOpenClient,
}: {
  item: UpcomingItem;
  onOpenClient: (clientId: string) => void;
}) {
  const isExpired = item.status === 'expire';

  return (
    <div
      className={`
        px-3 py-2.5
        flex items-center gap-3
        hover:bg-slate-50
        border-l-2
        ${
          isExpired
            ? 'border-rose-400'
            : item.status ===
                'expire_aujourd_hui'
              ? 'border-rose-400'
              : item.status ===
                  'expire_demain'
                ? 'border-amber-400'
                : 'border-slate-200'
        }
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900 truncate">
            {item.client.nom_complet}
          </p>

          <span
            className={`
              inline-flex items-center rounded
              px-1.5 py-0.5
              text-[11px] font-medium
              ring-1 ring-inset
              ${statusClasses[item.status]}
            `}
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

          <span>
            Fin : {formatDate(item.date_fin)}
          </span>
        </div>
      </div>

      <button
        onClick={() =>
          onOpenClient(item.client.id)
        }
        className="shrink-0 p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900"
        title="Ouvrir le client"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
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
  color:
    | 'emerald'
    | 'blue'
    | 'amber'
    | 'slate';
  loading: boolean;
}) {
  const colorMap = {
    emerald:
      'text-emerald-600 border-emerald-200',
    blue: 'text-blue-600 border-blue-200',
    amber:
      'text-amber-600 border-amber-200',
    slate:
      'text-slate-600 border-slate-200',
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 p-3 sm:p-4">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded border ${colorMap[color]} mb-2`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      <p className="text-xs text-slate-400 mb-0.5 truncate">
        {label}
      </p>

      {loading ? (
        <div className="h-5 w-16 rounded bg-slate-100 animate-pulse" />
      ) : (
        <p className="text-base sm:text-lg font-bold text-slate-900">
          {value}
        </p>
      )}
    </div>
  );
}