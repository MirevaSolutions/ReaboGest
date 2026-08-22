import {
  supabase,
  type ClientWithSubscriptions,
  type Formula,
} from '@/lib/supabase';
import {
  getMvolaBalance,
  performReabonnement,
} from '@/lib/mvola';

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

/**
 * Effectue un réabonnement.
 *
 * Cette opération gère la logique métier du réabonnement :
 * - mise à jour de l'abonnement
 * - enregistrement de l'opération financière
 * - diminution du solde MVola
 * - enregistrement de la recette
 */
export async function reabonnerClient(params: {
  subscriptionId: string;
  formulaId: string;
  dateReabonnement: string;
  dateFin: string;
  montant: number;
}) {
  if (!params.subscriptionId) {
    throw new Error('Abonnement introuvable.');
  }

  if (!params.formulaId) {
    throw new Error('Veuillez sélectionner une formule.');
  }

  if (!params.dateReabonnement) {
    throw new Error('La date de réabonnement est obligatoire.');
  }

  if (!params.dateFin) {
    throw new Error('La date de fin est obligatoire.');
  }

  if (!Number.isFinite(params.montant) || params.montant < 0) {
    throw new Error('Le montant est invalide.');
  }

  return performReabonnement({
    subscriptionId: params.subscriptionId,
    formulaId: params.formulaId,
    dateReabonnement: params.dateReabonnement,
    dateFin: params.dateFin,
    montant: params.montant,
  });
}