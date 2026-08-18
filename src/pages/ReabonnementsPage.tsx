import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Search,
  ChevronRight,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { supabase, type ClientWithSubscriptions, type Formula } from '@/lib/supabase';
import { formatDate, formatPrice, getStatus, statusLabels, statusClasses } from '@/lib/status';
import { getMvolaBalance, performReabonnement } from '@/lib/mvola';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none';

export default function ReabonnementsPage() {
  const [clients, setClients] = useState<ClientWithSubscriptions[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [solde, setSolde] = useState(0);

  // Formulaire
  const [formFormulaId, setFormFormulaId] = useState('');
  const [formMontant, setFormMontant] = useState('');
  const [formDateReabonnement, setFormDateReabonnement] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [formDateFin, setFormDateFin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*, subscriptions(*, formula:formulas(*))')
      .order('nom_complet', { ascending: true });
    if (error) {
      console.error(error);
    } else {
      setClients((data ?? []) as ClientWithSubscriptions[]);
    }
    setLoading(false);
  }, []);

  const fetchSolde = useCallback(async () => {
    const s = await getMvolaBalance();
    setSolde(s);
  }, []);

  useEffect(() => {
    fetchClients();
    fetchSolde();
    supabase
      .from('formulas')
      .select('*')
      .eq('active', true)
      .order('prix', { ascending: true })
      .then(({ data }) => {
        if (data) setFormulas(data as Formula[]);
      });
  }, [fetchClients, fetchSolde]);

  // Aplatir tous les abonnements avec leur client
  const allSubs = clients.flatMap((c) =>
    (c.subscriptions ?? []).map((s) => ({
      sub: s,
      client: c,
    }))
  );

  const filtered = allSubs.filter(({ client, sub }) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      client.nom_complet.toLowerCase().includes(q) ||
      (client.telephone ?? '').toLowerCase().includes(q) ||
      (sub.numero_abonne ?? '').toLowerCase().includes(q) ||
      (sub.numero_carte ?? '').toLowerCase().includes(q)
    );
  });

  // Trier par date de fin (les plus proches de l'expiration en premier)
  const sorted = [...filtered].sort((a, b) => {
    const da = a.sub.date_fin ?? '9999-12-31';
    const db = b.sub.date_fin ?? '9999-12-31';
    return da.localeCompare(db);
  });

  const selected = allSubs.find(({ sub }) => sub.id === selectedSubId) ?? null;

  // Quand on sélectionne une formule, auto-remplir le montant
  useEffect(() => {
    if (formFormulaId) {
      const f = formulas.find((f) => f.id === formFormulaId);
      if (f) setFormMontant(String(f.prix));
    }
  }, [formFormulaId, formulas]);

  const handleSelectSub = (subId: string) => {
    setSelectedSubId(subId);
    setFeedback(null);
    const item = allSubs.find(({ sub }) => sub.id === subId);
    if (item) {
      setFormFormulaId(item.sub.formula_id ?? '');
      setFormDateReabonnement(new Date().toISOString().slice(0, 10));
      setFormDateFin('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) return;
    setSubmitting(true);
    setFeedback(null);

    const montant = parseInt(formMontant, 10);
    if (isNaN(montant) || montant < 0) {
      setFeedback({ type: 'error', msg: 'Le montant est invalide.' });
      setSubmitting(false);
      return;
    }

    const result = await performReabonnement({
      subscriptionId: selectedSubId,
      formulaId: formFormulaId,
      dateReabonnement: formDateReabonnement,
      dateFin: formDateFin,
      montant,
    });

    if (result.success) {
      setFeedback({ type: 'success', msg: 'Réabonnement effectué avec succès.' });
      await fetchClients();
      await fetchSolde();
      setSelectedSubId(null);
      setFormFormulaId('');
      setFormMontant('');
      setFormDateFin('');
    } else {
      setFeedback({ type: 'error', msg: result.error ?? 'Une erreur est survenue.' });
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Réabonnements</h1>
      <div className="flex items-center gap-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200">
          <Wallet className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600">Solde MVola :</span>
          <span className="text-sm font-semibold text-slate-900">{formatPrice(solde)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste gauche */}
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client ou abonné…"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</div>
            ) : sorted.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                Aucun abonnement trouvé.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {sorted.map(({ sub, client }) => {
                  const status = getStatus(sub.date_fin);
                  const isSelected = sub.id === selectedSubId;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSelectSub(sub.id)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 ${
                        isSelected ? 'bg-slate-100' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {client.nom_complet}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {sub.formula?.nom ?? '—'} · Fin : {formatDate(sub.date_fin)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses[status]}`}
                        >
                          {statusLabels[status]}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panneau droit — sélection + formulaire */}
        <div>
          {!selected ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                <RefreshCw className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">
                Sélectionnez un client dans la liste pour effectuer un réabonnement.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Infos client/abonnement */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  Informations actuelles
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoItem label="Nom" value={selected.client.nom_complet} />
                  <InfoItem label="Téléphone" value={selected.client.telephone} />
                  <InfoItem label="N° abonné" value={selected.sub.numero_abonne} />
                  <InfoItem label="N° carte" value={selected.sub.numero_carte} />
                  <InfoItem
                    label="Formule actuelle"
                    value={
                      selected.sub.formula
                        ? `${selected.sub.formula.nom} — ${formatPrice(selected.sub.formula.prix)}`
                        : null
                    }
                  />
                  <InfoItem
                    label="Date de fin actuelle"
                    value={selected.sub.date_fin ? formatDate(selected.sub.date_fin) : null}
                  />
                </div>
              </div>

              {/* Formulaire de réabonnement */}
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Nouveau réabonnement</h3>

                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">Formule</span>
                  <select
                    value={formFormulaId}
                    onChange={(e) => setFormFormulaId(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">— Sélectionner —</option>
                    {formulas.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom} — {formatPrice(f.prix)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">Montant (Ar)</span>
                  <input
                    type="number"
                    value={formMontant}
                    onChange={(e) => setFormMontant(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <span className="block text-xs text-slate-400 mt-1">
                    Montant récupéré automatiquement depuis la formule.
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700 mb-1">
                      Date de réabonnement
                    </span>
                    <input
                      type="date"
                      value={formDateReabonnement}
                      onChange={(e) => setFormDateReabonnement(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700 mb-1">
                      Nouvelle date de fin
                    </span>
                    <input
                      type="date"
                      value={formDateFin}
                      onChange={(e) => setFormDateFin(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </label>
                </div>

                {feedback && (
                  <div
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                      feedback.type === 'error'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {feedback.type === 'error' ? (
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <span>{feedback.msg}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
                  >
                    {submitting ? 'Validation…' : 'Valider le réabonnement'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-900">{value || '—'}</p>
    </div>
  );
}
