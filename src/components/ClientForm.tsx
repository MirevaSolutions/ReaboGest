import { useEffect, useState } from 'react';
import { supabase, type Formula } from '@/lib/supabase';

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
  initialClient?: ClientFormData | null;
  initialSubscription?: SubscriptionFormData | null;
  onSubmit: (client: ClientFormData, subscription: SubscriptionFormData) => Promise<void>;
  onClose: () => void;
};

export default function ClientForm({
  open,
  initialClient,
  initialSubscription,
  onSubmit,
  onClose,
}: Props) {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [client, setClient] = useState<ClientFormData>({ nom_complet: '', telephone: '' });
  const [sub, setSub] = useState<SubscriptionFormData>({
    numero_abonne: '',
    numero_carte: '',
    vad: '',
    date_reabonnement: '',
    date_fin: '',
    formula_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('formulas')
      .select('*')
      .eq('active', true)
      .order('prix', { ascending: true })
      .then(({ data }) => {
        if (data) setFormulas(data as Formula[]);
      });
  }, [open]);

  useEffect(() => {
    if (open) {
      setClient(initialClient ?? { nom_complet: '', telephone: '' });
      setSub(
        initialSubscription ?? {
          numero_abonne: '',
          numero_carte: '',
          vad: '',
          date_reabonnement: '',
          date_fin: '',
          formula_id: '',
        }
      );
      setError(null);
    }
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
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            {initialClient ? 'Modifier le client' : 'Ajouter un client'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fermer"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-5">
          {/* Informations personnelles */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Informations personnelles
            </h4>
            <div className="space-y-3">
              <Field label="Nom complet" required>
                <input
                  type="text"
                  value={client.nom_complet}
                  onChange={(e) => setClient({ ...client, nom_complet: e.target.value })}
                  className={inputClass}
                  placeholder="Ex: Rakoto Jean"
                  required
                />
              </Field>
              <Field label="Téléphone">
                <input
                  type="tel"
                  value={client.telephone}
                  onChange={(e) => setClient({ ...client, telephone: e.target.value })}
                  className={inputClass}
                  placeholder="Ex: 034 12 345 67"
                />
              </Field>
            </div>
          </div>

          {/* Abonnement */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Abonnement
            </h4>
            <div className="space-y-3">
              <Field label="Formule">
                <select
                  value={sub.formula_id}
                  onChange={(e) => setSub({ ...sub, formula_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">— Sélectionner —</option>
                  {formulas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom} — {new Intl.NumberFormat('fr-FR').format(f.prix)} Ar
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Numéro abonné">
                  <input
                    type="text"
                    value={sub.numero_abonne}
                    onChange={(e) => setSub({ ...sub, numero_abonne: e.target.value })}
                    className={inputClass}
                    placeholder="Ex: 1234567"
                  />
                </Field>
                <Field label="Numéro de carte">
                  <input
                    type="text"
                    value={sub.numero_carte}
                    onChange={(e) => setSub({ ...sub, numero_carte: e.target.value })}
                    className={inputClass}
                    placeholder="Ex: 0123 4567 8901"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de réabonnement">
                  <input
                    type="date"
                    value={sub.date_reabonnement}
                    onChange={(e) => setSub({ ...sub, date_reabonnement: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Date de fin">
                  <input
                    type="date"
                    value={sub.date_fin}
                    onChange={(e) => setSub({ ...sub, date_fin: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="VAD">
                <input
                  type="text"
                  value={sub.vad}
                  onChange={(e) => setSub({ ...sub, vad: e.target.value })}
                  className={inputClass}
                  placeholder="Facultatif"
                />
              </Field>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : initialClient ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none';

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
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
