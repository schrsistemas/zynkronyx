// Conexao real Firebird usando node-firebird
// Requer dependencia: node-firebird

const Firebird = require('node-firebird');

const options = {
  host: process.env.DB_HOST || 'firebird',
  port: process.env.DB_PORT || 3050,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER || 'SYSDBA',
  password: process.env.DB_PASSWORD || 'masterkey',
  lowercase_keys: false,
  role: null,
  pageSize: 4096
};

function getConnection() {
  return new Promise((resolve, reject) => {
    Firebird.attach(options, function (err, db) {
      if (err) return reject(err);
      resolve(db);
    });
  });
}

async function query(sql, params = []) {
  const db = await getConnection();
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      db.detach();
      if (err) return reject(err);
      resolve(result);
    });
  });
}

async function withTransaction(work) {
  const db = await getConnection();
  let tx;
  try {
    tx = await new Promise((resolve, reject) => db.transaction(Firebird.ISOLATION_READ_COMMITTED, (err, t) => err ? reject(err) : resolve(t)));
    const result = await work({
      query: (sql, params = []) => new Promise((resolve, reject) => tx.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows))),
      execute: (sql, params = []) => new Promise((resolve, reject) => tx.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows)))
    });
    await new Promise((resolve, reject) => tx.commit(err => err ? reject(err) : resolve()));
    return result;
  } catch (error) {
    if (tx) await new Promise(resolve => tx.rollback(() => resolve()));
    throw error;
  } finally {
    await new Promise(resolve => db.detach(() => resolve()));
  }
}

const dialect = {
  name: 'firebird',
  limit: (sql, n) => sql.replace(/^SELECT /i, 'SELECT FIRST ' + Number(n) + ' '),
  currentTimestamp: 'CURRENT_TIMESTAMP',
  contains: (column, placeholder) => `UPPER(${column}) CONTAINING ${placeholder}`,
  lock: (sql) => sql + ' WITH LOCK'
};

async function nextId(resource) {
  const generators = { AI_DOCUMENT: 'GEN_AI_DOCUMENT_ID', AI_INGESTION_JOB: 'GEN_AI_INGESTION_JOB_ID', AI_DOCUMENT_CHUNK: 'GEN_AI_DOCUMENT_CHUNK_ID', AI_QUERY_AUDIT: 'GEN_AI_QUERY_AUDIT_ID', AI_EVAL_CASE: 'GEN_AI_EVAL_CASE_ID', AI_EVAL_RUN: 'GEN_AI_EVAL_RUN_ID', AI_PROMPT_VERSION: 'GEN_AI_PROMPT_VERSION_ID', AI_PROMPT_RELEASE: 'GEN_AI_PROMPT_RELEASE_ID' };
  const generator = generators[resource];
  if (!generator) { const error = new Error('UNKNOWN_ID_RESOURCE: ' + resource); error.code = 'UNKNOWN_ID_RESOURCE'; throw error; }
  const rows = await query('SELECT GEN_ID(' + generator + ',1) AS ID FROM RDB$DATABASE');
  return Number(rows[0].ID);
}

async function health() { await query('SELECT 1 AS OK FROM RDB$DATABASE'); return true; }

async function execute(sql, params = []) {
  const db = await getConnection();
  return new Promise((resolve, reject) => {
    db.execute(sql, params, (err, result) => {
      db.detach();
      if (err) return reject(err);
      resolve(result);
    });
  });
}

module.exports = { query, execute, withTransaction, health, nextId, dialect };
