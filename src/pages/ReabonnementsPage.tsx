import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Search,
  ChevronRight,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import type {
  ClientWithSubscriptions,
  Formula,
} from '@/lib/supabase';

import {
  getClientsWithSubscriptions,
  getActiveFormulas,
  getCurrentMvolaBalance,
  reabonnerClient,
} from '@/services/reabonnement.service';

import {
  todayLocal,
  addOneDay,
  addOneMonth,
} from '@/lib/date';

import {
  formatDate,
  formatPrice,
  getStatus,
  statusLabels,
  statusClasses,
} from '@/lib/status';

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none';

type SubscriptionItem = {
  sub: NonNullable<
    ClientWithSubscriptions['subscriptions']
  >[number];
  client: ClientWithSubscriptions;
};

export default function ReabonnementsPage() {
  const [clients, setClients] =
    useState<ClientWithSubscriptions[]>([]);

  const [formulas, setFormulas] = useState<Formula[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingSolde, setLoadingSolde] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedSubId, setSelectedSubId] =
    useState<string | null>(null);

  const [solde, setSolde] = useState(0);

  const [formFormulaId, setFormFormulaId] = useState('');
  const [formDateReabonnement, setFormDateReabonnement] =
    useState(todayLocal());
  const [formDateFin, setFormDateFin] = useState(
    addOneMonth(todayLocal())
  );

  const [minDateReabonnement, setMinDateReabonnement] =
    useState(todayLocal());

  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getClientsWithSubscriptions();
      setClients(data);
    } catch (error) {
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

  const fetchSolde = useCallback(async () => {
    setLoadingSolde(true);

    try {
      const value = await getCurrentMvolaBalance();
      setSolde(value);
    } catch (error) {
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

  const fetchFormulas = useCallback(async () => {
    try {
      const data = await getActiveFormulas();
      setFormulas(data);
    } catch (error) {
      setFeedback({
        type: 'error',
        msg:
          error instanceof Error
            ? error.message
            : 'Impossible de charger les formules.',
      });
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchSolde();
    fetchFormulas();
  }, [fetchClients, fetchSolde, fetchFormulas]);

  const allSubs: SubscriptionItem[] = clients.flatMap(
    (client) =>
      (client.subscriptions ?? []).map((sub) => ({
        sub,
        client,
      }))
  );

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

  const sorted = [...filtered].sort((a, b) => {
    const da = a.sub.date_fin ?? '9999-12-31';
    const db = b.sub.date_fin ?? '9999-12-31';

    return da.localeCompare(db);
  });

  const selected =
    allSubs.find(({ sub }) => sub.id === selectedSubId) ??
    null;

  useEffect(() => {
    if (!formDateReabonnement) {
      setFormDateFin('');
      return;
    }

    setFormDateFin(addOneMonth(formDateReabonnement));
  }, [formDateReabonnement]);

  const handleSelectSub = (subId: string) => {
    const item = allSubs.find(({ sub }) => sub.id === subId);

    if (!item) return;

    setSelectedSubId(subId);
    setFeedback(null);

    setFormFormulaId(item.sub.formula_id ?? '');

    const today = todayLocal();
    const currentEndDate = item.sub.date_fin;

    let allowedStartDate = today;

    if (currentEndDate && currentEndDate >= today) {
      allowedStartDate = addOneDay(currentEndDate);
    }

    setMinDateReabonnement(allowedStartDate);
    setFormDateReabonnement(allowedStartDate);
    setFormDateFin(addOneMonth(allowedStartDate));
  };

  const handleDateChange = (
    value: string
  ) => {
    if (!value) {
      setFormDateReabonnement('');
      return;
    }

    if (value < minDateReabonnement) {
      setFeedback({
        type: 'error',
        msg: `La date de réabonnement doit être à partir du ${formatDate(
          minDateReabonnement
        )}.`,
      });

      setFormDateReabonnement(minDateReabonnement);
      return;
    }

    setFeedback(null);
    setFormDateReabonnement(value);
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!selected) {
      setFeedback({
        type: 'error',
        msg: 'Veuillez sélectionner un abonnement.',
      });
      return;
    }

    if (!formFormulaId) {
      setFeedback({
        type: 'error',
        msg: 'Veuillez sélectionner une formule.',
      });
      return;
    }

    if (!formDateReabonnement) {
      setFeedback({
        type: 'error',
        msg: 'La date de réabonnement est obligatoire.',
      });
      return;
    }

    if (formDateReabonnement < minDateReabonnement) {
      setFeedback({
        type: 'error',
        msg: `Le réabonnement ne peut pas être effectué avant le ${formatDate(
          minDateReabonnement
        )}.`,
      });
      return;
    }

    if (!formDateFin) {
      setFeedback({
        type: 'error',
        msg: 'La date de fin est obligatoire.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const result = await reabonnerClient({
        subscriptionId: selected.sub.id,
        formulaId: formFormulaId,
        dateReabonnement: formDateReabonnement,
        dateFin: formDateFin,
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

      await Promise.all([
        fetchClients(),
        fetchSolde(),
      ]);

      setSelectedSubId(null);
      setFormFormulaId('');

      const today = todayLocal();

      setMinDateReabonnement(today);
      setFormDateReabonnement(today);
      setFormDateFin(addOneMonth(today));
    } catch (error) {
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
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-slate-900">
          Réabonnements
        </h1>

        <div className="mt-2 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1">
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Rechercher un client ou abonné…"
              className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Chargement…
              </div>
            ) : sorted.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                Aucun abonnement trouvé.
              </div>
            ) : (
              <div className="max-h-[600px] divide-y divide-slate-100 overflow-y-auto">
                {sorted.map(({ sub, client }) => {
                  const status = getStatus(sub.date_fin);
                  const isSelected =
                    sub.id === selectedSubId;

                  return (
                    <button
                      key={sub.id}
                      onClick={() =>
                        handleSelectSub(sub.id)
                      }
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50 ${
                        isSelected
                          ? 'bg-slate-100'
                          : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {client.nom_complet}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {sub.formula?.nom ?? '—'} · Fin :{' '}
                          {formatDate(sub.date_fin)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
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

        <div>
          {!selected ? (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                <RefreshCw className="h-5 w-5 text-slate-400" />
              </div>

              <p className="text-sm text-slate-500">
                Sélectionnez un client dans la liste pour
                effectuer un réabonnement.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
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
                        ? formatDate(
                            selected.sub.date_fin
                          )
                        : null
                    }
                  />
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-3 rounded-md border border-slate-200 bg-white p-4"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  Nouveau réabonnement
                </h3>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
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
                        {formula.nom} —{' '}
                        {formatPrice(formula.prix)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Date de réabonnement
                    </span>

                    <input
                      type="date"
                      value={formDateReabonnement}
                      min={minDateReabonnement}
                      onChange={(e) =>
                        handleDateChange(
                          e.target.value
                        )
                      }
                      className={inputClass}
                      required
                    />

                    <span className="mt-1 block text-xs text-slate-400">
                      Minimum :{' '}
                      {formatDate(
                        minDateReabonnement
                      )}
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Nouvelle date de fin
                    </span>

                    <input
                      type="date"
                      value={formDateFin}
                      readOnly
                      className={`${inputClass} cursor-not-allowed bg-slate-50`}
                    />

                    <span className="mt-1 block text-xs text-slate-400">
                      Automatiquement calculée à +1 mois.
                    </span>
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
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    )}

                    <span>{feedback.msg}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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