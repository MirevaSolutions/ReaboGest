import { supabase, type Formula } from '@/lib/supabase';

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

export async function createFormula(
  nom: string,
  prix: number
): Promise<Formula> {
  const { data, error } = await supabase
    .from('formulas')
    .insert({
      nom: nom.trim(),
      prix,
      active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('La formule n’a pas pu être créée.');
  }

  return data as Formula;
}

export async function updateFormula(
  formulaId: string,
  nom: string,
  prix: number
): Promise<Formula> {
  const { data, error } = await supabase
    .from('formulas')
    .update({
      nom: nom.trim(),
      prix,
      updated_at: new Date().toISOString(),
    })
    .eq('id', formulaId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('La formule n’a pas pu être modifiée.');
  }

  return data as Formula;
}

export async function toggleFormulaActive(
  formulaId: string,
  active: boolean
): Promise<Formula> {
  const { data, error } = await supabase
    .from('formulas')
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', formulaId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      'Le statut de la formule n’a pas pu être modifié.'
    );
  }

  return data as Formula;
}

export async function deleteFormula(
  formulaId: string
): Promise<void> {
  const { error } = await supabase
    .from('formulas')
    .delete()
    .eq('id', formulaId);

  if (error) {
    throw new Error(error.message);
  }
}