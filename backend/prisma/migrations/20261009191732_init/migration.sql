-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "nomComplete" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" SERIAL NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "formule" TEXT NOT NULL,
    "numeroCarte" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "idPaiement" INTEGER NOT NULL,
    "idClient" INTEGER NOT NULL,
    "idSolde" INTEGER NOT NULL,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solde" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "formuleChoisi" TEXT NOT NULL,

    CONSTRAINT "Solde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" SERIAL NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestation" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "prixUnitaire" DECIMAL(12,2) NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantite" INTEGER NOT NULL,
    "idPaiement" INTEGER NOT NULL,

    CONSTRAINT "Prestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prixAchat" DECIMAL(12,2) NOT NULL,
    "prixDeVente" DECIMAL(12,2) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchatProduit" (
    "id" SERIAL NOT NULL,
    "quantite" INTEGER NOT NULL,
    "sousTotal" DECIMAL(12,2) NOT NULL,
    "prixUnitaire" DECIMAL(12,2) NOT NULL,
    "idPaiement" INTEGER NOT NULL,
    "idClient" INTEGER NOT NULL,
    "idProduit" INTEGER NOT NULL,

    CONSTRAINT "AchatProduit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_idPaiement_fkey" FOREIGN KEY ("idPaiement") REFERENCES "Paiement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_idClient_fkey" FOREIGN KEY ("idClient") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_idSolde_fkey" FOREIGN KEY ("idSolde") REFERENCES "Solde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestation" ADD CONSTRAINT "Prestation_idPaiement_fkey" FOREIGN KEY ("idPaiement") REFERENCES "Paiement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchatProduit" ADD CONSTRAINT "AchatProduit_idPaiement_fkey" FOREIGN KEY ("idPaiement") REFERENCES "Paiement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchatProduit" ADD CONSTRAINT "AchatProduit_idClient_fkey" FOREIGN KEY ("idClient") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchatProduit" ADD CONSTRAINT "AchatProduit_idProduit_fkey" FOREIGN KEY ("idProduit") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
