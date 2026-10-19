import { apiFetch } from '@/lib/api';
import type { Formula } from '@/lib/types';

export async function getFormulas(): Promise<Formula[]> {
  return apiFetch<Formula[]>('/formulas');
}

export async function createFormula(
  nom: string,
  prix: number
): Promise<Formula> {
  return apiFetch<Formula>('/formulas', {
    method: 'POST',
    body: JSON.stringify({ nom, prix }),
  });
}

export async function updateFormula(
  formulaId: string,
  nom: string,
  prix: number
): Promise<Formula> {
  return apiFetch<Formula>(`/formulas/${formulaId}`, {
    method: 'PUT',
    body: JSON.stringify({ nom, prix }),
  });
}

export async function toggleFormulaActive(
  formulaId: string,
  active: boolean
): Promise<Formula> {
  return apiFetch<Formula>(`/formulas/${formulaId}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export async function deleteFormula(
  formulaId: string
): Promise<void> {
  await apiFetch(`/formulas/${formulaId}`, {
    method: 'DELETE',
  });
}