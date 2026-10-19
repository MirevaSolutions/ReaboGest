import { Router } from 'express';
import { db } from '../../database/db.js';

export const formulaRouter = Router();

formulaRouter.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM formulas ORDER BY prix ASC').all() as any[];
    const formulas = rows.map((r) => ({
      ...r,
      active: Boolean(r.active),
    }));
    res.json(formulas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

formulaRouter.get('/active', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM formulas WHERE active = 1 ORDER BY prix ASC').all() as any[];
    const formulas = rows.map((r) => ({
      ...r,
      active: true,
    }));
    res.json(formulas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

formulaRouter.post('/', (req, res) => {
  try {
    const { nom, prix } = req.body;
    if (!nom || typeof nom !== 'string') {
      return res.status(400).json({ error: 'Le nom de la formule est obligatoire.' });
    }
    const prixNum = Number(prix);
    if (!Number.isFinite(prixNum) || prixNum < 0) {
      return res.status(400).json({ error: 'Le prix de la formule est invalide.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO formulas (id, nom, prix, active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(id, nom.trim(), prixNum, now, now);

    const created = db.prepare('SELECT * FROM formulas WHERE id = ?').get(id) as any;
    res.status(201).json({ ...created, active: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

formulaRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prix } = req.body;

    const existing = db.prepare('SELECT * FROM formulas WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Formule introuvable.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE formulas
      SET nom = ?, prix = ?, updated_at = ?
      WHERE id = ?
    `).run(nom.trim(), Number(prix), now, id);

    const updated = db.prepare('SELECT * FROM formulas WHERE id = ?').get(id) as any;
    res.json({ ...updated, active: Boolean(updated.active) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

formulaRouter.patch('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const existing = db.prepare('SELECT * FROM formulas WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Formule introuvable.' });
    }

    const now = new Date().toISOString();
    const activeInt = active ? 1 : 0;
    db.prepare(`
      UPDATE formulas
      SET active = ?, updated_at = ?
      WHERE id = ?
    `).run(activeInt, now, id);

    const updated = db.prepare('SELECT * FROM formulas WHERE id = ?').get(id) as any;
    res.json({ ...updated, active: Boolean(updated.active) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

formulaRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM formulas WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
