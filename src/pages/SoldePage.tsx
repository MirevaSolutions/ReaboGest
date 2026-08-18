import { useCallback, useEffect, useState } from 'react';
import { Wallet, Plus, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { supabase, type MvolaTransaction } from '@/lib/supabase';
import { formatDate, formatPrice } from '@/lib/status';
import { getMvolaBalance, performDepot } from '@/lib/mvola';
import Modal from '@/components/Modal';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none';

export default function SoldePage() {
  const [solde, setSolde] = useState(0);
  const [transactions, setTransactions] = useState<MvolaTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depotOpen, setDepotOpen] = useState(false);
  const [depotMontant, setDepotMontant] = useState('');
  const [depotDate, setDepotDate] = useState(new Date().toISOString().slice(0, 10));
  const [depotDesc, setDepotDesc] = useState('');
  const [depotError, setDepotError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [s, { data }] = await Promise.all([
      getMvolaBalance(),
      supabase
        .from('mvola_transactions')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);
    setSolde(s);
    setTransactions((data ?? []) as MvolaTransaction[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDepot = () => {
    setDepotMontant('');
    setDepotDate(new Date().toISOString().slice(0, 10));
    setDepotDesc('');
    setDepotError(null);
    setDepotOpen(true);
  };

  const handleDepot = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = parseInt(depotMontant, 10);
    if (isNaN(montant) || montant <= 0) {
      setDepotError('Le montant doit être supérieur à 0.');
      return;
    }
    setSubmitting(true);
    setDepotError(null);
    const result = await performDepot({
      montant,
      dateTransaction: depotDate,
      description: depotDesc,
    });
    if (result.success) {
      setDepotOpen(false);
      await fetchData();
    } else {
      setDepotError(result.error ?? 'Une erreur est survenue.');
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Solde MVola</h1>
      <p className="text-sm text-slate-500 mb-6">
        Suivi du solde et historique des mouvements de votre compte MVola.
      </p>

      {/* Solde + bouton dépôt */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                <Wallet className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Solde actuel</p>
                <p className="text-2xl font-bold text-slate-900">{formatPrice(solde)}</p>
              </div>
            </div>
          </div>
          <button
            onClick={openDepot}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Ajouter un dépôt
          </button>
        </div>
      </div>

      {/* Historique */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Historique des mouvements</h2>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Chargement…</div>
        ) : transactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Aucun mouvement enregistré.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Desktop table */}
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Montant</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Solde après</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm text-slate-600">{formatDate(t.date_transaction)}</td>
                    <td className="px-5 py-3">
                      <TypeBadge type={t.type} />
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{t.description || '—'}</td>
                    <td className={`px-5 py-3 text-sm text-right font-medium ${t.type === 'DEPOT' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'DEPOT' ? '+' : '−'} {formatPrice(t.montant)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-900 text-right font-medium">
                      {formatPrice(t.solde_apres)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {transactions.map((t) => (
                <div key={t.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <TypeBadge type={t.type} />
                    <span className="text-xs text-slate-400">{formatDate(t.date_transaction)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{t.description || '—'}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${t.type === 'DEPOT' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'DEPOT' ? '+' : '−'} {formatPrice(t.montant)}
                    </span>
                    <span className="text-xs text-slate-500">
                      Solde : {formatPrice(t.solde_apres)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal dépôt */}
      <Modal
        open={depotOpen}
        title="Ajouter un dépôt MVola"
        onClose={() => setDepotOpen(false)}
      >
        <form onSubmit={handleDepot} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Montant (Ar)</span>
            <input
              type="number"
              value={depotMontant}
              onChange={(e) => setDepotMontant(e.target.value)}
              className={inputClass}
              placeholder="Ex: 50000"
              required
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Date</span>
            <input
              type="date"
              value={depotDate}
              onChange={(e) => setDepotDate(e.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Description (facultatif)</span>
            <input
              type="text"
              value={depotDesc}
              onChange={(e) => setDepotDesc(e.target.value)}
              className={inputClass}
              placeholder="Ex: Dépôt agent MVola"
            />
          </label>

          {depotError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{depotError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDepotOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer le dépôt'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TypeBadge({ type }: { type: MvolaTransaction['type'] }) {
  if (type === 'DEPOT') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <TrendingUp className="h-3 w-3" />
        Dépôt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
      <TrendingDown className="h-3 w-3" />
      Réabonnement
    </span>
  );
}
