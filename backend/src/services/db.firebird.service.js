const connection = require('../db/firebird.connection');

class SqlDatabaseService {
  constructor(adapter = connection) { this.adapter = adapter; }
  query(sql, params = []) { return this.adapter.query(sql, params); }
  execute(sql, params = []) { return this.adapter.execute(sql, params); }
  withTransaction(work) { return this.adapter.withTransaction(work); }
}
module.exports = new SqlDatabaseService();
