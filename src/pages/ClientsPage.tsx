import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Search, Pencil, Trash2, Eye, Users as UsersIcon } from 'lucide-react';
import {
  supabase,
  type ClientWithSubscriptions,
} from '@/lib/supabase';
import { formatDate, getStatus, type SubscriptionStatus } from '@/lib/status';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import ClientForm, { type ClientFormData, type SubscriptionFormData } from '@/components/ClientForm';

type StatusFilter = 'tous' | SubscriptionStatus;

const filterLabels: { key: StatusFilter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'expire_aujourd_hui', label: "Expire aujourd'hui" },
  { key: 'expire_demain', label: 'Expire demain' },
  { key: 'expire', label: 'Expirés' },
];

type Props = {
  onOpenClient: (clientId: string) => void;
};

export default function ClientsPage({ onOpenClient }: Props) {
  const [clients, setClients] = useState<ClientWithSubscriptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithSubscriptions | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientWithSubscriptions | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*, subscriptions(*, formula:formulas(*))')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erreur chargement clients:', error);
    } else {
      setClients((data ?? []) as ClientWithSubscriptions[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // La date de fin la plus éloignée parmi les abonnements du client
  const getLatestDateFin = (c: ClientWithSubscriptions): string | null => {
    if (!c.subscriptions || c.subscriptions.length === 0) return null;
    const dates = c.subscriptions
      .map((s) => s.date_fin)
      .filter((d): d is string => !!d)
      .sort();
    return dates[dates.length - 1] ?? null;
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase().trim();
    const sub = c.subscriptions?.[0];
    const latestDateFin = getLatestDateFin(c);

    // Filtre par statut
    if (statusFilter !== 'tous') {
      if (getStatus(latestDateFin) !== statusFilter) return false;
    }

    // Recherche textuelle + date
    if (!q) return true;

    // Recherche par date : vérifier si la requête correspond à une date au format JJ/MM/AAAA ou JJMMAA
    const dateMatch = latestDateFin && formatDate(latestDateFin).toLowerCase().includes(q);
    const dateFinRaw = (latestDateFin ?? '').toLowerCase();

    return (
      c.nom_complet.toLowerCase().includes(q) ||
      (c.telephone ?? '').toLowerCase().includes(q) ||
      (sub?.numero_abonne ?? '').toLowerCase().includes(q) ||
      (sub?.numero_carte ?? '').toLowerCase().includes(q) ||
      (dateMatch ?? false) ||
      dateFinRaw.includes(q)
    );
  });

  const handleAdd = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const handleEdit = (client: ClientWithSubscriptions) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleSubmit = async (clientData: ClientFormData, subData: SubscriptionFormData) => {
    if (editingClient) {
      // Mise à jour du client
      const { error: clientErr } = await supabase
        .from('clients')
        .update({
          nom_complet: clientData.nom_complet.trim(),
          telephone: clientData.telephone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingClient.id);
      if (clientErr) throw clientErr;

      // Mise à jour du premier abonnement s'il existe, sinon création
      const existingSub = editingClient.subscriptions?.[0];
      const subPayload = {
        numero_abonne: subData.numero_abonne.trim() || null,
        numero_carte: subData.numero_carte.trim() || null,
        vad: subData.vad.trim() || null,
        date_reabonnement: subData.date_reabonnement || null,
        date_fin: subData.date_fin || null,
        formula_id: subData.formula_id || null,
        updated_at: new Date().toISOString(),
      };
      if (existingSub) {
        const { error: subErr } = await supabase
          .from('subscriptions')
          .update(subPayload)
          .eq('id', existingSub.id);
        if (subErr) throw subErr;
      } else {
        const { error: subErr } = await supabase.from('subscriptions').insert({
          client_id: editingClient.id,
          ...subPayload,
        });
        if (subErr) throw subErr;
      }
    } else {
      // Création du client
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert({
          nom_complet: clientData.nom_complet.trim(),
          telephone: clientData.telephone.trim() || null,
        })
        .select()
        .single();
      if (clientErr) throw clientErr;

      // Création de l'abonnement associé
      const { error: subErr } = await supabase.from('subscriptions').insert({
        client_id: newClient.id,
        numero_abonne: subData.numero_abonne.trim() || null,
        numero_carte: subData.numero_carte.trim() || null,
        vad: subData.vad.trim() || null,
        date_reabonnement: subData.date_reabonnement || null,
        date_fin: subData.date_fin || null,
        formula_id: subData.formula_id || null,
      });
      if (subErr) throw subErr;
    }
    setFormOpen(false);
    setEditingClient(null);
    await fetchClients();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
    if (error) {
      console.error('Erreur suppression:', error);
    } else {
      setDeleteTarget(null);
      await fetchClients();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {clients.length} client{clients.length > 1 ? 's' : ''} enregistré{clients.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          <UserPlus className="h-4 w-4" />
          Ajouter un client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, téléphone, numéro abonné ou date…"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
        />
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {filterLabels.map((f) => {
          const active = statusFilter === f.key;
          return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            );
        })}
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Nom complet</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Téléphone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">N° abonné</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">N° carte</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Date de fin</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Statut</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                  Aucun client trouvé.
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const sub = c.subscriptions?.[0];
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.nom_complet}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.telephone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{sub?.numero_abonne || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{sub?.numero_carte || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(getLatestDateFin(c))}</td>
                  <td className="px-4 py-3">
                    <StatusBadge dateFin={getLatestDateFin(c)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onOpenClient(c.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Voir le détail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {loading && <p className="text-center text-sm text-slate-400 py-8">Chargement…</p>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Aucun client trouvé.</p>
          </div>
        )}
        {filtered.map((c) => {
          const sub = c.subscriptions?.[0];
          return (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{c.nom_complet}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.telephone || '—'}</p>
                </div>
                <StatusBadge dateFin={getLatestDateFin(c)} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">N° abonné</p>
                  <p className="text-slate-700">{sub?.numero_abonne || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400">N° carte</p>
                  <p className="text-slate-700">{sub?.numero_carte || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Date de fin</p>
                  <p className="text-slate-700">{formatDate(getLatestDateFin(c))}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => onOpenClient(c.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Détails
                </button>
                <button
                  onClick={() => handleEdit(c)}
                  className="py-1.5 px-3 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(c)}
                  className="py-1.5 px-3 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      <ClientForm
        open={formOpen}
        initialClient={
          editingClient
            ? { nom_complet: editingClient.nom_complet, telephone: editingClient.telephone ?? '' }
            : null
        }
        initialSubscription={
          editingClient?.subscriptions?.[0]
            ? {
                numero_abonne: editingClient.subscriptions[0].numero_abonne ?? '',
                numero_carte: editingClient.subscriptions[0].numero_carte ?? '',
                vad: editingClient.subscriptions[0].vad ?? '',
                date_reabonnement: editingClient.subscriptions[0].date_reabonnement ?? '',
                date_fin: editingClient.subscriptions[0].date_fin ?? '',
                formula_id: editingClient.subscriptions[0].formula_id ?? '',
              }
            : null
        }
        onSubmit={handleSubmit}
        onClose={() => {
          setFormOpen(false);
          setEditingClient(null);
        }}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer le client"
        message={`Voulez-vous vraiment supprimer "${deleteTarget?.nom_complet}" ? Tous ses abonnements seront également supprimés.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}


