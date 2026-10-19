-- =====================================================
-- SaaS multi-boutiques : distributeurs Canal+
-- Cible : PostgreSQL 13+
-- =====================================================

BEGIN;

-- ---------- SAAS (côté propriétaire du logiciel) ----------

CREATE TABLE plan_saas (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom               VARCHAR(100)  NOT NULL UNIQUE,
  prix_mensuel      NUMERIC(12,2) NOT NULL CHECK (prix_mensuel >= 0),
  max_utilisateurs  INT,
  max_clients       INT
);

CREATE TABLE boutique (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom               VARCHAR(150) NOT NULL,
  adresse           VARCHAR(255),
  telephone         VARCHAR(30),
  actif             BOOLEAN      NOT NULL DEFAULT TRUE,
  date_inscription  DATE         NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE abonnement_boutique (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique         BIGINT NOT NULL REFERENCES boutique(id),
  id_plan             BIGINT NOT NULL REFERENCES plan_saas(id),
  date_debut          DATE   NOT NULL,
  date_fin            DATE   NOT NULL,
  statut              VARCHAR(20) NOT NULL DEFAULT 'ESSAI'
                      CHECK (statut IN ('ESSAI','ACTIF','SUSPENDU')),
  reference_paiement  VARCHAR(100),
  CHECK (date_fin >= date_debut)
);

-- ---------- UTILISATEURS ----------

CREATE TABLE users (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique         BIGINT REFERENCES boutique(id),   -- NULL pour SUPER_ADMIN
  nom                 VARCHAR(100) NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  mot_de_passe_hash   VARCHAR(255) NOT NULL,
  role                VARCHAR(20)  NOT NULL
                      CHECK (role IN ('SUPER_ADMIN','PROPRIETAIRE','GERANT','VENDEUR')),
  actif               BOOLEAN      NOT NULL DEFAULT TRUE,
  derniere_connexion  TIMESTAMPTZ
);

CREATE TABLE journal_audit (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique  BIGINT NOT NULL REFERENCES boutique(id),
  id_user      BIGINT NOT NULL REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,
  entite       VARCHAR(100),
  date_action  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- CLIENTS ET FORMULES ----------

CREATE TABLE client (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique   BIGINT NOT NULL REFERENCES boutique(id),
  nom_complete  VARCHAR(150) NOT NULL,
  telephone     VARCHAR(30),
  adresse       VARCHAR(255),
  dette_totale  NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE formule (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique  BIGINT NOT NULL REFERENCES boutique(id),
  nom          VARCHAR(100)  NOT NULL,
  prix         NUMERIC(12,2) NOT NULL CHECK (prix >= 0),
  duree_mois   INT           NOT NULL CHECK (duree_mois > 0),
  actif        BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ---------- PAIEMENTS ET ABONNEMENTS ----------

CREATE TABLE paiement (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique    BIGINT NOT NULL REFERENCES boutique(id),
  id_client      BIGINT REFERENCES client(id),
  id_user        BIGINT NOT NULL REFERENCES users(id),
  date_paiement  DATE          NOT NULL DEFAULT CURRENT_DATE,
  total          NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  montant_paye   NUMERIC(12,2) NOT NULL CHECK (montant_paye >= 0),
  mode           VARCHAR(20)   NOT NULL DEFAULT 'ESPECES'
                 CHECK (mode IN ('ESPECES','MVOLA','ORANGE_MONEY','AIRTEL_MONEY')),
  annule         BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE TABLE abonnement (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique   BIGINT NOT NULL REFERENCES boutique(id),
  id_client     BIGINT NOT NULL REFERENCES client(id),
  id_formule    BIGINT NOT NULL REFERENCES formule(id),
  id_paiement   BIGINT NOT NULL REFERENCES paiement(id),
  numero_carte  VARCHAR(50),
  date_debut    DATE NOT NULL,
  date_fin      DATE NOT NULL,
  statut        VARCHAR(20) NOT NULL DEFAULT 'ACTIF'
                CHECK (statut IN ('ACTIF','EXPIRE','SUSPENDU')),
  CHECK (date_fin >= date_debut)
);

CREATE TABLE notification (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_abonnement  BIGINT NOT NULL REFERENCES abonnement(id),
  canal          VARCHAR(20) NOT NULL CHECK (canal IN ('SMS','WHATSAPP','EMAIL')),
  message        VARCHAR(500),
  date_envoi     TIMESTAMPTZ,
  envoye         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE prestation (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paiement    BIGINT NOT NULL REFERENCES paiement(id),
  libelle        VARCHAR(150)  NOT NULL,
  prix_unitaire  NUMERIC(12,2) NOT NULL CHECK (prix_unitaire >= 0),
  quantite       INT           NOT NULL CHECK (quantite > 0),
  date_creation  DATE          NOT NULL DEFAULT CURRENT_DATE
);

-- ---------- STOCK ----------

CREATE TABLE produit (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique     BIGINT NOT NULL REFERENCES boutique(id),
  nom             VARCHAR(150) NOT NULL,
  description     VARCHAR(255),
  type            VARCHAR(50),
  prix_achat      NUMERIC(12,2) CHECK (prix_achat >= 0),
  prix_vente      NUMERIC(12,2) CHECK (prix_vente >= 0),
  quantite_stock  INT NOT NULL DEFAULT 0,
  stock_minimum   INT NOT NULL DEFAULT 0
);

CREATE TABLE achat_produit (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paiement    BIGINT NOT NULL REFERENCES paiement(id),
  id_produit     BIGINT NOT NULL REFERENCES produit(id),
  quantite       INT           NOT NULL CHECK (quantite > 0),
  prix_unitaire  NUMERIC(12,2) NOT NULL CHECK (prix_unitaire >= 0),
  sous_total     NUMERIC(12,2) NOT NULL CHECK (sous_total >= 0)
);

CREATE TABLE fournisseur (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique  BIGINT NOT NULL REFERENCES boutique(id),
  nom          VARCHAR(150) NOT NULL,
  telephone    VARCHAR(30)
);

CREATE TABLE approvisionnement (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_fournisseur  BIGINT NOT NULL REFERENCES fournisseur(id),
  date_appro      DATE NOT NULL DEFAULT CURRENT_DATE,
  montant_total   NUMERIC(12,2) CHECK (montant_total >= 0)
);

CREATE TABLE mouvement_stock (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_produit            BIGINT NOT NULL REFERENCES produit(id),
  id_approvisionnement  BIGINT REFERENCES approvisionnement(id),
  type                  VARCHAR(20) NOT NULL
                        CHECK (type IN ('ENTREE','SORTIE','AJUSTEMENT')),
  quantite              INT NOT NULL,
  date_mouvement        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- DEPENSES ET CAISSE ----------

CREATE TABLE depense (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique   BIGINT NOT NULL REFERENCES boutique(id),
  id_user       BIGINT NOT NULL REFERENCES users(id),
  libelle       VARCHAR(150)  NOT NULL,
  categorie     VARCHAR(50),
  montant       NUMERIC(12,2) NOT NULL CHECK (montant >= 0),
  description   VARCHAR(255),
  date_depense  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE mouvement_caisse (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_boutique     BIGINT NOT NULL REFERENCES boutique(id),
  id_paiement     BIGINT REFERENCES paiement(id),
  id_depense      BIGINT REFERENCES depense(id),
  type            VARCHAR(10)   NOT NULL CHECK (type IN ('ENTREE','SORTIE')),
  montant         NUMERIC(12,2) NOT NULL CHECK (montant >= 0),
  description     VARCHAR(255),
  date_mouvement  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- INDEX (performances multi-boutiques) ----------

CREATE INDEX idx_users_boutique         ON users(id_boutique);
CREATE INDEX idx_client_boutique        ON client(id_boutique);
CREATE INDEX idx_formule_boutique       ON formule(id_boutique);
CREATE INDEX idx_paiement_boutique_date ON paiement(id_boutique, date_paiement);
CREATE INDEX idx_abonnement_boutique    ON abonnement(id_boutique);
CREATE INDEX idx_abonnement_client      ON abonnement(id_client);
CREATE INDEX idx_abonnement_fin         ON abonnement(date_fin);   -- rappels d'expiration
CREATE INDEX idx_produit_boutique       ON produit(id_boutique);
CREATE INDEX idx_depense_boutique_date  ON depense(id_boutique, date_depense);
CREATE INDEX idx_caisse_boutique_date   ON mouvement_caisse(id_boutique, date_mouvement);
CREATE INDEX idx_audit_boutique_date    ON journal_audit(id_boutique, date_action);

-- ---------- VUE : solde de caisse calculé par boutique ----------

CREATE VIEW v_solde_caisse AS
SELECT id_boutique,
       SUM(CASE WHEN type = 'ENTREE' THEN montant ELSE -montant END) AS solde
FROM mouvement_caisse
GROUP BY id_boutique;

COMMIT;
