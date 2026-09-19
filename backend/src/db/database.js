const firebird = require('./firebird.connection');

const adapters = { firebird };

function driverName() {
  return String(process.env.DB_DRIVER || process.env.DB_DIALECT || 'firebird').trim().toLowerCase();
}

function getAdapter() {
  const name = driverName();
  const adapter = adapters[name];
  if (!adapter) {
    const error = new Error('DATABASE_DRIVER_UNSUPPORTED: ' + name);
    error.code = 'DATABASE_DRIVER_UNSUPPORTED';
    error.status = 500;
    throw error;
  }
  return adapter;
}

async function nextId(resource) { return getAdapter().nextId(resource); }

async function health() {
  const adapter = getAdapter();
  if (typeof adapter.health === 'function') return adapter.health();
  await adapter.query('SELECT 1 AS OK');
  return true;
}

module.exports = {
  driverName,
  getAdapter,
  nextId,
  health,
  query: (...args) => getAdapter().query(...args),
  execute: (...args) => getAdapter().execute(...args),
  withTransaction: (...args) => getAdapter().withTransaction(...args)
};
