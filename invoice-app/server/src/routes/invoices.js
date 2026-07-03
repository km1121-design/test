'use strict';

const express = require('express');
const { pool } = require('../db');

const router = express.Router();

async function loadInvoice(id) {
  const { rows } = await pool.query(
    `SELECT invoices.*, companies.name AS company_name, clients.name AS client_name
     FROM invoices
     LEFT JOIN companies ON companies.id = invoices.company_id
     LEFT JOIN clients ON clients.id = invoices.client_id
     WHERE invoices.id = $1`,
    [id]
  );
  const invoice = rows[0];
  if (!invoice) return null;
  const { rows: items } = await pool.query(
    'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order, id',
    [id]
  );
  invoice.items = items;
  return invoice;
}

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT invoices.*, companies.name AS company_name, clients.name AS client_name,
              (SELECT COALESCE(SUM(quantity * unit_price * (1 + tax_rate::NUMERIC / 100)), 0)
               FROM invoice_items WHERE invoice_id = invoices.id) AS total_amount
       FROM invoices
       LEFT JOIN companies ON companies.id = invoices.company_id
       LEFT JOIN clients ON clients.id = invoices.client_id
       ORDER BY invoices.issue_date DESC NULLS LAST, invoices.id DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await loadInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'not_found' });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

const HEADER_FIELDS = [
  'invoice_no',
  'company_id',
  'client_id',
  'issue_date',
  'due_date',
  'period_start',
  'period_end',
  'subject',
  'bank_info',
  'notes',
];

async function replaceItems(client, invoiceId, items) {
  await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
  for (const [index, item] of items.entries()) {
    await client.query(
      `INSERT INTO invoice_items (invoice_id, case_id, description, quantity, unit, unit_price, tax_rate, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        invoiceId,
        item.case_id ?? null,
        item.description ?? '',
        item.quantity ?? 0,
        item.unit ?? '',
        item.unit_price ?? 0,
        item.tax_rate ?? '10',
        index,
      ]
    );
  }
}

router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const values = HEADER_FIELDS.map((f) => req.body[f] ?? null);
    const placeholders = HEADER_FIELDS.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await client.query(
      `INSERT INTO invoices (${HEADER_FIELDS.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    const invoiceId = rows[0].id;
    await replaceItems(client, invoiceId, Array.isArray(req.body.items) ? req.body.items : []);
    await client.query('COMMIT');
    res.status(201).json(await loadInvoice(invoiceId));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existingRows } = await client.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found' });
    }
    const values = HEADER_FIELDS.map((f) => req.body[f] ?? existing[f]);
    const assignments = HEADER_FIELDS.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await client.query(
      `UPDATE invoices SET ${assignments}, updated_at = now() WHERE id = $${HEADER_FIELDS.length + 1}`,
      [...values, req.params.id]
    );
    if (Array.isArray(req.body.items)) {
      await replaceItems(client, req.params.id, req.body.items);
    }
    await client.query('COMMIT');
    res.json(await loadInvoice(req.params.id));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Aggregate shifts for a client within a period into draft invoice line items,
// one line per case: quantity = total shift days, amount = quantity * case unit price.
// Preview only — nothing is persisted here. The client merges these items into the
// invoice it is editing, and an explicit save (POST/PUT above) persists it.
router.post('/generate', async (req, res, next) => {
  try {
    const { client_id, period_start, period_end } = req.body;
    if (!client_id || !period_start || !period_end) {
      return res.status(400).json({ error: 'client_id, period_start and period_end are required' });
    }

    const { rows: clientRows } = await pool.query('SELECT * FROM clients WHERE id = $1', [client_id]);
    if (!clientRows[0]) return res.status(400).json({ error: 'unknown client_id' });

    const { rows: grouped } = await pool.query(
      `SELECT shifts.case_id, cases.name AS case_name, cases.unit_price, cases.unit_label, cases.tax_rate,
              SUM(shifts.quantity) AS total_qty
       FROM shifts
       JOIN cases ON cases.id = shifts.case_id
       WHERE cases.client_id = $1 AND shifts.work_date BETWEEN $2 AND $3
       GROUP BY shifts.case_id, cases.name, cases.unit_price, cases.unit_label, cases.tax_rate
       ORDER BY cases.name`,
      [client_id, period_start, period_end]
    );

    const items = grouped.map((g) => ({
      case_id: g.case_id,
      description: g.case_name,
      quantity: Number(g.total_qty),
      unit: g.unit_label,
      unit_price: Number(g.unit_price),
      tax_rate: g.tax_rate,
    }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
