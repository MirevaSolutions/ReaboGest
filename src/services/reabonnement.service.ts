import {
  supabase,
  type ClientWithSubscriptions,
  type Formula,
} from '@/lib/supabase';

import {
  getMvolaBalance,
  performReabonnement,
} from '@/lib/mvola';

import {
  todayLocal,
  addOneDay,
} from '@/lib/date';

/**
 * Récupère tous les clients avec leurs abonnements.
 */
export async function getClientsWithSubscriptions(): Promise<
  ClientWithSubscriptions[]
> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, subscriptions(*, formula:formulas(*))')
    .order('nom_complet', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClientWithSubscriptions[];
}

/**
 * Récupère les formules actives.
 */
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

/**
 * Récupère le solde MVola actuel.
 */
export async function getCurrentMvolaBalance(): Promise<number> {
  return getMvolaBalance();
}


export async function reabonnerClient(params: {
  subscriptionId: string;
  formulaId: string;
  dateReabonnement: string;
  dateFin: string;
}) {
  if (!params.subscriptionId) {
    throw new Error('Abonnement introuvable.');
  }

  if (!params.formulaId) {
    throw new Error('Veuillez sélectionner une formule.');
  }

  if (!params.dateReabonnement) {
    throw new Error(
      'La date de réabonnement est obligatoire.'
    );
  }

  if (!params.dateFin) {
    throw new Error(
      'La date de fin est obligatoire.'
    );
  }

  /*
   * recupération de l'abonnement actuel.
   */
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('id, date_fin')
    .eq('id', params.subscriptionId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!subscription) {
    throw new Error('Abonnement introuvable.');
  }

  const today = todayLocal();

  if (subscription.date_fin) {
    const ancienneDateFin = subscription.date_fin;

    const dateFinTime = new Date(
      `${ancienneDateFin}T00:00:00`
    ).getTime();

    const todayTime = new Date(
      `${today}T00:00:00`
    ).getTime();

    if (dateFinTime >= todayTime) {
      const dateMinimum = addOneDay(
        ancienneDateFin
      );

      if (
        params.dateReabonnement < dateMinimum
      ) {
        throw new Error(
          `Cet abonnement est encore actif. Le prochain réabonnement doit commencer à partir du ${dateMinimum}.`
        );
      }
    }
  } else {
    
    if (params.dateReabonnement < today) {
      throw new Error(
        'La date de réabonnement ne peut pas être dans le passé.'
      );
    }
  }

 
  const { data: formula, error: formulaError } =
    await supabase
      .from('formulas')
      .select('*')
      .eq('id', params.formulaId)
      .eq('active', true)
      .single();

  if (formulaError) {
    throw new Error(formulaError.message);
  }

  if (!formula) {
    throw new Error(
      'La formule sélectionnée est introuvable ou inactive.'
    );
  }

  if (!Number.isFinite(formula.prix) || formula.prix < 0) {
    throw new Error(
      'Le prix de la formule est invalide.'
    );
  }

  /*
   * Le montant est TOUJOURS celui de la formule.
   */
  return performReabonnement({
    subscriptionId: params.subscriptionId,
    formulaId: params.formulaId,
    dateReabonnement: params.dateReabonnement,
    dateFin: params.dateFin,
    montant: formula.prix,
  });
}