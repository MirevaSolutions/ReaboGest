import { supabase, type Formula } from '@/lib/supabase';
import {
  getMvolaBalance,
  performAbonnement,
} from '@/lib/mvola';

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

function getTodayLocal(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function calculateDateFin(dateReabonnement: string): string {
  const date = new Date(`${dateReabonnement}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Date de réabonnement invalide.');
  }

  date.setMonth(date.getMonth() + 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

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

async function checkSubscriptionDuplicates(
  subscriptionData: SubscriptionData,
  excludeSubscriptionId?: string
) {
  const numeroAbonne =
    subscriptionData.numero_abonne.trim();

  const numeroCarte =
    subscriptionData.numero_carte.trim();

  if (numeroAbonne) {
    let query = supabase
      .from('subscriptions')
      .select('id, client_id')
      .eq('numero_abonne', numeroAbonne)
      .limit(1);

    if (excludeSubscriptionId) {
      query = query.neq(
        'id',
        excludeSubscriptionId
      );
    }

    const { data, error } =
      await query.maybeSingle();

    if (error) {
      throw new Error(
        'Impossible de vérifier le numéro d’abonné.'
      );
    }

    if (data) {
      throw new Error(
        `Le numéro d’abonné "${numeroAbonne}" est déjà utilisé.`
      );
    }
  }

  if (numeroCarte) {
    let query = supabase
      .from('subscriptions')
      .select('id, client_id')
      .eq('numero_carte', numeroCarte)
      .limit(1);

    if (excludeSubscriptionId) {
      query = query.neq(
        'id',
        excludeSubscriptionId
      );
    }

    const { data, error } =
      await query.maybeSingle();

    if (error) {
      throw new Error(
        'Impossible de vérifier le numéro de carte.'
      );
    }

    if (data) {
      throw new Error(
        `Le numéro de carte "${numeroCarte}" est déjà utilisé.`
      );
    }
  }
}

export async function createClient(
  clientData: CreateClientData
) {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      nom_complet:
        clientData.nom_complet.trim(),
      telephone:
        clientData.telephone.trim() || null,
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
  await checkSubscriptionDuplicates(
    subscriptionData
  );

  if (!subscriptionData.numero_carte.trim()) {
    throw new Error(
      'Le numéro de carte est obligatoire.'
    );
  }

  if (!subscriptionData.date_reabonnement) {
    throw new Error(
      'La date de réabonnement est obligatoire.'
    );
  }

  const dateFin = calculateDateFin(
    subscriptionData.date_reabonnement
  );

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      client_id: clientId,
      numero_abonne:
        subscriptionData.numero_abonne.trim() ||
        null,
      numero_carte:
        subscriptionData.numero_carte.trim(),
      vad:
        subscriptionData.vad.trim() || null,
      date_reabonnement:
        subscriptionData.date_reabonnement,
      date_fin: dateFin,
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
      nom_complet:
        clientData.nom_complet.trim(),
      telephone:
        clientData.telephone.trim() || null,
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
  await checkSubscriptionDuplicates(
    subscriptionData,
    subscriptionId
  );

  if (!subscriptionData.numero_carte.trim()) {
    throw new Error(
      'Le numéro de carte est obligatoire.'
    );
  }

  if (!subscriptionData.date_reabonnement) {
    throw new Error(
      'La date de réabonnement est obligatoire.'
    );
  }

  const dateFin = calculateDateFin(
    subscriptionData.date_reabonnement
  );

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      numero_abonne:
        subscriptionData.numero_abonne.trim() ||
        null,
      numero_carte:
        subscriptionData.numero_carte.trim(),
      vad:
        subscriptionData.vad.trim() || null,
      date_reabonnement:
        subscriptionData.date_reabonnement,
      date_fin: dateFin,
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

  if (!subscriptionData.numero_carte.trim()) {
    throw new Error(
      'Le numéro de carte est obligatoire.'
    );
  }

  if (!subscriptionData.date_reabonnement) {
    throw new Error(
      'La date de réabonnement est obligatoire.'
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

  if (formula.prix <= 0) {
    throw new Error(
      'Le prix de la formule doit être supérieur à 0.'
    );
  }

  await checkSubscriptionDuplicates(
    subscriptionData
  );

  const today = getTodayLocal();
  const dateReabonnement =
    subscriptionData.date_reabonnement;

  if (dateReabonnement > today) {
    throw new Error(
      'La date de réabonnement ne peut pas être dans le futur.'
    );
  }

  const isHistorical =
    dateReabonnement < today;

  const isToday =
    dateReabonnement === today;

  if (isToday) {
    const solde = await getMvolaBalance();

    if (solde < formula.prix) {
      throw new Error(
        `Solde MVola insuffisant. Solde actuel : ${solde} Ar, montant requis : ${formula.prix} Ar.`
      );
    }
  }

  const dateFin = calculateDateFin(
    dateReabonnement
  );

  const subscriptionDataWithDateFin = {
    ...subscriptionData,
    date_fin: dateFin,
  };

  const client = await createClient(
    clientData
  );

  let subscription;

  try {
    subscription =
      await createInitialSubscription(
        client.id,
        subscriptionDataWithDateFin
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

  if (isHistorical) {
    const { error } = await supabase
      .from('reabonnements')
      .insert({
        subscription_id: subscription.id,
        formula_id:
          subscriptionData.formula_id,
        date_reabonnement:
          dateReabonnement,
        montant: formula.prix,
      });

    if (error) {
      try {
        await deleteSubscription(
          subscription.id
        );

        await deleteClient(client.id);
      } catch (rollbackError) {
        console.error(
          'Erreur rollback historique:',
          rollbackError
        );
      }

      throw new Error(error.message);
    }
  }

  if (isToday) {
    const result = await performAbonnement({
      subscriptionId: subscription.id,
      formulaId:
        subscriptionData.formula_id,
      dateReabonnement:
        dateReabonnement,
      montant: formula.prix,
    });

    if (!result.success) {
      try {
        await deleteSubscription(
          subscription.id
        );

        await deleteClient(client.id);
      } catch (rollbackError) {
        console.error(
          'Erreur rollback après échec paiement:',
          rollbackError
        );
      }

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

export async function getClientDetail(
  clientId: string
) {
  const { data, error } = await supabase
    .from('clients')
    .select(
      '*, subscriptions(*, formula:formulas(*))'
    )
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