import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Banknote,
  RefreshCw,
  Tag,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { supabase, type Reabonnement, type Formula } from '@/lib/supabase';
import { formatPrice, formatDate } from '@/lib/status';
import { todayLocal } from '@/lib/date';
import type { Column } from '@/lib/export';
import ExportMenu from '@/components/ExportMenu';

type Period = '7' | '30' | 'custom';

type DailyRevenue = {
  date: string;
  label: string;
  revenu: number;
  count: number;
};

type FormulaStat = {
  formula: Formula | null;
  count: number;
  revenu: number;
};

export default function StatistiquesPage() {
  const [reabonnements, setReabonnements] = useState<Reabonnement[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState<Period>('7');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [reabResult, formResult] = await Promise.all([
      supabase
        .from('reabonnements')
        .select('*')
        .order('date_reabonnement', { ascending: true }),

      supabase
        .from('formulas')
        .select('*')
        .order('prix', { ascending: true }),
    ]);

    setReabonnements((reabResult.data ?? []) as Reabonnement[]);
    setFormulas((formResult.data ?? []) as Formula[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Dates
  // ---------------------------------------------------------------------------

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const yesterday = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }, [today]);

  const weekAgo = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return d;
  }, [today]);

  const monthAgo = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [today]);

  const yearAgo = useMemo(() => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }, [today]);

  const toStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const todayStr = todayLocal();
  const yesterdayStr = toStr(yesterday);

  // ---------------------------------------------------------------------------
  // Chiffre d'affaires
  // ---------------------------------------------------------------------------

  const ca = useMemo(() => {
    const sumInRange = (start: Date, end: Date) => {
      const startStr = toStr(start);
      const endStr = toStr(end);

      return reabonnements
        .filter(
          (r) =>
            r.date_reabonnement >= startStr &&
            r.date_reabonnement <= endStr
        )
        .reduce((sum, r) => sum + r.montant, 0);
    };

    return {
      today: sumInRange(today, today),
      yesterday: sumInRange(yesterday, yesterday),
      week: sumInRange(weekAgo, today),
      month: sumInRange(monthAgo, today),
      year: sumInRange(yearAgo, today),
    };
  }, [
    reabonnements,
    today,
    yesterday,
    weekAgo,
    monthAgo,
    yearAgo,
  ]);

  // ---------------------------------------------------------------------------
  // Nombre de réabonnements
  // ---------------------------------------------------------------------------

  const counts = useMemo(() => {
    const countInRange = (start: Date, end: Date) => {
      const startStr = toStr(start);
      const endStr = toStr(end);

      return reabonnements.filter(
        (r) =>
          r.date_reabonnement >= startStr &&
          r.date_reabonnement <= endStr
      ).length;
    };

    return {
      today: countInRange(today, today),
      week: countInRange(weekAgo, today),
      month: countInRange(monthAgo, today),
      year: countInRange(yearAgo, today),
    };
  }, [
    reabonnements,
    today,
    weekAgo,
    monthAgo,
    yearAgo,
  ]);

  // ---------------------------------------------------------------------------
  // Données du graphique
  // ---------------------------------------------------------------------------

  const chartData = useMemo((): DailyRevenue[] => {
    let start: Date;
    let end: Date;

    if (period === '7') {
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      end = today;
    } else if (period === '30') {
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      end = today;
    } else {
      if (!customStart || !customEnd) {
        return [];
      }

      start = new Date(customStart);
      end = new Date(customEnd);

      if (start > end) {
        [start, end] = [end, start];
      }
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const days: DailyRevenue[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = toStr(current);

      const dayReabs = reabonnements.filter(
        (r) => r.date_reabonnement === dateStr
      );

      days.push({
        date: dateStr,
        label: current.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
        }),
        revenu: dayReabs.reduce(
          (sum, r) => sum + r.montant,
          0
        ),
        count: dayReabs.length,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [
    period,
    customStart,
    customEnd,
    reabonnements,
    today,
  ]);

  // ---------------------------------------------------------------------------
  // Statistiques par formule
  // ---------------------------------------------------------------------------

  const formulaStats = useMemo((): FormulaStat[] => {
    const map = new Map<string, FormulaStat>();

    formulas.forEach((f) => {
      map.set(f.id, {
        formula: f,
        count: 0,
        revenu: 0,
      });
    });

    reabonnements.forEach((r) => {
      const key = r.formula_id ?? 'none';

      if (!map.has(key)) {
        map.set(key, {
          formula: r.formula_id
            ? formulas.find((f) => f.id === r.formula_id) ?? null
            : null,
          count: 0,
          revenu: 0,
        });
      }

      const stat = map.get(key)!;

      stat.count += 1;
      stat.revenu += r.montant;
    });

    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count
    );
  }, [reabonnements, formulas]);

  const maxFormulaCount = Math.max(
    ...formulaStats.map((s) => s.count),
    1
  );

  const reabExportColumns: Column<Reabonnement>[] = [
    {
      header: 'Date',
      accessor: (r) => formatDate(r.date_reabonnement),
    },
    {
      header: 'Formule',
      accessor: (r) =>
        formulas.find((f) => f.id === r.formula_id)?.nom ?? '',
    },
    {
      header: 'Montant',
      accessor: (r) => formatPrice(r.montant),
    },
  ];

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Statistiques
        </h1>

        <ExportMenu
          filename="statistiques-reabonnements"
          title="Historique des réabonnements"
          columns={reabExportColumns}
          rows={reabonnements}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">
          Chargement…
        </div>
      ) : (
        <div className="space-y-6">

          {/* ---------------------------------------------------------------- */}
          {/* Chiffre d'affaires */}
          {/* ---------------------------------------------------------------- */}

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Banknote className="h-4 w-4 text-slate-400" />

              <h2 className="text-sm font-semibold text-slate-900">
                Chiffre d'affaires
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <MetricCard
                label="Aujourd'hui"
                value={formatPrice(ca.today)}
              />

              <MetricCard
                label="Hier"
                value={formatPrice(ca.yesterday)}
              />

              <MetricCard
                label="Cette semaine"
                value={formatPrice(ca.week)}
              />

              <MetricCard
                label="Ce mois"
                value={formatPrice(ca.month)}
              />

              <MetricCard
                label="Cette année"
                value={formatPrice(ca.year)}
              />
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Nombre de réabonnements */}
          {/* ---------------------------------------------------------------- */}

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="h-4 w-4 text-slate-400" />

              <h2 className="text-sm font-semibold text-slate-900">
                Nombre de réabonnements
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Aujourd'hui"
                value={String(counts.today)}
              />

              <MetricCard
                label="Cette semaine"
                value={String(counts.week)}
              />

              <MetricCard
                label="Ce mois"
                value={String(counts.month)}
              />

              <MetricCard
                label="Cette année"
                value={String(counts.year)}
              />
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Évolution du revenu */}
          {/* ---------------------------------------------------------------- */}

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />

                <h2 className="text-sm font-semibold text-slate-900">
                  Évolution du revenu
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">

                <button
                  type="button"
                  onClick={() => setPeriod('7')}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    period === '7'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  7 jours
                </button>

                <button
                  type="button"
                  onClick={() => setPeriod('30')}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    period === '30'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  30 jours
                </button>

                <button
                  type="button"
                  onClick={() => setPeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    period === 'custom'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Période
                </button>
              </div>
            </div>

            {/* Période personnalisée */}
            {period === 'custom' && (
              <div className="mb-4 flex flex-col sm:flex-row gap-3">

                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">
                    Du
                  </label>

                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />

                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) =>
                        setCustomStart(e.target.value)
                      }
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">
                    Au
                  </label>

                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />

                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) =>
                        setCustomEnd(e.target.value)
                      }
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

              </div>
            )}

            {chartData.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                {period === 'custom'
                  ? 'Sélectionnez une période pour afficher les données.'
                  : 'Aucune donnée pour cette période.'}
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -10,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: '#94a3b8',
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: '#94a3b8',
                      }}
                      tickFormatter={(value: number) => {
                        if (value >= 1000000) {
                          return `${(value / 1000000).toFixed(1)}M`;
                        }

                        if (value >= 1000) {
                          return `${Math.round(value / 1000)}k`;
                        }

                        return String(value);
                      }}
                    />

                    <Tooltip
                      cursor={{
                        fill: '#f8fafc',
                      }}
                      formatter={(value: number) => [
                        formatPrice(value),
                        'Revenu',
                      ]}
                      labelFormatter={(label: string) =>
                        `Date : ${label}`
                      }
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxShadow:
                          '0 4px 12px rgba(15, 23, 42, 0.08)',
                        fontSize: '12px',
                      }}
                    />

                    <Bar
                      dataKey="revenu"
                      fill="#334155"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Formules */}
          {/* ---------------------------------------------------------------- */}

          <div className="bg-white rounded-xl border border-slate-200 p-5">

            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-slate-400" />

              <h2 className="text-sm font-semibold text-slate-900">
                Formules utilisées
              </h2>
            </div>

            {formulaStats.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-400">
                Aucune donnée disponible.
              </div>
            ) : (
              <div className="space-y-4">

                {formulaStats.map((stat) => {
                  const percentage =
                    (stat.count / maxFormulaCount) * 100;

                  return (
                    <div
                      key={stat.formula?.id ?? 'unknown'}
                      className="space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {stat.formula?.nom ??
                              'Formule supprimée'}
                          </p>

                          <p className="text-xs text-slate-400">
                            {stat.count} réabonnement
                            {stat.count > 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-slate-500">
                            {formatPrice(stat.revenu)}
                          </span>

                          <span className="font-medium text-slate-700">
                            {stat.count}
                          </span>
                        </div>

                      </div>

                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-400 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Carte métrique
// -----------------------------------------------------------------------------

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-100 p-4">
      <p className="text-xs text-slate-400 mb-2">
        {label}
      </p>

      <p className="text-base font-semibold text-slate-900 break-words">
        {value}
      </p>
    </div>
  );
}