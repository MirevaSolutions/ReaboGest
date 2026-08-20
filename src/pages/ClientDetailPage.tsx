import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Phone,
  Plus,
  CreditCard,
  Calendar,
  Tag,
  FileText,
} from 'lucide-react';
import { supabase, type ClientWithSubscriptions, type Formula, type ReabonnementWithFormula } from '@/lib/supabase';
import { formatDate, formatPrice, getStatus, statusLabels, statusClasses } from '@/lib/status';
import { performAbonnement } from '@/lib/mvola';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import { History, AlertCircle } from 'lucide-react';

type Props = {
  clientId: string;
  onBack: () => void;
};

export default function ClientDetailPage({ clientId, onBack }: Props) {
  const [client, setClient] = useState<ClientWithSubscriptions | null>(null);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);
  const [savingSub, setSavingSub] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [reabonnementsBySub, setReabonnementsBySub] = useState<Record<string, ReabonnementWithFormula[]>>({});

  // formulaire abonnement
  const [subForm, setSubForm] = useState({
    numero_abonne: '',
    numero_carte: '',
    vad: '',
    date_reabonnement: '',
    date_fin: '',
    formula_id: '',
  });

  const fetchClient = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*, subscriptions(*, formula:formulas(*))')
      .eq('id', clientId)
      .maybeSingle();
    if (error) {
      console.error('Erreur:', error);
    } else {
      const c = data as ClientWithSubscriptions;
      setClient(c);
      // Charger l'historique des réabonnements pour chaque abonnement
      const subIds = (c.subscriptions ?? []).map((s) => s.id);
      if (subIds.length > 0) {
        const { data: reabData } = await supabase
          .from('reabonnements')
          .select('*, formula:formulas(*)')
          .in('subscription_id', subIds)
          .order('created_at', { ascending: false });
        if (reabData) {
          const grouped: Record<string, ReabonnementWithFormula[]> = {};
          (reabData as ReabonnementWithFormula[]).forEach((r) => {
            if (!grouped[r.subscription_id]) grouped[r.subscription_id] = [];
            grouped[r.subscription_id].push(r);
          });
          setReabonnementsBySub(grouped);
        }
      } else {
        setReabonnementsBySub({});
      }
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  useEffect(() => {
    supabase
      .from('formulas')
      .select('*')
      .eq('active', true)
      .order('prix', { ascending: true })
      .then(({ data }) => {
        if (data) setFormulas(data as Formula[]);
      });
  }, []);

  const openAddSub = () => {
    setEditingSubId(null);
    setSubError(null);
    setSubForm({
      numero_abonne: '',
      numero_carte: '',
      vad: '',
      date_reabonnement: '',
      date_fin: '',
      formula_id: '',
    });
    setSubFormOpen(true);
  };

  const openEditSub = (subId: string) => {
    const sub = client?.subscriptions?.find((s) => s.id === subId);
    if (!sub) return;
    setEditingSubId(subId);
    setSubForm({
      numero_abonne: sub.numero_abonne ?? '',
      numero_carte: sub.numero_carte ?? '',
      vad: sub.vad ?? '',
      date_reabonnement: sub.date_reabonnement ?? '',
      date_fin: sub.date_fin ?? '',
      formula_id: sub.formula_id ?? '',
    });
    setSubFormOpen(true);
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSub(true);
    const payload = {
      numero_abonne: subForm.numero_abonne.trim() || null,
      numero_carte: subForm.numero_carte.trim() || null,
      vad: subForm.vad.trim() || null,
      date_reabonnement: subForm.date_reabonnement || null,
      date_fin: subForm.date_fin || null,
      formula_id: subForm.formula_id || null,
      updated_at: new Date().toISOString(),
    };
    if (editingSubId) {
      const { error } = await supabase.from('subscriptions').update(payload).eq('id', editingSubId);
      if (error) { console.error(error); setSavingSub(false); return; }
    } else {
      const { data: newSub, error } = await supabase.from('subscriptions').insert({
        client_id: clientId,
        ...payload,
        updated_at: undefined,
      }).select().single();
      if (error) { console.error(error); setSavingSub(false); return; }

      // Enregistrer l'abonnement initial comme source de revenu
      if (subForm.formula_id && subForm.date_reabonnement) {
        const formula = formulas.find((f) => f.id === subForm.formula_id);
        if (formula && formula.prix > 0) {
          const result = await performAbonnement({
            subscriptionId: newSub.id,
            formulaId: subForm.formula_id,
            dateReabonnement: subForm.date_reabonnement,
            montant: formula.prix,
          });
          if (!result.success) {
            setSubError(result.error ?? 'Solde MVola insuffisant pour l\'abonnement.');
            setSavingSub(false);
            return;
          }
        }
      }
    }
    setSubFormOpen(false);
    setSubError(null);
    setSavingSub(false);
    await fetchClient();
  };

  const handleDeleteSub = async () => {
    if (!deleteSubId) return;
    const { error } = await supabase.from('subscriptions').delete().eq('id', deleteSubId);
    if (error) {
      console.error(error);
    } else {
      setDeleteSubId(null);
      await fetchClient();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-sm text-slate-400">Chargement…</div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-400 mb-4">Client introuvable.</p>
        <button onClick={onBack} className="text-sm text-slate-900 font-medium hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux clients
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{client.nom_complet}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Client depuis le {formatDate(client.created_at)}
          </p>
        </div>
      </div>

      {/* Infos personnelles */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Informations personnelles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <Phone className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Téléphone</p>
              <p className="text-sm text-slate-900">{client.telephone || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Abonnements */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Abonnements ({client.subscriptions?.length ?? 0})
          </h2>
          <button
            onClick={openAddSub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>

        {(!client.subscriptions || client.subscriptions.length === 0) ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Aucun abonnement enregistré.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {client.subscriptions.map((sub) => {
              const status = getStatus(sub.date_fin);
              const formula = sub.formula;
              return (
                <div key={sub.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses[status]}`}
                    >
                      {statusLabels[status]}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditSub(sub.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteSubId(sub.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <InfoItem icon={CreditCard} label="N° abonné" value={sub.numero_abonne} />
                    <InfoItem icon={CreditCard} label="N° carte" value={sub.numero_carte} />
                    <InfoItem icon={Tag} label="Formule" value={formula ? `${formula.nom} — ${formatPrice(formula.prix)}` : null} />
                    <InfoItem icon={Calendar} label="Date de réabonnement" value={sub.date_reabonnement ? formatDate(sub.date_reabonnement) : null} />
                    <InfoItem icon={Calendar} label="Date de fin" value={sub.date_fin ? formatDate(sub.date_fin) : null} />
                    <InfoItem icon={FileText} label="VAD" value={sub.vad} />
                  </div>

                  {/* Historique des réabonnements */}
                  {reabonnementsBySub[sub.id] && reabonnementsBySub[sub.id].length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <History className="h-4 w-4 text-slate-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Historique des réabonnements ({reabonnementsBySub[sub.id].length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {reabonnementsBySub[sub.id].map((r) => (
                          <div key={r.id} className="flex items-center justify-between gap-3 text-sm bg-slate-50 rounded-lg px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-slate-900 font-medium">
                                {r.formula?.nom ?? '—'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatDate(r.date_reabonnement)}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 shrink-0">
                              {formatPrice(r.montant)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal formulaire abonnement */}
      <Modal
        open={subFormOpen}
        title={editingSubId ? "Modifier l'abonnement" : 'Ajouter un abonnement'}
        onClose={() => setSubFormOpen(false)}
      >
        <form onSubmit={handleSaveSub} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">N° abonné</span>
              <input
                type="text"
                value={subForm.numero_abonne}
                onChange={(e) => setSubForm({ ...subForm, numero_abonne: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">N° carte</span>
              <input
                type="text"
                value={subForm.numero_carte}
                onChange={(e) => setSubForm({ ...subForm, numero_carte: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Formule</span>
            <select
              value={subForm.formula_id}
              onChange={(e) => setSubForm({ ...subForm, formula_id: e.target.value })}
              className={inputClass}
            >
              <option value="">— Sélectionner —</option>
              {formulas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom} — {formatPrice(f.prix)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Date de réabonnement</span>
              <input
                type="date"
                value={subForm.date_reabonnement}
                onChange={(e) => setSubForm({ ...subForm, date_reabonnement: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Date de fin</span>
              <input
                type="date"
                value={subForm.date_fin}
                onChange={(e) => setSubForm({ ...subForm, date_fin: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">VAD</span>
            <input
              type="text"
              value={subForm.vad}
              onChange={(e) => setSubForm({ ...subForm, vad: e.target.value })}
              className={inputClass}
              placeholder="Facultatif"
            />
          </label>

          {subError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{subError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSubFormOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={savingSub}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
            >
              {savingSub ? 'Enregistrement…' : editingSubId ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

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

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none';

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
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-900 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}
