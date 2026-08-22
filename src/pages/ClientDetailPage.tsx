import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Phone,
  CreditCard,
  Calendar,
  Tag,
  FileText,
  History,
  AlertCircle,
} from 'lucide-react';

import type {
  ClientWithSubscriptions,
  Formula,
  ReabonnementWithFormula,
} from '@/lib/supabase';

import {
  getClientDetail,
  getActiveFormulas,
  updateSubscription,
  deleteSubscription,
} from '@/services/client.service';

import {
  formatDate,
  formatPrice,
  getStatus,
  statusLabels,
  statusClasses,
} from '@/lib/status';

import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';

type Props = {
  clientId: string;
  onBack: () => void;
};

type SubscriptionFormData = {
  numero_abonne: string;
  numero_carte: string;
  vad: string;
  date_reabonnement: string;
  date_fin: string;
  formula_id: string;
};

export default function ClientDetailPage({
  clientId,
  onBack,
}: Props) {
  const [client, setClient] =
    useState<ClientWithSubscriptions | null>(null);

  const [formulas, setFormulas] = useState<Formula[]>([]);

  const [reabonnementsBySub, setReabonnementsBySub] =
    useState<Record<string, ReabonnementWithFormula[]>>({});

  const [loading, setLoading] = useState(true);

  const [subFormOpen, setSubFormOpen] = useState(false);

  const [editingSubId, setEditingSubId] =
    useState<string | null>(null);

  const [deleteSubId, setDeleteSubId] =
    useState<string | null>(null);

  const [savingSub, setSavingSub] = useState(false);

  const [subError, setSubError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [subForm, setSubForm] =
    useState<SubscriptionFormData>({
      numero_abonne: '',
      numero_carte: '',
      vad: '',
      date_reabonnement: '',
      date_fin: '',
      formula_id: '',
    });

  /*
   * ============================
   * CHARGEMENT DU CLIENT
   * ============================
   */

  const loadClient = useCallback(async () => {
    setLoading(true);
    setPageError(null);

    try {
      const result = await getClientDetail(clientId);

      setClient(result.client);
      setReabonnementsBySub(result.reabonnementsBySub);
    } catch (error) {
      console.error('Erreur chargement client:', error);

      setClient(null);
      setReabonnementsBySub({});

      setPageError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger le client.'
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  /*
   * ============================
   * CHARGEMENT DES FORMULES
   * ============================
   */

  const loadFormulas = useCallback(async () => {
    try {
      const data = await getActiveFormulas();
      setFormulas(data as Formula[]);
    } catch (error) {
      console.error('Erreur chargement formules:', error);
    }
  }, []);

  useEffect(() => {
    loadClient();
    loadFormulas();
  }, [loadClient, loadFormulas]);

  /*
   * ============================
   * MODIFICATION ABONNEMENT
   * ============================
   */

  const openEditSub = (subId: string) => {
    const sub = client?.subscriptions?.find(
      (item) => item.id === subId
    );

    if (!sub) return;

    setEditingSubId(subId);

    setSubForm({
      numero_abonne: sub.numero_abonne ?? '',
      numero_carte: sub.numero_carte ?? '',
      vad: sub.vad ?? '',
      date_reabonnement:
        sub.date_reabonnement ?? '',
      date_fin: sub.date_fin ?? '',
      formula_id: sub.formula_id ?? '',
    });

    setSubError(null);
    setSubFormOpen(true);
  };

  /*
   * ============================
   * SAUVEGARDE
   * ============================
   */

  const handleSaveSub = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!editingSubId) {
      setSubError(
        "Un abonnement ne peut pas être créé depuis cette page. Utilisez la page Réabonnements."
      );
      return;
    }

    if (!subForm.formula_id) {
      setSubError(
        'Veuillez sélectionner une formule.'
      );
      return;
    }

    setSavingSub(true);
    setSubError(null);

    try {
      await updateSubscription(
        editingSubId,
        subForm
      );

      setSubFormOpen(false);
      setEditingSubId(null);

      await loadClient();
    } catch (error) {
      console.error(
        'Erreur modification abonnement:',
        error
      );

      setSubError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier l'abonnement."
      );
    } finally {
      setSavingSub(false);
    }
  };

  /*
   * ============================
   * SUPPRESSION
   * ============================
   */

  const handleDeleteSub = async () => {
    if (!deleteSubId) return;

    try {
      await deleteSubscription(deleteSubId);

      setDeleteSubId(null);

      await loadClient();
    } catch (error) {
      console.error(
        'Erreur suppression abonnement:',
        error
      );

      setPageError(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer l'abonnement."
      );
    }
  };

  /*
   * ============================
   * LOADING
   * ============================
   */

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        Chargement…
      </div>
    );
  }

  /*
   * ============================
   * ERREUR
   * ============================
   */

  if (pageError && !client) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
        </div>

        <p className="text-sm text-red-600 mb-4">
          {pageError}
        </p>

        <button
          onClick={onBack}
          className="text-sm font-medium text-slate-900 hover:underline"
        >
          Retour aux clients
        </button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-400 mb-4">
          Client introuvable.
        </p>

        <button
          onClick={onBack}
          className="text-sm font-medium text-slate-900 hover:underline"
        >
          Retour aux clients
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ============================
          RETOUR
      ============================ */}

      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux clients
      </button>

      {/* ============================
          HEADER
      ============================ */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {client.nom_complet}
          </h1>

          <p className="text-xs text-slate-500 mt-0.5">
            Client depuis le{' '}
            {formatDate(client.created_at)}
          </p>
        </div>
      </div>

      {/* ============================
          ERREUR
      ============================ */}

      {pageError && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />

          <span>{pageError}</span>
        </div>
      )}

      {/* ============================
          INFORMATIONS PERSONNELLES
      ============================ */}

      <div className="bg-white rounded-md border border-slate-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Informations personnelles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem
            icon={Phone}
            label="Téléphone"
            value={client.telephone}
          />
        </div>
      </div>

      {/* ============================
          ABONNEMENTS
      ============================ */}

      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Abonnement
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Les nouveaux réabonnements se font depuis la page
            « Réabonnements ».
          </p>
        </div>

        {!client.subscriptions ||
        client.subscriptions.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-400">
              Aucun abonnement enregistré.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {client.subscriptions.map((sub) => {
              const status = getStatus(
                sub.date_fin
              );

              const formula = sub.formula;

              return (
                <div
                  key={sub.id}
                  className="px-4 py-4"
                >
                  {/* En-tête abonnement */}

                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses[status]}`}
                      >
                        {statusLabels[status]}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        openEditSub(sub.id)
                      }
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Informations */}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <InfoItem
                      icon={CreditCard}
                      label="N° abonné"
                      value={sub.numero_abonne}
                    />

                    <InfoItem
                      icon={CreditCard}
                      label="N° carte"
                      value={sub.numero_carte}
                    />

                    <InfoItem
                      icon={Tag}
                      label="Formule"
                      value={
                        formula
                          ? `${formula.nom} — ${formatPrice(
                              formula.prix
                            )}`
                          : null
                      }
                    />

                    <InfoItem
                      icon={Calendar}
                      label="Date de réabonnement"
                      value={
                        sub.date_reabonnement
                          ? formatDate(
                              sub.date_reabonnement
                            )
                          : null
                      }
                    />

                    <InfoItem
                      icon={Calendar}
                      label="Date de fin"
                      value={
                        sub.date_fin
                          ? formatDate(
                              sub.date_fin
                            )
                          : null
                      }
                    />

                    <InfoItem
                      icon={FileText}
                      label="VAD"
                      value={sub.vad}
                    />
                  </div>

                  {/* ============================
                      HISTORIQUE
                  ============================ */}

                  {reabonnementsBySub[sub.id] &&
                    reabonnementsBySub[sub.id].length >
                      0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                          <History className="h-4 w-4 text-slate-400" />

                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Historique des réabonnements (
                            {
                              reabonnementsBySub[
                                sub.id
                              ].length
                            }
                            )
                          </h3>
                        </div>

                        <div className="space-y-2">
                          {reabonnementsBySub[
                            sub.id
                          ].map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between gap-3 bg-slate-50 rounded-md px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900">
                                  {r.formula?.nom ??
                                    '—'}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {formatDate(
                                    r.date_reabonnement
                                  )}
                                </p>
                              </div>

                              <span className="text-sm font-semibold text-slate-700 shrink-0">
                                {formatPrice(
                                  r.montant
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* ============================
                      ACTIONS
                  ============================ */}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() =>
                        setDeleteSubId(sub.id)
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================
          MODIFICATION ABONNEMENT
      ============================ */}

      <Modal
        open={subFormOpen}
        title="Modifier l'abonnement"
        onClose={() => {
          if (!savingSub) {
            setSubFormOpen(false);
            setEditingSubId(null);
            setSubError(null);
          }
        }}
      >
        <form
          onSubmit={handleSaveSub}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="N° abonné">
              <input
                type="text"
                value={subForm.numero_abonne}
                onChange={(e) =>
                  setSubForm({
                    ...subForm,
                    numero_abonne:
                      e.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>

            <Field label="N° carte">
              <input
                type="text"
                value={subForm.numero_carte}
                onChange={(e) =>
                  setSubForm({
                    ...subForm,
                    numero_carte:
                      e.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Formule">
            <select
              value={subForm.formula_id}
              onChange={(e) =>
                setSubForm({
                  ...subForm,
                  formula_id:
                    e.target.value,
                })
              }
              className={inputClass}
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
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de réabonnement">
              <input
                type="date"
                value={
                  subForm.date_reabonnement
                }
                onChange={(e) =>
                  setSubForm({
                    ...subForm,
                    date_reabonnement:
                      e.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Date de fin">
              <input
                type="date"
                value={subForm.date_fin}
                onChange={(e) =>
                  setSubForm({
                    ...subForm,
                    date_fin:
                      e.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="VAD">
            <input
              type="text"
              value={subForm.vad}
              onChange={(e) =>
                setSubForm({
                  ...subForm,
                  vad: e.target.value,
                })
              }
              className={inputClass}
              placeholder="Facultatif"
            />
          </Field>

          {subError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />

              <span>{subError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setSubFormOpen(false);
                setEditingSubId(null);
                setSubError(null);
              }}
              disabled={savingSub}
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={savingSub}
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
            >
              {savingSub
                ? 'Enregistrement…'
                : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================
          CONFIRMATION SUPPRESSION
      ============================ */}

      <ConfirmDialog
        open={!!deleteSubId}
        title="Supprimer l'abonnement"
        message="Voulez-vous vraiment supprimer cet abonnement ?"
        confirmLabel="Supprimer"
        onConfirm={handleDeleteSub}
        onCancel={() => setDeleteSubId(null)}
      />
    </div>
  );
}

/*
 * ============================
 * FIELD
 * ============================
 */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </span>

      {children}
    </label>
  );
}

/*
 * ============================
 * INFO ITEM
 * ============================
 */

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />

      <div className="min-w-0">
        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="text-sm text-slate-900 truncate">
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none';