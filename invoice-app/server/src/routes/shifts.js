'use strict';

const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const LIST_SQL_BASE = `
  SELECT shifts.*, cases.name AS case_name, cases.unit_price, cases.unit_label,
         clients.id AS client_id, clients.name AS client_name
  FROM shifts
  JOIN cases ON cases.id = shifts.case_id
  JOIN clients ON clients.id = cases.client_id
`;

router.get('/', async (req, res, next) => {
  try {
    const clauses = [];
    const params = [];
    if (req.query.case_id) {
      params.push(req.query.case_id);
      clauses.push(`shifts.case_id = $${params.length}`);
    }
    if (req.query.client_id) {
      params.push(req.query.client_id);
      clauses.push(`clients.id = $${params.length}`);
    }
    if (req.query.from) {
      params.push(req.query.from);
      clauses.push(`shifts.work_date >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      clauses.push(`shifts.work_date <= $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `${LIST_SQL_BASE} ${where} ORDER BY shifts.work_date DESC, cases.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

async function upsertShift({ case_id, work_date, quantity, note }) {
  await pool.query(
    `INSERT INTO shifts (case_id, work_date, quantity, note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (case_id, work_date) DO UPDATE SET quantity = excluded.quantity, note = excluded.note`,
    [case_id, work_date, quantity ?? 1, note ?? null]
  );
  const { rows } = await pool.query('SELECT * FROM shifts WHERE case_id = $1 AND work_date = $2', [
    case_id,
    work_date,
  ]);
  return rows[0];
}

router.post('/', async (req, res, next) => {
  try {
    const { case_id, work_date, quantity, note } = req.body;
    if (!case_id || !work_date) {
      return res.status(400).json({ error: 'case_id and work_date are required' });
    }
    const { rows } = await pool.query('SELECT id FROM cases WHERE id = $1', [case_id]);
    if (!rows[0]) return res.status(400).json({ error: 'unknown case_id' });
    res.status(201).json(await upsertShift({ case_id, work_date, quantity, note }));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { rows: existingRows } = await pool.query('SELECT * FROM shifts WHERE id = $1', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'not_found' });
    const quantity = req.body.quantity ?? existing.quantity;
    const note = req.body.note ?? existing.note;
    const { rows } = await pool.query(
      'UPDATE shifts SET quantity = $1, note = $2 WHERE id = $3 RETURNING *',
      [quantity, note, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM shifts WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Bulk import, used by both the manual "add multiple days" UI and CSV import.
// Each entry resolves its case by case_id, or by case name (optionally scoped by client name).
router.post('/bulk', async (req, res, next) => {
  try {
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    const results = { inserted: 0, updated: 0, errors: [] };

    for (const [index, entry] of entries.entries()) {
      const rowNo = index + 1;
      const workDate = entry.work_date || entry.date;
      if (!workDate || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
        results.errors.push({ row: rowNo, message: `日付の形式が不正です: ${workDate}` });
        continue;
      }
      let caseId = entry.case_id || null;
      if (!caseId) {
        const caseName = entry.case_name || entry.case;
        const clientName = entry.client_name || entry.client || null;
        const { rows } = await pool.query(
          `SELECT cases.id FROM cases
           JOIN clients ON clients.id = cases.client_id
           WHERE cases.name = $1 AND ($2::text IS NULL OR clients.name = $2)`,
          [caseName, clientName]
        );
        if (!rows[0]) {
          results.errors.push({ row: rowNo, message: `案件が見つかりません: ${caseName}` });
          continue;
        }
        caseId = rows[0].id;
      }
      const { rows: beforeRows } = await pool.query(
        'SELECT id FROM shifts WHERE case_id = $1 AND work_date = $2',
        [caseId, workDate]
      );
      await upsertShift({ case_id: caseId, work_date: workDate, quantity: entry.quantity, note: entry.note });
      if (beforeRows[0]) results.updated += 1;
      else results.inserted += 1;
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
