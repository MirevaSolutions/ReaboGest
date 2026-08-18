import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

export type Client = {
  id: string;
  nom_complet: string;
  telephone: string | null;
  created_at: string;
  updated_at: string;
};

export type Formula = {
  id: string;
  nom: string;
  prix: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  client_id: string;
  numero_abonne: string | null;
  numero_carte: string | null;
  vad: string | null;
  date_reabonnement: string | null;
  date_fin: string | null;
  formula_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionWithFormula = Subscription & {
  formula: Formula | null;
};

export type ClientWithSubscriptions = Client & {
  subscriptions: SubscriptionWithFormula[];
};

export type Reabonnement = {
  id: string;
  subscription_id: string;
  formula_id: string | null;
  date_reabonnement: string;
  montant: number;
  created_at: string;
};

export type ReabonnementWithFormula = Reabonnement & {
  formula: Formula | null;
};

export type MvolaTransactionType = 'DEPOT' | 'REABONNEMENT';

export type MvolaTransaction = {
  id: string;
  type: MvolaTransactionType;
  montant: number;
  solde_avant: number;
  solde_apres: number;
  date_transaction: string;
  description: string | null;
  reabonnement_id: string | null;
  created_at: string;
};
