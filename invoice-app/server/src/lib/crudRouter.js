'use strict';

const express = require('express');
const { pool } = require('../db');

/**
 * Minimal CRUD router for a single table with no joins.
 * `fields` lists the writable columns (id/created_at are managed separately).
 */
function createCrudRouter({ table, fields, orderBy = 'id' }) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'not_found' });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const values = fields.map((f) => req.body[f] ?? null);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const { rows: existingRows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      const existing = existingRows[0];
      if (!existing) return res.status(404).json({ error: 'not_found' });
      const values = fields.map((f) => req.body[f] ?? existing[f]);
      const assignments = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `UPDATE ${table} SET ${assignments} WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, req.params.id]
      );
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'not_found' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createCrudRouter;
