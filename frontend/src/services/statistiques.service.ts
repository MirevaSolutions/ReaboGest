import { apiFetch } from '@/lib/api';
import type { Reabonnement, Formula } from '@/lib/types';

export async function getReabonnements(): Promise<Reabonnement[]> {
  return apiFetch<Reabonnement[]>('/reabonnements');
}

export async function getFormulas(): Promise<Formula[]> {
  return apiFetch<Formula[]>('/formulas');
}

export async function getStatistiquesData(): Promise<{
  reabonnements: Reabonnement[];
  formulas: Formula[];
}> {
  return apiFetch<{ reabonnements: Reabonnement[]; formulas: Formula[] }>('/statistiques');
}