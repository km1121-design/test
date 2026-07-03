'use strict';

const path = require('node:path');
const express = require('express');
const { init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/companies', require('./routes/companies'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/invoices', require('./routes/invoices'));

app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// Basic error handler so a thrown error returns JSON instead of an HTML stack trace.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`invoice-app server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
