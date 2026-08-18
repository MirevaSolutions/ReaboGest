/*
# Création des tables clients, subscriptions et formulas

## Description
Application de gestion d'abonnés Canal+ (remplacement du cahier papier).
Application monoposte — pas d'authentification demandée. Les politiques
sont donc ouvertes à `anon, authenticated` (données partagées/publiques).

## Tables créées

### clients
- id (uuid, PK)
- nom_complet (text, NOT NULL)
- telephone (text) — volontairement string, jamais integer
- created_at (timestamptz)
- updated_at (timestamptz)

### formulas
- id (uuid, PK)
- nom (text, NOT NULL)
- prix (integer, NOT NULL) — prix en Ariary
- active (boolean, default true)
- created_at (timestamptz)
- updated_at (timestamptz)

### subscriptions
- id (uuid, PK)
- client_id (uuid, FK → clients.id ON DELETE CASCADE)
- numero_abonne (text) — string, jamais integer
- numero_carte (text) — string, jamais integer
- vad (text, facultatif)
- date_reabonnement (date, facultatif)
- date_fin (date, facultatif)
- formula_id (uuid, FK → formulas.id, facultatif)
- created_at (timestamptz)
- updated_at (timestamptz)

## Sécurité
- RLS activée sur les trois tables.
- 4 politiques par table (SELECT/INSERT/UPDATE/DELETE) ouvertes à anon + authenticated
  car l'application n'a pas d'écran de connexion (monoposte, données partagées).

## Données initiales
- Formule « Chaînes essentielles » → 40 000 Ar
- Formule « Tout Canal+ » → 100 000 Ar
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_complet text NOT NULL,
  telephone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clients" ON clients;
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prix integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_formulas" ON formulas;
CREATE POLICY "anon_select_formulas" ON formulas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_formulas" ON formulas;
CREATE POLICY "anon_insert_formulas" ON formulas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_formulas" ON formulas;
CREATE POLICY "anon_update_formulas" ON formulas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_formulas" ON formulas;
CREATE POLICY "anon_delete_formulas" ON formulas FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  numero_abonne text,
  numero_carte text,
  vad text,
  date_reabonnement date,
  date_fin date,
  formula_id uuid REFERENCES formulas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_subscriptions" ON subscriptions;
CREATE POLICY "anon_select_subscriptions" ON subscriptions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_subscriptions" ON subscriptions;
CREATE POLICY "anon_insert_subscriptions" ON subscriptions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_subscriptions" ON subscriptions;
CREATE POLICY "anon_update_subscriptions" ON subscriptions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_subscriptions" ON subscriptions;
CREATE POLICY "anon_delete_subscriptions" ON subscriptions FOR DELETE
  TO anon, authenticated USING (true);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_date_fin ON subscriptions(date_fin);

-- Formules initiales (uniquement si la table est vide)
INSERT INTO formulas (nom, prix, active)
SELECT 'Chaînes essentielles', 40000, true
WHERE NOT EXISTS (SELECT 1 FROM formulas WHERE nom = 'Chaînes essentielles');

INSERT INTO formulas (nom, prix, active)
SELECT 'Tout Canal+', 100000, true
WHERE NOT EXISTS (SELECT 1 FROM formulas WHERE nom = 'Tout Canal+');
