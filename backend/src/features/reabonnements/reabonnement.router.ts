import { Router } from 'express';
import { db } from '../../database/db.js';
import { getMvolaCurrentBalance } from '../clients/client.router.js';

export const reabonnementRouter = Router();

function getTodayLocal(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addOneDay(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

reabonnementRouter.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM reabonnements ORDER BY date_reabonnement ASC, created_at ASC').all() as any[];
    const formulas = db.prepare('SELECT * FROM formulas').all() as any[];
    const fMap = new Map<string, any>();
    for (const f of formulas) {
      fMap.set(f.id, { ...f, active: Boolean(f.active) });
    }

    const result = rows.map((r) => ({
      ...r,
      formula: r.formula_id ? fMap.get(r.formula_id) || null : null,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

reabonnementRouter.post('/', (req, res) => {
  try {
    const { subscriptionId, formulaId, dateReabonnement, dateFin } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Abonnement introuvable.' });
    }
    if (!formulaId) {
      return res.status(400).json({ error: 'Veuillez sélectionner une formule.' });
    }
    if (!dateReabonnement) {
      return res.status(400).json({ error: 'La date de réabonnement est obligatoire.' });
    }
    if (!dateFin) {
      return res.status(400).json({ error: 'La date de fin est obligatoire.' });
    }

    const subscription = db.prepare('SELECT id, date_fin FROM subscriptions WHERE id = ?').get(subscriptionId) as any;
    if (!subscription) {
      return res.status(404).json({ error: 'Abonnement introuvable.' });
    }

    const today = getTodayLocal();
    if (subscription.date_fin) {
      const ancienneDateFin = subscription.date_fin;
      const dateFinTime = new Date(`${ancienneDateFin}T00:00:00`).getTime();
      const todayTime = new Date(`${today}T00:00:00`).getTime();

      if (dateFinTime >= todayTime) {
        const dateMinimum = addOneDay(ancienneDateFin);
        if (dateReabonnement < dateMinimum) {
          return res.status(400).json({
            error: `Cet abonnement est encore actif. Le prochain réabonnement doit commencer à partir du ${dateMinimum}.`
          });
        }
      }
    } else {
      if (dateReabonnement < today) {
        return res.status(400).json({ error: 'La date de réabonnement ne peut pas être dans le passé.' });
      }
    }

    const formulaRow = db.prepare('SELECT * FROM formulas WHERE id = ?').get(formulaId) as any;
    if (!formulaRow) {
      return res.status(400).json({ error: 'La formule sélectionnée est introuvable ou inactive.' });
    }
    const formula = { ...formulaRow, active: Boolean(formulaRow.active) };
    if (!formula.active) {
      return res.status(400).json({ error: 'La formule sélectionnée est introuvable ou inactive.' });
    }
    if (!Number.isFinite(formula.prix) || formula.prix < 0) {
      return res.status(400).json({ error: 'Le prix de la formule est invalide.' });
    }

    const soldeAvant = getMvolaCurrentBalance();
    if (soldeAvant < formula.prix) {
      return res.status(400).json({
        error: `Solde MVola insuffisant. Solde actuel : ${soldeAvant} Ar, montant requis : ${formula.prix} Ar.`
      });
    }

    const soldeApres = soldeAvant - formula.prix;
    const reabonnementId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO reabonnements (id, subscription_id, formula_id, date_reabonnement, montant, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        reabonnementId,
        subscriptionId,
        formula.id,
        dateReabonnement,
        formula.prix,
        now
      );

      db.prepare(`
        UPDATE subscriptions
        SET date_reabonnement = ?, date_fin = ?, formula_id = ?, updated_at = ?
        WHERE id = ?
      `).run(
        dateReabonnement,
        dateFin,
        formula.id,
        now,
        subscriptionId
      );

      db.prepare(`
        INSERT INTO mvola_transactions (id, type, montant, solde_avant, solde_apres, date_transaction, description, reabonnement_id, created_at)
        VALUES (?, 'REABONNEMENT', ?, ?, ?, ?, 'Réabonnement', ?, ?)
      `).run(
        crypto.randomUUID(),
        formula.prix,
        soldeAvant,
        soldeApres,
        dateReabonnement,
        reabonnementId,
        now
      );

      db.exec('COMMIT;');
    } catch (txError) {
      db.exec('ROLLBACK;');
      throw txError;
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
