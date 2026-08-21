import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';

import {
  supabase,
  type ClientWithSubscriptions,
  type Formula,
} from '@/lib/supabase';

import ClientForm, {
  type ClientFormData,
  type SubscriptionFormData,
} from '@/components/ClientForm';

import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBadge from '@/components/StatusBadge';

type Props = {
  onViewClient?: (clientId: string) => void;
};

export default function ClientsPage({ onViewClient }: Props) {
  const [clients, setClients] = useState<ClientWithSubscriptions[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);

  const [editingClient, setEditingClient] =
    useState<ClientWithSubscriptions | null>(null);

  const [deleteClient, setDeleteClient] =
    useState<ClientWithSubscriptions | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadClients = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        subscriptions(
          *,
          formula:formulas(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setError('Impossible de charger les clients.');
      setClients([]);
    } else {
      setClients((data ?? []) as ClientWithSubscriptions[]);
    }

    setLoading(false);
  };

  const loadFormulas = async () => {
    const { data, error } = await supabase
      .from('formulas')
      .select('*')
      .eq('active', true)
      .order('prix', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setFormulas((data ?? []) as Formula[]);
  };

  useEffect(() => {
    loadClients();
    loadFormulas();
  }, []);

  const filteredClients = clients.filter((client) => {
    const value = search.toLowerCase().trim();

    if (!value) return true;

    return (
      client.nom_complet?.toLowerCase().includes(value) ||
      client.telephone?.toLowerCase().includes(value)
    );
  });

  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (
    client: ClientWithSubscriptions
  ) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleSubmit = async (
    clientData: ClientFormData,
    subscriptionData: SubscriptionFormData
  ) => {
    /*
     * IMPORTANT :
     *
     * Cette fonction représente l'inscription complète.
     *
     * Elle devra ensuite être déplacée dans un service :
     *
     * clientService.createClientWithSubscription(...)
     *
     * afin de gérer dans une seule opération :
     *
     * 1. création du client
     * 2. création de l'abonnement
     * 3. augmentation de la recette
     * 4. diminution du solde MVola
     */

    if (!subscriptionData.formula_id) {
      throw new Error(
        'Veuillez sélectionner une formule.'
      );
    }

    const selectedFormula = formulas.find(
      (formula) =>
        formula.id === subscriptionData.formula_id
    );

    if (!selectedFormula) {
      throw new Error(
        'La formule sélectionnée est introuvable.'
      );
    }

    /*
     * Modification d'un client existant
     */
    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update({
          nom_complet: clientData.nom_complet,
          telephone: clientData.telephone,
        })
        .eq('id', editingClient.id);

      if (error) {
        throw new Error(error.message);
      }

      setFormOpen(false);
      setEditingClient(null);

      await loadClients();

      return;
    }

    /*
     * Nouvelle inscription
     *
     * Pour le moment, on prépare les données.
     *
     * L'opération financière devra être branchée
     * avec ton mécanisme actuel de recette / MVola.
     */

    const { data: newClient, error: clientError } =
      await supabase
        .from('clients')
        .insert({
          nom_complet: clientData.nom_complet,
          telephone: clientData.telephone,
        })
        .select()
        .single();

    if (clientError) {
      throw new Error(clientError.message);
    }

    if (!newClient) {
      throw new Error(
        'Le client n’a pas pu être créé.'
      );
    }

    /*
     * Création du premier abonnement
     */
    const { error: subscriptionError } =
      await supabase
        .from('subscriptions')
        .insert({
          client_id: newClient.id,
          numero_abonne:
            subscriptionData.numero_abonne || null,
          numero_carte:
            subscriptionData.numero_carte || null,
          vad: subscriptionData.vad || null,
          date_reabonnement:
            subscriptionData.date_reabonnement || null,
          date_fin:
            subscriptionData.date_fin || null,
          formula_id: subscriptionData.formula_id,
        });

    if (subscriptionError) {
      /*
       * Si l'abonnement échoue, on supprime
       * le client qui vient d'être créé.
       */
      await supabase
        .from('clients')
        .delete()
        .eq('id', newClient.id);

      throw new Error(subscriptionError.message);
    }

    /*
     * TODO :
     *
     * Ici devra être exécutée l'opération financière :
     *
     * recette += selectedFormula.prix
     *
     * solde MVola -= selectedFormula.prix
     *
     * Cela sera déplacé dans le service métier
     * afin que toute l'inscription soit atomique.
     */

    console.log(
      'Nouvelle inscription :',
      selectedFormula.prix
    );

    setFormOpen(false);
    setEditingClient(null);

    await loadClients();
  };

  const handleDelete = async () => {
    if (!deleteClient) return;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', deleteClient.id);

    if (error) {
      setError(error.message);
      return;
    }

    setDeleteClient(null);

    await loadClients();
  };

  const getCurrentSubscription = (
    client: ClientWithSubscriptions
  ) => {
    if (
      !client.subscriptions ||
      client.subscriptions.length === 0
    ) {
      return null;
    }

    return [...client.subscriptions].sort((a, b) => {
      const dateA = a.date_fin
        ? new Date(a.date_fin).getTime()
        : 0;

      const dateB = b.date_fin
        ? new Date(b.date_fin).getTime()
        : 0;

      return dateB - dateA;
    })[0];
  };

  return (
    <div>
      {/* En-tête */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Clients
          </h1>

          <p className="mt-0.5 text-sm text-slate-500">
            Gestion des clients et de leurs abonnements.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Ajouter un client
        </button>
      </div>

      {/* Recherche */}
      <div className="mb-4 border border-slate-200 bg-white p-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-slate-900"
          />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-hidden border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                  Client
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                  Téléphone
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                  Formule
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                  Date de fin
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                  Statut
                </th>

                <th className="w-28 px-4 py-3 text-right text-xs font-semibold text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Chargement…
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Aucun client trouvé.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const subscription =
                    getCurrentSubscription(client);

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {client.nom_complet}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {client.telephone || '—'}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {subscription?.formula?.nom || '—'}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {subscription?.date_fin || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {subscription ? (
                          <StatusBadge
                            dateFin={subscription.date_fin}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">
                            Aucun abonnement
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {onViewClient && (
                            <button
                              type="button"
                              onClick={() =>
                                onViewClient(client.id)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Voir"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenEdit(client)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteClient(client)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredClients.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            {filteredClients.length} client
            {filteredClients.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Formulaire */}
      <ClientForm
        open={formOpen}
        initialClient={
          editingClient
            ? {
                nom_complet: editingClient.nom_complet,
                telephone: editingClient.telephone ?? '',
              }
            : null
        }
        initialSubscription={
          editingClient
            ? (() => {
                const subscription =
                  getCurrentSubscription(editingClient);

                return subscription
                  ? {
                      numero_abonne:
                        subscription.numero_abonne ?? '',
                      numero_carte:
                        subscription.numero_carte ?? '',
                      vad: subscription.vad ?? '',
                      date_reabonnement:
                        subscription.date_reabonnement ?? '',
                      date_fin:
                        subscription.date_fin ?? '',
                      formula_id:
                        subscription.formula_id ?? '',
                    }
                  : null;
              })()
            : null
        }
        onSubmit={handleSubmit}
        onClose={() => {
          setFormOpen(false);
          setEditingClient(null);
        }}
      />

      {/* Confirmation suppression */}
      <ConfirmDialog
        open={Boolean(deleteClient)}
        title="Supprimer le client"
        message={
          deleteClient
            ? `Voulez-vous vraiment supprimer ${deleteClient.nom_complet} ?`
            : ''
        }
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteClient(null)}
      />
    </div>
  );
}