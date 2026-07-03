'use strict';

const createCrudRouter = require('../lib/crudRouter');

module.exports = createCrudRouter({
  table: 'companies',
  fields: ['name', 'postal_code', 'address', 'phone', 'email', 'registration_no', 'bank_info', 'notes'],
});
