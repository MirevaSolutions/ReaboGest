import { supabase } from './supabase';

export async function getMvolaBalance(): Promise<number> {
  const { data, error } = await supabase
    .from('mvola_transactions')
    .select('solde_apres')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erreur solde MVola:', error);
    return 0;
  }

  return data?.solde_apres ?? 0;
}

export type ReabonnementInput = {
  subscriptionId: string;
  formulaId: string;
  dateReabonnement: string;
  dateFin: string;
  montant: number;
};

export type ReabonnementResult = {
  success: boolean;
  error?: string;
};

export async function performReabonnement(input: ReabonnementInput): Promise<ReabonnementResult> {
  const { subscriptionId, formulaId, dateReabonnement, dateFin, montant } = input;

  if (montant < 0) {
    return { success: false, error: 'Le montant ne peut pas être négatif.' };
  }

  // 1. Récupérer le solde actuel
  const soldeAvant = await getMvolaBalance();

  // 2. Vérifier le solde
  if (soldeAvant < montant) {
    return { success: false, error: 'Solde MVola insuffisant' };
  }

  const soldeApres = soldeAvant - montant;

  // 3. Insérer le réabonnement dans l'historique
  const { data: reabonnement, error: reabErr } = await supabase
    .from('reabonnements')
    .insert({
      subscription_id: subscriptionId,
      formula_id: formulaId || null,
      date_reabonnement: dateReabonnement,
      montant,
    })
    .select()
    .single();

  if (reabErr) {
    return { success: false, error: reabErr.message };
  }

  // 4. Mettre à jour l'abonnement (date de fin + formule + date de réabonnement)
  const { error: subErr } = await supabase
    .from('subscriptions')
    .update({
      date_reabonnement: dateReabonnement,
      date_fin: dateFin,
      formula_id: formulaId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (subErr) {
    return { success: false, error: subErr.message };
  }

  // 5. Enregistrer la transaction MVola
  const { error: mvolaErr } = await supabase.from('mvola_transactions').insert({
    type: 'REABONNEMENT',
    montant,
    solde_avant: soldeAvant,
    solde_apres: soldeApres,
    date_transaction: dateReabonnement,
    description: 'Réabonnement',
    reabonnement_id: reabonnement.id,
  });

  if (mvolaErr) {
    return { success: false, error: mvolaErr.message };
  }

  return { success: true };
}

export type DepotInput = {
  montant: number;
  dateTransaction: string;
  description: string;
};

export type DepotResult = {
  success: boolean;
  error?: string;
};

export async function performDepot(input: DepotInput): Promise<DepotResult> {
  const { montant, dateTransaction, description } = input;

  if (montant <= 0) {
    return { success: false, error: 'Le montant doit être supérieur à 0.' };
  }

  const soldeAvant = await getMvolaBalance();
  const soldeApres = soldeAvant + montant;

  const { error } = await supabase.from('mvola_transactions').insert({
    type: 'DEPOT',
    montant,
    solde_avant: soldeAvant,
    solde_apres: soldeApres,
    date_transaction: dateTransaction,
    description: description.trim() || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
