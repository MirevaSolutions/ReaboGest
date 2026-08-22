import { supabase, type MvolaTransaction } from '@/lib/supabase';
import { getMvolaBalance, performDepot } from '@/lib/mvola';

export type CreateDepotData = {
  montant: number;
  dateTransaction: string;
  description?: string;
};

export async function getCurrentMvolaBalance(): Promise<number> {
  return getMvolaBalance();
}

export async function getMvolaTransactions(): Promise<MvolaTransaction[]> {
  const { data, error } = await supabase
    .from('mvola_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MvolaTransaction[];
}

export async function getMvolaData() {
  const [solde, transactions] = await Promise.all([
    getCurrentMvolaBalance(),
    getMvolaTransactions(),
  ]);

  return {
    solde,
    transactions,
  };
}

export async function createDepot(data: CreateDepotData) {
  if (!Number.isFinite(data.montant) || data.montant <= 0) {
    throw new Error('Le montant doit être supérieur à 0.');
  }

  if (!data.dateTransaction) {
    throw new Error('La date du dépôt est obligatoire.');
  }

  const result = await performDepot({
    montant: data.montant,
    dateTransaction: data.dateTransaction,
    description: data.description?.trim() || '',
  });

  if (!result.success) {
    throw new Error(
      result.error ?? 'Impossible d’enregistrer le dépôt.'
    );
  }

  return result;
}