'use strict';

const express = require('express');
const { pool } = require('../db');

const FIELDS = ['client_id', 'name', 'unit_price', 'unit_label', 'tax_rate', 'notes', 'active'];

const router = express.Router();

const LIST_SQL = `
  SELECT cases.*, clients.name AS client_name
  FROM cases
  JOIN clients ON clients.id = cases.client_id
  ORDER BY cases.active DESC, clients.name, cases.name
`;

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(LIST_SQL);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT cases.*, clients.name AS client_name
       FROM cases JOIN clients ON clients.id = cases.client_id
       WHERE cases.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = { active: 1, tax_rate: '10', unit_label: '日', ...req.body };
    const values = FIELDS.map((f) => body[f] ?? null);
    const placeholders = FIELDS.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO cases (${FIELDS.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { rows: existingRows } = await pool.query('SELECT * FROM cases WHERE id = $1', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'not_found' });
    const values = FIELDS.map((f) => req.body[f] ?? existing[f]);
    const assignments = FIELDS.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE cases SET ${assignments} WHERE id = $${FIELDS.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM cases WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
