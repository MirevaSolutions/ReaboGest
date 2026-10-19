import { useEffect, useState } from 'react';
import type { Formula } from '@/lib/types';
import { addOneMonth, todayLocal } from '@/lib/date';

export type ClientFormData = {
  nom_complet: string;
  telephone: string;
};

export type SubscriptionFormData = {
  numero_abonne: string;
  numero_carte: string;
  vad: string;
  date_reabonnement: string;
  date_fin: string;
  formula_id: string;
};

type Props = {
  open: boolean;
  formulas: Formula[];
  initialClient?: ClientFormData | null;
  initialSubscription?: SubscriptionFormData | null;
  onSubmit: (
    client: ClientFormData,
    subscription: SubscriptionFormData
  ) => Promise<void>;
  onClose: () => void;
};

export default function ClientForm({
  open,
  formulas,
  initialClient,
  initialSubscription,
  onSubmit,
  onClose,
}: Props) {
  const [client, setClient] = useState<ClientFormData>({
    nom_complet: '',
    telephone: '',
  });

  const [sub, setSub] = useState<SubscriptionFormData>({
    numero_abonne: '',
    numero_carte: '',
    vad: '',
    date_reabonnement: todayLocal(),
    date_fin: addOneMonth(todayLocal()),
    formula_id: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const today = todayLocal();

    setClient(
      initialClient ?? {
        nom_complet: '',
        telephone: '',
      }
    );

    setSub(
      initialSubscription ?? {
        numero_abonne: '',
        numero_carte: '',
        vad: '',
        date_reabonnement: today,
        date_fin: addOneMonth(today),
        formula_id: '',
      }
    );

    setError(null);
  }, [open, initialClient, initialSubscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client.nom_complet.trim()) {
      setError('Le nom complet est obligatoire.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit(client, sub);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex w-full max-w-xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {initialClient
                ? 'Modifier le client'
                : 'Ajouter un client'}
            </h3>

            <p className="mt-0.5 text-xs text-slate-400">
              {initialClient
                ? 'Modifiez les informations du client.'
                : 'Ajoutez un client et son abonnement.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fermer"
          >
            <XIcon />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-5 py-5"
        >
          <div className="space-y-6">
            {/* Informations personnelles */}
            <FormSection
              title="Informations personnelles"
              description="Informations principales du client."
            >
              <div className="space-y-4">
                <Field
                  label="Nom complet"
                  required
                >
                  <input
                    type="text"
                    value={client.nom_complet}
                    onChange={(e) =>
                      setClient({
                        ...client,
                        nom_complet: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Ex : Rakoto Jean"
                    required
                  />
                </Field>

                <Field label="Téléphone">
                  <input
                    type="tel"
                    value={client.telephone}
                    onChange={(e) =>
                      setClient({
                        ...client,
                        telephone: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Ex : 034 12 345 67"
                  />
                </Field>
              </div>
            </FormSection>

            {/* Abonnement */}
            <FormSection
              title="Abonnement"
              description="Informations liées au réabonnement du client."
            >
              <div className="space-y-4">
                {/* Formule */}
                <Field label="Formule">
                  <select
                    value={sub.formula_id}
                    onChange={(e) =>
                      setSub({
                        ...sub,
                        formula_id: e.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">
                      — Sélectionner une formule —
                    </option>

                    {formulas.map((f) => (
                      <option
                        key={f.id}
                        value={f.id}
                      >
                        {f.nom} —{' '}
                        {new Intl.NumberFormat('fr-FR').format(
                          f.prix
                        )}{' '}
                        Ar
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Numéros */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Numéro abonné">
                    <input
                      type="text"
                      value={sub.numero_abonne}
                      onChange={(e) =>
                        setSub({
                          ...sub,
                          numero_abonne: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="Ex : 1234567"
                    />
                  </Field>

                  <Field label="Numéro de carte">
                    <input
                      type="text"
                      value={sub.numero_carte}
                      onChange={(e) =>
                        setSub({
                          ...sub,
                          numero_carte: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="Ex : 0123 4567 8901"
                      required
                    />
                  </Field>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Date de réabonnement">
                    <input
                      type="date"
                      value={sub.date_reabonnement}
                      onChange={(e) =>
                        setSub({
                          ...sub,
                          date_reabonnement: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Date de fin">
                    <input
                      type="date"
                      value={sub.date_fin}
                      onChange={(e) =>
                        setSub({
                          ...sub,
                          date_fin: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                {/* VAD */}
                <Field label="VAD">
                  <input
                    type="text"
                    value={sub.vad}
                    onChange={(e) =>
                      setSub({
                        ...sub,
                        vad: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Facultatif"
                  />
                </Field>
              </div>
            </FormSection>

            {/* Erreur */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Enregistrement…'
                : initialClient
                  ? 'Enregistrer'
                  : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-900">
          {title}
        </h4>

        <p className="mt-0.5 text-xs text-slate-400">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500">*</span>
        )}
      </span>

      {children}
    </label>
  );
}

function XIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}