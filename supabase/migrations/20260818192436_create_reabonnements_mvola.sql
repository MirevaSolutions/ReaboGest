/*
# Création des tables reabonnements et mvola_transactions

## Description
Deuxième phase du projet Canal+ Manager :
- Suivi de l'historique des réabonnements effectués
- Gestion du solde MVola (dépôts et débits lors des réabonnements)

L'application reste monoposte sans authentification. Les politiques sont
ouvertes à `anon, authenticated` (données partagées), comme les tables
existantes (clients, subscriptions, formulas).

## Tables créées

### reabonnements
Historique de chaque réabonnement effectué. Un réabonnement n remplace
jamais l'ancien — chaque opération est conservée.

- id (uuid, PK)
- subscription_id (uuid, NOT NULL, FK → subscriptions.id ON DELETE CASCADE)
- formula_id (uuid, FK → formulas.id ON DELETE SET NULL)
- date_reabonnement (date, NOT NULL)
- montant (integer, NOT NULL) — montant payé en Ariary
- created_at (timestamptz, DEFAULT now())

### mvola_transactions
Mouvements du compte MVola unique. Deux types :
- DEPOT : ajoute au solde (solde_apres = solde_avant + montant)
- REABONNEMENT : déduit du solde (solde_apres = solde_avant - montant)

- id (uuid, PK)
- type (text, NOT NULL, CHECK type IN ('DEPOT', 'REABONNEMENT'))
- montant (integer, NOT NULL) — toujours positif
- solde_avant (integer, NOT NULL)
- solde_apres (integer, NOT NULL)
- date_transaction (date, NOT NULL)
- description (text)
- reabonnement_id (uuid, FK → reabonnements.id ON DELETE SET NULL, facultatif)
- created_at (timestamptz, DEFAULT now())

## Sécurité
- RLS activée sur les deux tables.
- 4 politiques par table (SELECT/INSERT/UPDATE/DELETE) ouvertes à anon + authenticated
  car l'application n'a pas d'écran de connexion.

## Index
- idx_reabonnements_subscription_id : recherche par abonnement
- idx_mvola_transactions_created_at : tri par date
*/

CREATE TABLE IF NOT EXISTS reabonnements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  formula_id uuid REFERENCES formulas(id) ON DELETE SET NULL,
  date_reabonnement date NOT NULL,
  montant integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reabonnements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reabonnements" ON reabonnements;
CREATE POLICY "anon_select_reabonnements" ON reabonnements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reabonnements" ON reabonnements;
CREATE POLICY "anon_insert_reabonnements" ON reabonnements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_reabonnements" ON reabonnements;
CREATE POLICY "anon_update_reabonnements" ON reabonnements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_reabonnements" ON reabonnements;
CREATE POLICY "anon_delete_reabonnements" ON reabonnements FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_reabonnements_subscription_id ON reabonnements(subscription_id);

CREATE TABLE IF NOT EXISTS mvola_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('DEPOT', 'REABONNEMENT')),
  montant integer NOT NULL,
  solde_avant integer NOT NULL,
  solde_apres integer NOT NULL,
  date_transaction date NOT NULL,
  description text,
  reabonnement_id uuid REFERENCES reabonnements(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mvola_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mvola_transactions" ON mvola_transactions;
CREATE POLICY "anon_select_mvola_transactions" ON mvola_transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mvola_transactions" ON mvola_transactions;
CREATE POLICY "anon_insert_mvola_transactions" ON mvola_transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mvola_transactions" ON mvola_transactions;
CREATE POLICY "anon_update_mvola_transactions" ON mvola_transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mvola_transactions" ON mvola_transactions;
CREATE POLICY "anon_delete_mvola_transactions" ON mvola_transactions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_mvola_transactions_created_at ON mvola_transactions(created_at DESC);
