import { useCallback, useEffect, useState } from 'react';
import { Wallet, Plus, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { MvolaTransaction } from '@/lib/supabase';
import {
  getMvolaData,
  createDepot,
} from '@/services/mvola.service';
import { formatDate, formatPrice } from '@/lib/status';
import { todayLocal } from '@/lib/date';
import type { Column } from '@/lib/export';
import Modal from '@/components/Modal';
import ExportMenu from '@/components/ExportMenu';

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none';

export default function SoldePage() {
  const [solde, setSolde] = useState(0);
  const [transactions, setTransactions] = useState<MvolaTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depotOpen, setDepotOpen] = useState(false);
  const [depotMontant, setDepotMontant] = useState('');
  const [depotDate, setDepotDate] = useState(todayLocal());
  const [depotDesc, setDepotDesc] = useState('');
  const [depotError, setDepotError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchData = useCallback(async () => {
  setLoading(true);

  try {
    const { solde, transactions } = await getMvolaData();

    setSolde(solde);
    setTransactions(transactions);
  } catch (error) {
    console.error('Erreur chargement MVola:', error);

    setToast({
      type: 'error',
      msg: error instanceof Error
        ? error.message
        : 'Erreur lors du chargement des données MVola.',
    });
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDepot = () => {
    setDepotMontant('');
    setDepotDate(todayLocal());
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

  try {
    await createDepot({
      montant,
      dateTransaction: depotDate,
      description: depotDesc,
    });

    setDepotOpen(false);

    await fetchData();

    setToast({
      type: 'success',
      msg: 'Dépôt enregistré avec succès.',
    });
  } catch (error) {
    setDepotError(
      error instanceof Error
        ? error.message
        : 'Une erreur est survenue.'
    );
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 mb-1">Solde MVola</h1>
      <p className="text-sm text-slate-500 mb-5">
        Suivi du solde et historique des mouvements de votre compte MVola.
      </p>

      {/* Solde + bouton dépôt */}
      <div className="bg-white rounded-md border border-slate-200 p-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100">
              <Wallet className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Solde actuel</p>
              <p className="text-xl font-bold text-slate-900">{formatPrice(solde)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu
              filename="mouvements-mvola"
              title="Mouvements MVola"
              columns={exportColumns}
              rows={transactions}
            />
            <button
              onClick={openDepot}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Ajouter un dépôt
            </button>
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Historique des mouvements</h2>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</div>
        ) : transactions.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            Aucun mouvement enregistré.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Desktop table */}
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Montant</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Solde après</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-sm text-slate-600">{formatDate(t.date_transaction)}</td>
                    <td className="px-4 py-2.5">
                      <TypeBadge type={t.type} />
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{t.description || '—'}</td>
                    <td className={`px-4 py-2.5 text-sm text-right font-medium ${t.type === 'DEPOT' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'DEPOT' ? '+' : '−'} {formatPrice(t.montant)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-900 text-right font-medium">
                      {formatPrice(t.solde_apres)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {transactions.map((t) => (
                <div key={t.id} className="px-4 py-2.5">
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

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Modal dépôt */}
      <Modal
        open={depotOpen}
        title="Ajouter un dépôt MVola"
        onClose={() => setDepotOpen(false)}
      >
        <form onSubmit={handleDepot} className="space-y-3">
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
            <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{depotError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setDepotOpen(false)}
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer le dépôt'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const exportColumns: Column<MvolaTransaction>[] = [
  { header: 'Date', accessor: (r) => formatDate(r.date_transaction) },
  { header: 'Type', accessor: (r) => (r.type === 'DEPOT' ? 'Dépôt' : 'Réabonnement') },
  { header: 'Description', accessor: (r) => r.description ?? '' },
  { header: 'Montant', accessor: (r) => formatPrice(r.montant) },
  { header: 'Solde avant', accessor: (r) => formatPrice(r.solde_avant) },
  { header: 'Solde après', accessor: (r) => formatPrice(r.solde_apres) },
];

function TypeBadge({ type }: { type: MvolaTransaction['type'] }) {
  if (type === 'DEPOT') {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <TrendingUp className="h-3 w-3" />
        Dépôt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
      <TrendingDown className="h-3 w-3" />
      Réabonnement
    </span>
  );
}