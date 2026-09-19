const database = require('../db/database');

class SqlDatabaseService {
  query(sql, params = []) { return database.query(sql, params); }
  execute(sql, params = []) { return database.execute(sql, params); }
  withTransaction(work) { return database.withTransaction(work); }
  health() { return database.health(); }
  driverName() { return database.driverName(); }
}

module.exports = new SqlDatabaseService();
