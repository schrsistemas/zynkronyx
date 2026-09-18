// Firebird service backed by the real node-firebird connection layer.
// Keeping this adapter small makes the processor testable and avoids a
// production code path that silently succeeds without touching the database.

const connection = require('../db/firebird.connection');

class FirebirdService {
  async query(sql, params = []) {
    return connection.query(sql, params);
  }

  async execute(sql, params = []) {
    return connection.execute(sql, params);
  }

  async withTransaction(work) {
    return connection.withTransaction(work);
  }

  async transaction(work) {
    return connection.transaction(work);
  }
}

module.exports = new FirebirdService();
