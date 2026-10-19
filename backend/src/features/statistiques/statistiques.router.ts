import { Router } from 'express';
import { db } from '../../database/db.js';

export const statistiquesRouter = Router();

statistiquesRouter.get('/', (req, res) => {
  try {
    const reabonnements = db.prepare(`
      SELECT * FROM reabonnements
      ORDER BY date_reabonnement ASC, created_at ASC
    `).all() as any[];

    const formulas = db.prepare(`
      SELECT * FROM formulas
      ORDER BY prix ASC
    `).all() as any[];

    const formattedFormulas = formulas.map((f) => ({
      ...f,
      active: Boolean(f.active),
    }));

    res.json({
      reabonnements,
      formulas: formattedFormulas,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
