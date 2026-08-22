import { supabase, type Reabonnement, type Formula } from '@/lib/supabase';

export async function getReabonnements(): Promise<Reabonnement[]> {
  const { data, error } = await supabase
    .from('reabonnements')
    .select('*')
    .order('date_reabonnement', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Reabonnement[];
}

export async function getFormulas(): Promise<Formula[]> {
  const { data, error } = await supabase
    .from('formulas')
    .select('*')
    .order('prix', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Formula[];
}

export async function getStatistiquesData() {
  const [reabonnements, formulas] = await Promise.all([
    getReabonnements(),
    getFormulas(),
  ]);

  return {
    reabonnements,
    formulas,
  };
}