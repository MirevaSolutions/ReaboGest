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

import type { Reabonnement, Formula } from '@/lib/supabase';
import { getStatistiquesData } from '@/services/statistiques.service';
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

type MonthlyRevenue = {
  month: string;
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

    try {
      const { reabonnements, formulas } =
        await getStatistiquesData();

      setReabonnements(reabonnements);
      setFormulas(formulas);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const monthlyData = useMemo((): MonthlyRevenue[] => {
    const months: MonthlyRevenue[] = [];

    const current = new Date(
      today.getFullYear(),
      today.getMonth() - 11,
      1
    );

    for (let i = 0; i < 12; i++) {
      const year = current.getFullYear();
      const month = current.getMonth();

      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      const monthReabs = reabonnements.filter((r) =>
        r.date_reabonnement.startsWith(monthStr)
      );

      months.push({
        month: monthStr,
        label: current.toLocaleDateString('fr-FR', {
          month: 'short',
          year: '2-digit',
        }),
        revenu: monthReabs.reduce(
          (sum, r) => sum + r.montant,
          0
        ),
        count: monthReabs.length,
      });

      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }, [reabonnements, today]);

  const monthlyTotals = useMemo(() => {
    const revenu = monthlyData.reduce(
      (sum, item) => sum + item.revenu,
      0
    );

    const count = monthlyData.reduce(
      (sum, item) => sum + item.count,
      0
    );

    return {
      revenu,
      count,
    };
  }, [monthlyData]);

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
            ? formulas.find(
                (f) => f.id === r.formula_id
              ) ?? null
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
        formulas.find(
          (f) => f.id === r.formula_id
        )?.nom ?? '',
    },
    {
      header: 'Montant',
      accessor: (r) => formatPrice(r.montant),
    },
  ];

  return (
    <div className="text-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">
            Statistiques
          </h1>

          <p className="text-xs text-slate-400 mt-0.5">
            Suivi des revenus et des réabonnements
          </p>
        </div>

        <ExportMenu
          filename="statistiques-reabonnements"
          title="Historique des réabonnements"
          columns={reabExportColumns}
          rows={reabonnements}
        />
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Chargement…
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <SectionTitle
              icon={<Banknote className="h-4 w-4" />}
              title="Chiffre d'affaires"
            />

            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <MetricCard
                label="Aujourd'hui"
                value={formatPrice(ca.today)}
              />
              <MetricCard
                label="Hier"
                value={formatPrice(ca.yesterday)}
              />
              <MetricCard
                label="7 derniers jours"
                value={formatPrice(ca.week)}
              />
              <MetricCard
                label="30 derniers jours"
                value={formatPrice(ca.month)}
              />
              <MetricCard
                label="12 derniers mois"
                value={formatPrice(ca.year)}
              />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <SectionTitle
              icon={<RefreshCw className="h-4 w-4" />}
              title="Réabonnements"
            />

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <MetricCard
                label="Aujourd'hui"
                value={String(counts.today)}
              />
              <MetricCard
                label="7 derniers jours"
                value={String(counts.week)}
              />
              <MetricCard
                label="30 derniers jours"
                value={String(counts.month)}
              />
              <MetricCard
                label="12 derniers mois"
                value={String(monthlyTotals.count)}
              />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <SectionTitle
                icon={<TrendingUp className="h-4 w-4" />}
                title="Évolution du revenu"
              />

              <div className="flex items-center gap-1">
                {(['7', '30', 'custom'] as Period[]).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPeriod(value)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition ${
                        period === value
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {value === '7'
                        ? '7 jours'
                        : value === '30'
                          ? '30 jours'
                          : 'Période'}
                    </button>
                  )
                )}
              </div>
            </div>

            {period === 'custom' && (
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <DateInput
                  label="Du"
                  value={customStart}
                  onChange={setCustomStart}
                />

                <DateInput
                  label="Au"
                  value={customEnd}
                  onChange={setCustomEnd}
                />
              </div>
            )}

            {chartData.length === 0 ? (
              <EmptyState
                text={
                  period === 'custom'
                    ? 'Sélectionnez une période.'
                    : 'Aucune donnée pour cette période.'
                }
              />
            ) : (
              <div className="h-56">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: -20,
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
                        fontSize: 10,
                        fill: '#94a3b8',
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 10,
                        fill: '#94a3b8',
                      }}
                      tickFormatter={formatChartValue}
                    />

                    <Tooltip
                      cursor={{
                        fill: '#f1f5f9',
                      }}
                      formatter={(value: any) => [
                        formatPrice(Number(value) || 0),
                        'Revenu',
                      ]}
                      labelFormatter={(label: any) =>
                        `Date : ${label}`
                      }
                      contentStyle={{
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        boxShadow:
                          '0 4px 12px rgba(15, 23, 42, 0.08)',
                        fontSize: '11px',
                      }}
                    />

                    <Bar
                      dataKey="revenu"
                      fill="#1e293b"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
              <SectionTitle
                icon={<Calendar className="h-4 w-4" />}
                title="Revenus par mois"
              />

              <div className="text-xs text-slate-400">
                12 derniers mois
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-3">
              <MetricCard
                label="Revenu total"
                value={formatPrice(monthlyTotals.revenu)}
              />

              <MetricCard
                label="Réabonnements"
                value={String(monthlyTotals.count)}
              />

              <MetricCard
                label="Moyenne / mois"
                value={formatPrice(
                  monthlyTotals.revenu / 12
                )}
              />
            </div>

            <div className="h-56">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={monthlyData}
                  margin={{
                    top: 5,
                    right: 5,
                    left: -20,
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
                      fontSize: 10,
                      fill: '#94a3b8',
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: '#94a3b8',
                    }}
                    tickFormatter={formatChartValue}
                  />

                  <Tooltip
                    cursor={{
                      fill: '#f1f5f9',
                    }}
                    formatter={(value: any) => [
                      formatPrice(Number(value) || 0),
                      'Revenu',
                    ]}
                    labelFormatter={(label: any) =>
                      `Mois : ${label}`
                    }
                    contentStyle={{
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      boxShadow:
                        '0 4px 12px rgba(15, 23, 42, 0.08)',
                      fontSize: '11px',
                    }}
                  />

                  <Bar
                    dataKey="revenu"
                    fill="#1e293b"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={34}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <SectionTitle
              icon={<Tag className="h-4 w-4" />}
              title="Formules utilisées"
            />

            {formulaStats.length === 0 ? (
              <EmptyState text="Aucune donnée disponible." />
            ) : (
              <div className="space-y-3">
                {formulaStats.map((stat) => {
                  const percentage =
                    (stat.count / maxFormulaCount) * 100;

                  return (
                    <div
                      key={stat.formula?.id ?? 'unknown'}
                      className="space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-800">
                            {stat.formula?.nom ??
                              'Formule supprimée'}
                          </p>

                          <p className="text-[11px] text-slate-400">
                            {stat.count} réabonnement
                            {stat.count > 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 text-[11px]">
                          <span className="text-slate-500">
                            {formatPrice(stat.revenu)}
                          </span>

                          <span className="font-medium text-slate-700">
                            {stat.count}
                          </span>
                        </div>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-800 transition-all"
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
          </section>
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">
        {icon}
      </span>

      <h2 className="text-sm font-semibold text-slate-800">
        {title}
      </h2>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-slate-500">
        {label}
      </span>

      <div className="relative">
        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-slate-400"
        />
      </div>
    </label>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="py-8 text-center text-xs text-slate-400">
      {text}
    </div>
  );
}

function formatChartValue(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }

  return String(value);
}