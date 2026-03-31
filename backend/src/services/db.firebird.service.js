// MOCK Firebird integration layer (placeholder for real connection)

class FirebirdService {
  async query(sql, params = []) {
    console.log('[DB QUERY]', sql, params);
    return [];
  }

  async execute(sql, params = []) {
    console.log('[DB EXECUTE]', sql, params);
    return { success: true };
  }
}

module.exports = new FirebirdService();
