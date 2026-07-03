'use strict';

const createCrudRouter = require('../lib/crudRouter');

module.exports = createCrudRouter({
  table: 'clients',
  fields: ['name', 'postal_code', 'address', 'contact_name', 'notes'],
});
