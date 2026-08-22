import { supabase, type Formula } from '@/lib/supabase';
import { performAbonnement } from '@/lib/mvola';

export type CreateClientData = {
  nom_complet: string;
  telephone: string;
};

export type SubscriptionData = {
  numero_abonne: string;
  numero_carte: string;
  vad: string;
  date_reabonnement: string;
  date_fin: string;
  formula_id: string;
};

export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*, subscriptions(*, formula:formulas(*))')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getActiveFormulas(): Promise<Formula[]> {
  const { data, error } = await supabase
    .from('formulas')
    .select('*')
    .eq('active', true)
    .order('prix', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Formula[];
}

export async function createClient(
  clientData: CreateClientData
) {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      nom_complet: clientData.nom_complet.trim(),
      telephone: clientData.telephone.trim() || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      'Le client n’a pas pu être créé.'
    );
  }

  return data;
}

export async function createInitialSubscription(
  clientId: string,
  subscriptionData: SubscriptionData
) {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      client_id: clientId,
      numero_abonne:
        subscriptionData.numero_abonne.trim() || null,
      numero_carte:
        subscriptionData.numero_carte.trim() || null,
      vad:
        subscriptionData.vad.trim() || null,
      date_reabonnement:
        subscriptionData.date_reabonnement || null,
      date_fin:
        subscriptionData.date_fin || null,
      formula_id:
        subscriptionData.formula_id || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      'L’abonnement n’a pas pu être créé.'
    );
  }

  return data;
}

export async function updateClient(
  clientId: string,
  clientData: CreateClientData
) {
  const { data, error } = await supabase
    .from('clients')
    .update({
      nom_complet: clientData.nom_complet.trim(),
      telephone: clientData.telephone.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateSubscription(
  subscriptionId: string,
  subscriptionData: SubscriptionData
) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      numero_abonne:
        subscriptionData.numero_abonne.trim() || null,
      numero_carte:
        subscriptionData.numero_carte.trim() || null,
      vad:
        subscriptionData.vad.trim() || null,
      date_reabonnement:
        subscriptionData.date_reabonnement || null,
      date_fin:
        subscriptionData.date_fin || null,
      formula_id:
        subscriptionData.formula_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createSubscriptionForClient(
  clientId: string,
  subscriptionData: SubscriptionData
) {
  return createInitialSubscription(
    clientId,
    subscriptionData
  );
}

export async function deleteClient(
  clientId: string
) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSubscription(
  subscriptionId: string
) {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function registerClient(
  clientData: CreateClientData,
  subscriptionData: SubscriptionData,
  formulas: Formula[]
) {
  if (!clientData.nom_complet.trim()) {
    throw new Error(
      'Le nom complet est obligatoire.'
    );
  }

  if (!subscriptionData.formula_id) {
    throw new Error(
      'Veuillez sélectionner une formule.'
    );
  }

  const formula = formulas.find(
    (item) =>
      item.id === subscriptionData.formula_id
  );

  if (!formula) {
    throw new Error(
      'La formule sélectionnée est introuvable.'
    );
  }

  const client = await createClient(
    clientData
  );

  let subscription;

  try {
    subscription =
      await createInitialSubscription(
        client.id,
        subscriptionData
      );
  } catch (error) {
    try {
      await deleteClient(client.id);
    } catch (deleteError) {
      console.error(
        'Erreur suppression client après échec abonnement:',
        deleteError
      );
    }

    throw error;
  }

  /*
   * Lorsqu'un client est inscrit avec une formule
   * et une date de réabonnement, on enregistre
   * également l'opération financière.
   */
  if (
    subscriptionData.formula_id &&
    subscriptionData.date_reabonnement &&
    formula.prix > 0
  ) {
    const result = await performAbonnement({
      subscriptionId: subscription.id,
      formulaId: subscriptionData.formula_id,
      dateReabonnement:
        subscriptionData.date_reabonnement,
      montant: formula.prix,
    });

    if (!result.success) {
      /*
       * L'inscription du client et de l'abonnement
       * a déjà été faite.
       *
       * On remonte l'erreur afin que l'interface
       * puisse prévenir l'utilisateur.
       */
      throw new Error(
        result.error ??
          'Solde MVola insuffisant pour l’abonnement.'
      );
    }
  }

  return {
    client,
    subscription,
    formula,
  };
}
export async function getClientDetail(clientId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*, subscriptions(*, formula:formulas(*))')
    .eq('id', clientId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Client introuvable.');
  }

  return data;
}