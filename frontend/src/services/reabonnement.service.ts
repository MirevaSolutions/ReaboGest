import { apiFetch } from '@/lib/api';
import type { ClientWithSubscriptions, Formula } from '@/lib/types';
import { getMvolaBalance, performReabonnement } from '@/lib/mvola';

/**
 * Récupère tous les clients avec leurs abonnements.
 */
export async function getClientsWithSubscriptions(): Promise<ClientWithSubscriptions[]> {
  return apiFetch<ClientWithSubscriptions[]>('/clients');
}

/**
 * Récupère les formules actives.
 */
export async function getActiveFormulas(): Promise<Formula[]> {
  return apiFetch<Formula[]>('/formulas/active');
}

/**
 * Récupère le solde MVola actuel.
 */
export async function getCurrentMvolaBalance(): Promise<number> {
  return getMvolaBalance();
}

/**
 * Effectue le réabonnement d'un client.
 */
export async function reabonnerClient(params: {
  subscriptionId: string;
  formulaId: string;
  dateReabonnement: string;
  dateFin: string;
}) {
  const result = await performReabonnement({
    subscriptionId: params.subscriptionId,
    formulaId: params.formulaId,
    dateReabonnement: params.dateReabonnement,
    dateFin: params.dateFin,
    montant: 0, // le backend calculera le montant exact depuis la formule
  });

  if (!result.success) {
    throw new Error(result.error ?? 'Erreur lors du réabonnement.');
  }

  return result;
}