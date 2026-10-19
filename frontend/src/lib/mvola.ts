import { apiFetch } from './api';

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

export type AbonnementInput = {
  subscriptionId: string;
  formulaId: string;
  dateReabonnement: string;
  montant: number;
};

export type AbonnementResult = {
  success: boolean;
  error?: string;
};

export type DepotInput = {
  montant: number;
  dateTransaction: string;
  description: string;
};

export type DepotResult = {
  success: boolean;
  error?: string;
};

export async function getMvolaBalance(): Promise<number> {
  try {
    const data = await apiFetch<{ solde: number }>('/mvola/balance');
    return data.solde ?? 0;
  } catch (error) {
    console.error('Erreur solde MVola:', error);
    return 0;
  }
}

export async function performReabonnement(input: ReabonnementInput): Promise<ReabonnementResult> {
  try {
    const data = await apiFetch<ReabonnementResult>('/reabonnements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function performAbonnement(input: AbonnementInput): Promise<AbonnementResult> {
  try {
    if (input.montant <= 0) {
      return { success: true };
    }
    // Reabonnement backend handles reabonnements + transactions
    const data = await apiFetch<AbonnementResult>('/reabonnements', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        dateFin: input.dateReabonnement,
      }),
    });
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function performDepot(input: DepotInput): Promise<DepotResult> {
  try {
    const data = await apiFetch<DepotResult>('/mvola/depot', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
