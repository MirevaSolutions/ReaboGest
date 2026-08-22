import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Search,
  ChevronRight,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import type { ClientWithSubscriptions, Formula } from '@/lib/supabase';

import {
  getClientsWithSubscriptions,
  getActiveFormulas,
  getCurrentMvolaBalance,
  reabonnerClient,
} from '@/services/reabonnement.service';

import {
  formatDate,
  formatPrice,
  getStatus,
  statusLabels,
  statusClasses,
} from '@/lib/status';

import { todayLocal } from '@/lib/date';

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none';

type SubscriptionItem = {
  sub: NonNullable<ClientWithSubscriptions['subscriptions']>[number];
  client: ClientWithSubscriptions;
};

export default function ReabonnementsPage() {
  const [clients, setClients] = useState<ClientWithSubscriptions[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingSolde, setLoadingSolde] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const [solde, setSolde] = useState(0);

  const [formFormulaId, setFormFormulaId] = useState('');
  const [formMontant, setFormMontant] = useState('');
  const [formDateReabonnement, setFormDateReabonnement] =
    useState(todayLocal());
  const [formDateFin, setFormDateFin] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  /*
   * Chargement des clients
   */
  const fetchClients = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getClientsWithSubscriptions();
      setClients(data);
    } catch (error) {
      console.error('Erreur chargement clients:', error);

      setFeedback({
        type: 'error',
        msg:
          error instanceof Error
            ? error.message
            : 'Impossible de charger les clients.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * Chargement du solde MVola
   */
  const fetchSolde = useCallback(async () => {
    setLoadingSolde(true);

    try {
      const value = await getCurrentMvolaBalance();
      setSolde(value);
    } catch (error) {
      console.error('Erreur récupération solde MVola:', error);

      setFeedback({
        type: 'error',
        msg:
          error instanceof Error
            ? error.message
            : 'Impossible de récupérer le solde MVola.',
      });
    } finally {
      setLoadingSolde(false);
    }
  }, []);

  /*
   * Chargement des formules
   */
  const fetchFormulas = useCallback(async () => {
    try {
      const data = await getActiveFormulas();
      setFormulas(data);
    } catch (error) {
      console.error('Erreur chargement formules:', error);

      setFeedback({
        type: 'error',
        msg:
          error instanceof Error
            ? error.message
            : 'Impossible de charger les formules.',
      });
    }
  }, []);

  /*
   * Chargement initial
   */
  useEffect(() => {
    fetchClients();
    fetchSolde();
    fetchFormulas();
  }, [fetchClients, fetchSolde, fetchFormulas]);

  /*
   * Toutes les souscriptions avec leur client
   */
  const allSubs: SubscriptionItem[] = clients.flatMap((client) =>
    (client.subscriptions ?? []).map((sub) => ({
      sub,
      client,
    }))
  );

  /*
   * Recherche
   */
  const filtered = allSubs.filter(({ client, sub }) => {
    const q = search.toLowerCase().trim();

    if (!q) return true;

    return (
      client.nom_complet.toLowerCase().includes(q) ||
      (client.telephone ?? '').toLowerCase().includes(q) ||
      (sub.numero_abonne ?? '').toLowerCase().includes(q) ||
      (sub.numero_carte ?? '').toLowerCase().includes(q) ||
      (sub.formula?.nom ?? '').toLowerCase().includes(q)
    );
  });

  /*
   * Tri par date de fin
   */
  const sorted = [...filtered].sort((a, b) => {
    const da = a.sub.date_fin ?? '9999-12-31';
    const db = b.sub.date_fin ?? '9999-12-31';

    return da.localeCompare(db);
  });

  /*
   * Abonnement sélectionné
   */
  const selected =
    allSubs.find(({ sub }) => sub.id === selectedSubId) ?? null;

  /*
   * Lorsque la formule change,
   * le montant est automatiquement mis à jour.
   */
  useEffect(() => {
    if (!formFormulaId) {
      setFormMontant('');
      return;
    }

    const formula = formulas.find(
      (item) => item.id === formFormulaId
    );

    if (formula) {
      setFormMontant(String(formula.prix));
    }
  }, [formFormulaId, formulas]);

  /*
   * Sélection d'un abonnement
   */
  const handleSelectSub = (subId: string) => {
    setSelectedSubId(subId);
    setFeedback(null);

    const item = allSubs.find(({ sub }) => sub.id === subId);

    if (!item) return;

    setFormFormulaId(item.sub.formula_id ?? '');
    setFormDateReabonnement(todayLocal());
    setFormDateFin('');
  };

  /*
   * Validation du réabonnement
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSubId) {
      setFeedback({
        type: 'error',
        msg: 'Veuillez sélectionner un abonnement.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const montant = parseInt(formMontant, 10);

    if (Number.isNaN(montant) || montant < 0) {
      setFeedback({
        type: 'error',
        msg: 'Le montant est invalide.',
      });

      setSubmitting(false);
      return;
    }

    if (!formFormulaId) {
      setFeedback({
        type: 'error',
        msg: 'Veuillez sélectionner une formule.',
      });

      setSubmitting(false);
      return;
    }

    if (!formDateReabonnement) {
      setFeedback({
        type: 'error',
        msg: 'La date de réabonnement est obligatoire.',
      });

      setSubmitting(false);
      return;
    }

    if (!formDateFin) {
      setFeedback({
        type: 'error',
        msg: 'La nouvelle date de fin est obligatoire.',
      });

      setSubmitting(false);
      return;
    }

    try {
      const result = await reabonnerClient({
        subscriptionId: selectedSubId,
        formulaId: formFormulaId,
        dateReabonnement: formDateReabonnement,
        dateFin: formDateFin,
        montant,
      });

      if (!result.success) {
        setFeedback({
          type: 'error',
          msg:
            result.error ??
            'Impossible d’effectuer le réabonnement.',
        });

        return;
      }

      setFeedback({
        type: 'success',
        msg: 'Réabonnement effectué avec succès.',
      });

      /*
       * Actualisation des données après opération
       */
      await Promise.all([
        fetchClients(),
        fetchSolde(),
      ]);

      /*
       * Réinitialisation du formulaire
       */
      setSelectedSubId(null);
      setFormFormulaId('');
      setFormMontant('');
      setFormDateReabonnement(todayLocal());
      setFormDateFin('');
    } catch (error) {
      console.error('Erreur réabonnement:', error);

      setFeedback({
        type: 'error',
        msg:
          error instanceof Error
            ? error.message
            : 'Une erreur est survenue lors du réabonnement.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* En-tête */}
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-slate-900">
          Réabonnements
        </h1>

        <div className="flex items-center gap-2 mt-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white border border-slate-200">
            <Wallet className="h-4 w-4 text-slate-500" />

            <span className="text-sm text-slate-600">
              Solde MVola :
            </span>

            {loadingSolde ? (
              <span className="text-sm text-slate-400">
                Chargement…
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-900">
                {formatPrice(solde)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Liste des abonnements */}
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client ou abonné…"
              className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-300 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Chargement…
              </div>
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
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 ${
                        isSelected ? 'bg-slate-100' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {client.nom_complet}
                        </p>

                        <p className="text-xs text-slate-500 mt-0.5">
                          {sub.formula?.nom ?? '—'} · Fin :{' '}
                          {formatDate(sub.date_fin)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusClasses[status]}`}
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

        {/* Panneau droit */}
        <div>
          {!selected ? (
            <div className="bg-white rounded-md border border-slate-200 p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 mb-3">
                <RefreshCw className="h-5 w-5 text-slate-400" />
              </div>

              <p className="text-sm text-slate-500">
                Sélectionnez un client dans la liste pour effectuer
                un réabonnement.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Informations actuelles */}
              <div className="bg-white rounded-md border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Informations actuelles
                </h3>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem
                    label="Nom"
                    value={selected.client.nom_complet}
                  />

                  <InfoItem
                    label="Téléphone"
                    value={selected.client.telephone}
                  />

                  <InfoItem
                    label="N° abonné"
                    value={selected.sub.numero_abonne}
                  />

                  <InfoItem
                    label="N° carte"
                    value={selected.sub.numero_carte}
                  />

                  <InfoItem
                    label="Formule actuelle"
                    value={
                      selected.sub.formula
                        ? `${selected.sub.formula.nom} — ${formatPrice(
                            selected.sub.formula.prix
                          )}`
                        : null
                    }
                  />

                  <InfoItem
                    label="Date de fin actuelle"
                    value={
                      selected.sub.date_fin
                        ? formatDate(selected.sub.date_fin)
                        : null
                    }
                  />
                </div>
              </div>

              {/* Formulaire */}
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-md border border-slate-200 p-4 space-y-3"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  Nouveau réabonnement
                </h3>

                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">
                    Formule
                  </span>

                  <select
                    value={formFormulaId}
                    onChange={(e) =>
                      setFormFormulaId(e.target.value)
                    }
                    className={inputClass}
                    required
                  >
                    <option value="">
                      — Sélectionner —
                    </option>

                    {formulas.map((formula) => (
                      <option
                        key={formula.id}
                        value={formula.id}
                      >
                        {formula.nom} — {formatPrice(formula.prix)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 mb-1">
                    Montant (Ar)
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={formMontant}
                    onChange={(e) =>
                      setFormMontant(e.target.value)
                    }
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
                      onChange={(e) =>
                        setFormDateReabonnement(e.target.value)
                      }
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
                      onChange={(e) =>
                        setFormDateFin(e.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </label>
                </div>

                {feedback && (
                  <div
                    className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
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
                    className="px-3 py-2 rounded-md text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? 'Validation…'
                      : 'Valider le réabonnement'}
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

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="text-sm text-slate-900">
        {value || '—'}
      </p>
    </div>
  );
}