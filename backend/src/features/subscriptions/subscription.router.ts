import { Router } from 'express';
import { db } from '../../database/db.js';
import { checkSubscriptionDuplicates } from '../clients/client.router.js';

export const subscriptionRouter = Router();

function calculateDateFin(dateReabonnement: string): string {
  const date = new Date(`${dateReabonnement}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Date de réabonnement invalide.');
  }
  date.setMonth(date.getMonth() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

subscriptionRouter.post('/', (req, res) => {
  try {
    const { clientId, subscriptionData } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID requis.' });
    }
    if (!subscriptionData || !subscriptionData.numero_carte || !subscriptionData.numero_carte.trim()) {
      return res.status(400).json({ error: 'Le numéro de carte est obligatoire.' });
    }
    if (!subscriptionData.date_reabonnement) {
      return res.status(400).json({ error: 'La date de réabonnement est obligatoire.' });
    }

    checkSubscriptionDuplicates(subscriptionData.numero_abonne, subscriptionData.numero_carte);

    const dateFin = calculateDateFin(subscriptionData.date_reabonnement);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO subscriptions (id, client_id, numero_abonne, numero_carte, vad, date_reabonnement, date_fin, formula_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      clientId,
      subscriptionData.numero_abonne?.trim() || null,
      subscriptionData.numero_carte.trim(),
      subscriptionData.vad?.trim() || null,
      subscriptionData.date_reabonnement,
      dateFin,
      subscriptionData.formula_id || null,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    let formula = null;
    if (created.formula_id) {
      const f = db.prepare('SELECT * FROM formulas WHERE id = ?').get(created.formula_id) as any;
      if (f) formula = { ...f, active: Boolean(f.active) };
    }

    res.status(201).json({ ...created, formula });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

subscriptionRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const subscriptionData = req.body;

    if (!subscriptionData || !subscriptionData.numero_carte || !subscriptionData.numero_carte.trim()) {
      return res.status(400).json({ error: 'Le numéro de carte est obligatoire.' });
    }
    if (!subscriptionData.date_reabonnement) {
      return res.status(400).json({ error: 'La date de réabonnement est obligatoire.' });
    }

    checkSubscriptionDuplicates(subscriptionData.numero_abonne, subscriptionData.numero_carte, id);

    const dateFin = calculateDateFin(subscriptionData.date_reabonnement);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE subscriptions
      SET numero_abonne = ?, numero_carte = ?, vad = ?, date_reabonnement = ?, date_fin = ?, formula_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      subscriptionData.numero_abonne?.trim() || null,
      subscriptionData.numero_carte.trim(),
      subscriptionData.vad?.trim() || null,
      subscriptionData.date_reabonnement,
      dateFin,
      subscriptionData.formula_id || null,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    let formula = null;
    if (updated.formula_id) {
      const f = db.prepare('SELECT * FROM formulas WHERE id = ?').get(updated.formula_id) as any;
      if (f) formula = { ...f, active: Boolean(f.active) };
    }

    res.json({ ...updated, formula });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

subscriptionRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
