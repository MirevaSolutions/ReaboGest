import { useCallback, useEffect, useState } from 'react';
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Users as UsersIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import type {
  ClientWithSubscriptions,
  Formula,
} from '@/lib/supabase';

import {
  getClients,
  getActiveFormulas,
  updateClient,
  updateSubscription,
  createSubscriptionForClient,
  registerClient,
  deleteClient,
} from '@/services/client.service';

import {
  formatDate,
  getStatus,
  statusLabels,
  type SubscriptionStatus,
} from '@/lib/status';

import { todayLocal, addOneMonth } from '@/lib/date';

import type { Column } from '@/lib/export';

import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import ClientForm, {
  type ClientFormData,
  type SubscriptionFormData,
} from '@/components/ClientForm';
import ExportMenu from '@/components/ExportMenu';

type StatusFilter = 'tous' | SubscriptionStatus;

const filterLabels: {
  key: StatusFilter;
  label: string;
}[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  {
    key: 'expire_aujourd_hui',
    label: "Expire aujourd'hui",
  },
  {
    key: 'expire_demain',
    label: 'Expire demain',
  },
  {
    key: 'expire',
    label: 'Expirés',
  },
];

type Props = {
  onOpenClient: (clientId: string) => void;
};

function getLatestDateFin(
  client: ClientWithSubscriptions
): string | null {
  if (
    !client.subscriptions ||
    client.subscriptions.length === 0
  ) {
    return null;
  }

  const dates = client.subscriptions
    .map((subscription) => subscription.date_fin)
    .filter(
      (date): date is string => Boolean(date)
    )
    .sort();

  return dates[dates.length - 1] ?? null;
}

const exportColumns: Column<ClientWithSubscriptions>[] = [
  {
    header: 'Nom complet',
    accessor: (client) => client.nom_complet,
  },
  {
    header: 'Téléphone',
    accessor: (client) =>
      client.telephone ?? '',
  },
  {
    header: 'N° abonné',
    accessor: (client) =>
      client.subscriptions?.[0]
        ?.numero_abonne ?? '',
  },
  {
    header: 'N° carte',
    accessor: (client) =>
      client.subscriptions?.[0]
        ?.numero_carte ?? '',
  },
  {
    header: 'Formule',
    accessor: (client) =>
      client.subscriptions?.[0]
        ?.formula?.nom ?? '',
  },
  {
    header: 'Date de fin',
    accessor: (client) =>
      formatDate(
        getLatestDateFin(client)
      ),
  },
  {
    header: 'Statut',
    accessor: (client) =>
      statusLabels[
        getStatus(
          getLatestDateFin(client)
        )
      ],
  },
];

export default function ClientsPage({
  onOpenClient,
}: Props) {
  const [clients, setClients] = useState<
    ClientWithSubscriptions[]
  >([]);

  const [formulas, setFormulas] = useState<
    Formula[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('tous');

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingClient, setEditingClient] =
    useState<ClientWithSubscriptions | null>(
      null
    );

  const [newSubscriptionDefaults, setNewSubscriptionDefaults] =
    useState<SubscriptionFormData | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<ClientWithSubscriptions | null>(
      null
    );

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  const fetchClients = useCallback(
    async () => {
      setLoading(true);

      try {
        const data = await getClients();

        setClients(
          data as ClientWithSubscriptions[]
        );
      } catch (error) {
        console.error(
          'Erreur chargement clients:',
          error
        );

        setToast({
          type: 'error',
          msg:
            error instanceof Error
              ? error.message
              : 'Erreur lors du chargement des clients.',
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchFormulas =
    useCallback(async () => {
      try {
        const data =
          await getActiveFormulas();

        setFormulas(data);
      } catch (error) {
        console.error(
          'Erreur chargement formules:',
          error
        );

        setToast({
          type: 'error',
          msg:
            error instanceof Error
              ? error.message
              : 'Erreur lors du chargement des formules.',
        });
      }
    }, []);

  useEffect(() => {
    fetchClients();
    fetchFormulas();
  }, [fetchClients, fetchFormulas]);

  const filtered = clients.filter(
    (client) => {
      const query = search
        .toLowerCase()
        .trim();

      const subscription =
        client.subscriptions?.[0];

      const latestDateFin =
        getLatestDateFin(client);

      if (statusFilter !== 'tous') {
        if (
          getStatus(latestDateFin) !==
          statusFilter
        ) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const dateFormatted =
        latestDateFin
          ? formatDate(
              latestDateFin
            ).toLowerCase()
          : '';

      const dateRaw =
        latestDateFin?.toLowerCase() ?? '';

      return (
        client.nom_complet
          .toLowerCase()
          .includes(query) ||
        (
          client.telephone ?? ''
        )
          .toLowerCase()
          .includes(query) ||
        (
          subscription?.numero_abonne ?? ''
        )
          .toLowerCase()
          .includes(query) ||
        (
          subscription?.numero_carte ?? ''
        )
          .toLowerCase()
          .includes(query) ||
        dateFormatted.includes(query) ||
        dateRaw.includes(query)
      );
    }
  );

  const handleAdd = () => {
    const dateDebut = todayLocal();

    setEditingClient(null);

    setNewSubscriptionDefaults({
      numero_abonne: '',
      numero_carte: '',
      vad: '',
      date_reabonnement: dateDebut,
      date_fin: addOneMonth(dateDebut),
      formula_id: '',
    });

    setFormOpen(true);
  };

  const handleEdit = (
    client: ClientWithSubscriptions
  ) => {
    setEditingClient(client);
    setNewSubscriptionDefaults(null);
    setFormOpen(true);
  };

  const handleSubmit = async (
    clientData: ClientFormData,
    subData: SubscriptionFormData
  ) => {
    try {
      if (editingClient) {
        await updateClient(
          editingClient.id,
          {
            nom_complet:
              clientData.nom_complet,
            telephone:
              clientData.telephone,
          }
        );

        const existingSubscription =
          editingClient.subscriptions?.[0];

        if (existingSubscription) {
          await updateSubscription(
            existingSubscription.id,
            subData
          );
        } else {
          await createSubscriptionForClient(
            editingClient.id,
            subData
          );
        }

        setFormOpen(false);
        setEditingClient(null);
        setNewSubscriptionDefaults(null);

        await fetchClients();

        setToast({
          type: 'success',
          msg: 'Client modifié avec succès.',
        });

        return;
      }

      await registerClient(
        clientData,
        subData,
        formulas
      );

      setFormOpen(false);
      setEditingClient(null);
      setNewSubscriptionDefaults(null);

      await fetchClients();

      setToast({
        type: 'success',
        msg:
          'Client ajouté avec succès. Abonnement enregistré.',
      });
    } catch (error) {
      console.error(
        'Erreur enregistrement client:',
        error
      );

      setToast({
        type: 'error',
        msg:
          error instanceof Error
            ? error.message
            : 'Une erreur est survenue.',
      });

      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteClient(
        deleteTarget.id
      );

      setDeleteTarget(null);

      await fetchClients();

      setToast({
        type: 'success',
        msg: 'Client supprimé avec succès.',
      });
    } catch (error) {
      console.error(
        'Erreur suppression:',
        error
      );

      setToast({
        type: 'error',
        msg:
          error instanceof Error
            ? error.message
            : 'Erreur lors de la suppression.',
      });
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Clients
          </h1>

          <p className="text-xs text-slate-500 mt-0.5">
            {clients.length} client
            {clients.length > 1
              ? 's'
              : ''}{' '}
            enregistré
            {clients.length > 1
              ? 's'
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu
            filename="clients"
            title="Liste des clients"
            columns={exportColumns}
            rows={filtered}
          />

          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter un client
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}

          <span>{toast.msg}</span>
        </div>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Rechercher par nom, téléphone, numéro abonné ou date…"
          className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-300 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {filterLabels.map(
          (filter) => {
            const active =
              statusFilter ===
              filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    filter.key
                  )
                }
                className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            );
          }
        )}
      </div>

      <div className="hidden md:block bg-white rounded-md border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Nom complet
              </th>

              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Téléphone
              </th>

              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                N° abonné
              </th>

              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                N° carte
              </th>

              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Date de fin
              </th>

              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Statut
              </th>

              <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-sm text-slate-400"
                >
                  Chargement…
                </td>
              </tr>
            )}

            {!loading &&
              filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center"
                  >
                    <UsersIcon className="h-5 w-5 text-slate-300 mx-auto mb-2" />

                    <p className="text-sm text-slate-400">
                      Aucun client trouvé.
                    </p>
                  </td>
                </tr>
              )}

            {filtered.map((client) => {
              const subscription =
                client.subscriptions?.[0];

              const latestDateFin =
                getLatestDateFin(client);

              return (
                <tr
                  key={client.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-3 py-2.5 text-sm font-medium text-slate-900">
                    {client.nom_complet}
                  </td>

                  <td className="px-3 py-2.5 text-sm text-slate-600">
                    {client.telephone ||
                      '—'}
                  </td>

                  <td className="px-3 py-2.5 text-sm text-slate-600">
                    {subscription?.numero_abonne ||
                      '—'}
                  </td>

                  <td className="px-3 py-2.5 text-sm text-slate-600">
                    {subscription?.numero_carte ||
                      '—'}
                  </td>

                  <td className="px-3 py-2.5 text-sm text-slate-600">
                    {formatDate(
                      latestDateFin
                    )}
                  </td>

                  <td className="px-3 py-2.5">
                    <StatusBadge
                      dateFin={
                        latestDateFin
                      }
                    />
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenClient(
                            client.id
                          )
                        }
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Voir le détail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(
                            client
                          )
                        }
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(
                            client
                          )
                        }
                        className="p-1.5 rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
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

      <div className="md:hidden space-y-2">
        {loading && (
          <p className="text-center text-sm text-slate-400 py-8">
            Chargement…
          </p>
        )}

        {!loading &&
          filtered.length === 0 && (
            <div className="text-center py-10">
              <UsersIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />

              <p className="text-sm text-slate-400">
                Aucun client trouvé.
              </p>
            </div>
          )}

        {filtered.map((client) => {
          const subscription =
            client.subscriptions?.[0];

          const latestDateFin =
            getLatestDateFin(client);

          return (
            <div
              key={client.id}
              className="bg-white rounded-md border border-slate-200 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">
                    {client.nom_complet}
                  </p>

                  <p className="text-xs text-slate-500 mt-0.5">
                    {client.telephone ||
                      '—'}
                  </p>
                </div>

                <StatusBadge
                  dateFin={latestDateFin}
                />
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">
                    N° abonné
                  </p>

                  <p className="text-slate-700">
                    {subscription?.numero_abonne ||
                      '—'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">
                    N° carte
                  </p>

                  <p className="text-slate-700">
                    {subscription?.numero_carte ||
                      '—'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">
                    Date de fin
                  </p>

                  <p className="text-slate-700">
                    {formatDate(
                      latestDateFin
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">
                    Formule
                  </p>

                  <p className="text-slate-700">
                    {subscription?.formula
                      ?.nom || '—'}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex gap-2 pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    onOpenClient(
                      client.id
                    )
                  }
                  className="flex-1 py-1.5 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Détails
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleEdit(client)
                  }
                  className="py-1.5 px-3 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(
                      client
                    )
                  }
                  className="py-1.5 px-3 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ClientForm
        open={formOpen}
        formulas={formulas}
        initialClient={
          editingClient
            ? {
                nom_complet:
                  editingClient.nom_complet,
                telephone:
                  editingClient.telephone ??
                  '',
              }
            : null
        }
        initialSubscription={
          editingClient?.subscriptions?.[0]
            ? {
                numero_abonne:
                  editingClient
                    .subscriptions[0]
                    .numero_abonne ??
                  '',

                numero_carte:
                  editingClient
                    .subscriptions[0]
                    .numero_carte ??
                  '',

                vad:
                  editingClient
                    .subscriptions[0]
                    .vad ?? '',

                date_reabonnement:
                  editingClient
                    .subscriptions[0]
                    .date_reabonnement ??
                  '',

                date_fin:
                  editingClient
                    .subscriptions[0]
                    .date_fin ?? '',

                formula_id:
                  editingClient
                    .subscriptions[0]
                    .formula_id ?? '',
              }
            : newSubscriptionDefaults
        }
        onSubmit={handleSubmit}
        onClose={() => {
          setFormOpen(false);
          setEditingClient(null);
          setNewSubscriptionDefaults(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Supprimer le client"
        message={`Voulez-vous vraiment supprimer "${deleteTarget?.nom_complet}" ? Tous ses abonnements seront également supprimés.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() =>
          setDeleteTarget(null)
        }
      />
    </div>
  );
}