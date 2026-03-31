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

module.exports = { query, execute };
