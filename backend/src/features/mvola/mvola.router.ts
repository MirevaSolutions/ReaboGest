import { Router } from 'express';
import { db } from '../../database/db.js';
import { getMvolaCurrentBalance } from '../clients/client.router.js';

export const mvolaRouter = Router();

mvolaRouter.get('/balance', (req, res) => {
  try {
    const solde = getMvolaCurrentBalance();
    res.json({ solde });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

mvolaRouter.get('/transactions', (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT * FROM mvola_transactions
      ORDER BY created_at DESC, id DESC
    `).all() as any[];
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

mvolaRouter.post('/depot', (req, res) => {
  try {
    const { montant, dateTransaction, description } = req.body;
    const montantNum = Number(montant);

    if (!Number.isFinite(montantNum) || montantNum <= 0) {
      return res.status(400).json({ error: 'Le montant doit être supérieur à 0.' });
    }
    if (!dateTransaction) {
      return res.status(400).json({ error: 'La date du dépôt est obligatoire.' });
    }

    const soldeAvant = getMvolaCurrentBalance();
    const soldeApres = soldeAvant + montantNum;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO mvola_transactions (id, type, montant, solde_avant, solde_apres, date_transaction, description, reabonnement_id, created_at)
      VALUES (?, 'DEPOT', ?, ?, ?, ?, ?, NULL, ?)
    `).run(
      id,
      montantNum,
      soldeAvant,
      soldeApres,
      dateTransaction,
      description && description.trim() ? description.trim() : null,
      now
    );

    res.json({ success: true, soldeApres });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
