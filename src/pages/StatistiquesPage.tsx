import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Banknote, RefreshCw, Tag, TrendingUp, Calendar } from 'lucide-react';
import { supabase, type Reabonnement, type Formula } from '@/lib/supabase';
import { formatPrice, formatDate } from '@/lib/status';

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
      supabase.from('reabonnements').select('*').order('date_reabonnement', { ascending: true }),
      supabase.from('formulas').select('*').order('prix', { ascending: true }),
    ]);
    setReabonnements((reabResult.data ?? []) as Reabonnement[]);
    setFormulas((formResult.data ?? []) as Formula[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcul des plages de dates
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

  const toStr = (d: Date) => d.toISOString().slice(0, 10);
  const todayStr = toStr(today);
  const yesterdayStr = toStr(yesterday);

  // Chiffre d'affaires
  const ca = useMemo(() => {
    const sumInRange = (start: Date, end: Date) => {
      const startStr = toStr(start);
      const endStr = toStr(end);
      return reabonnements
        .filter((r) => r.date_reabonnement >= startStr && r.date_reabonnement <= endStr)
        .reduce((sum, r) => sum + r.montant, 0);
    };

    return {
      today: sumInRange(today, today),
      yesterday: sumInRange(yesterday, yesterday),
      week: sumInRange(weekAgo, today),
      month: sumInRange(monthAgo, today),
      year: sumInRange(yearAgo, today),
    };
  }, [reabonnements, today, yesterday, weekAgo, monthAgo, yearAgo]);

  // Nombre de réabonnements
  const counts = useMemo(() => {
    const countInRange = (start: Date, end: Date) => {
      const startStr = toStr(start);
      const endStr = toStr(end);
      return reabonnements.filter(
        (r) => r.date_reabonnement >= startStr && r.date_reabonnement <= endStr
      ).length;
    };

    return {
      today: countInRange(today, today),
      week: countInRange(weekAgo, today),
      month: countInRange(monthAgo, today),
      year: countInRange(yearAgo, today),
    };
  }, [reabonnements, today, weekAgo, monthAgo, yearAgo]);

  // Données du graphique
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
      if (!customStart || !customEnd) return [];
      start = new Date(customStart);
      end = new Date(customEnd);
      if (start > end) [start, end] = [end, start];
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const days: DailyRevenue[] = [];
    const current = new Date(start);
    while (current <= end) {
      const dateStr = toStr(current);
      const dayReabs = reabonnements.filter((r) => r.date_reabonnement === dateStr);
      days.push({
        date: dateStr,
        label: current.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        revenu: dayReabs.reduce((sum, r) => sum + r.montant, 0),
        count: dayReabs.length,
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [period, customStart, customEnd, reabonnements, today]);

  // Statistiques par formule
  const formulaStats = useMemo((): FormulaStat[] => {
    const map = new Map<string, FormulaStat>();

    // Initialiser avec toutes les formules connues
    formulas.forEach((f) => {
      map.set(f.id, { formula: f, count: 0, revenu: 0 });
    });

    reabonnements.forEach((r) => {
      const key = r.formula_id ?? 'none';
      if (!map.has(key)) {
        map.set(key, {
          formula: r.formula_id ? formulas.find((f) => f.id === r.formula_id) ?? null : null,
          count: 0,
          revenu: 0,
        });
      }
      const stat = map.get(key)!;
      stat.count += 1;
      stat.revenu += r.montant;
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [reabonnements, formulas]);

  const maxFormulaCount = Math.max(...formulaStats.map((s) => s.count), 1);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Statistiques</h1>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">Chargement…</div>
      ) : (
        <div className="space-y-6">
          {/* Chiffre d'affaires */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Banknote className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Chiffre d'affaires</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <MetricCard label="Aujourd'hui" value={formatPrice(ca.today)} />
              <MetricCard label="Hier" value={formatPrice(ca.yesterday)} />
              <MetricCard label="Cette semaine" value={formatPrice(ca.week)} />
              <MetricCard label="Ce mois" value={formatPrice(ca.month)} />
              <MetricCard label="Cette année" value={formatPrice(ca.year)} />
            </div>
          </div>

          {/* Nombre de réabonnements */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Nombre de réabonnements</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="Aujourd'hui" value={String(counts.today)} />
              <MetricCard label="Cette semaine" value={String(counts.week)} />
              <MetricCard label="Ce mois" value={String(counts.month)} />
              <MetricCard label="Cette année" value={String(counts.year)} />
            </div>
          </div>

          {/* Évolution du revenu */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Évolution du revenu</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <PeriodButton active={period === '7'} onClick={() => setPeriod('7')}>
                    7 jours
                  </PeriodButton>
                  <PeriodButton active={period === '30'} onClick={() => setPeriod('30')}>
                    30 jours
                  </PeriodButton>
                  <PeriodButton active={period === 'custom'} onClick={() => setPeriod('custom')}>
                    Période
                  </PeriodButton>
                </div>
              </div>
            </div>

            {period === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-500">Du</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Au</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </label>
              </div>
            )}

            {chartData.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-400">
                {period === 'custom' && (!customStart || !customEnd)
                  ? 'Sélectionnez une période.'
                  : 'Aucune donnée pour cette période.'}
              </div>
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v: number) => {
                        if (v >= 1000) return `${v / 1000}k`;
                        return String(v);
                      }}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatPrice(value), 'Revenu']}
                      labelFormatter={(label: string) => `Date : ${label}`}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="revenu" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Formules */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Formules utilisées</h2>
              </div>
            </div>

            {formulaStats.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                Aucune formule utilisée pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {formulaStats.map((stat, idx) => (
                  <div key={idx} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {stat.formula?.nom ?? 'Formule supprimée'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {stat.count} réabonnement{stat.count > 1 ? 's' : ''} · {formatPrice(stat.revenu)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 shrink-0">
                        {stat.count}
                      </span>
                    </div>
                    {/* Barre de progression */}
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-900"
                        style={{ width: `${(stat.count / maxFormulaCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PeriodButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-slate-900 text-white'
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
