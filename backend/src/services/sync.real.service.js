const db = require('./db.firebird.service');

module.exports = {
  async processOut() {
    // exemplo real: buscar registros pendentes
    const rows = await db.query(`
      SELECT * FROM SYNC_LOG
      WHERE OPERACAO = 'P'
    `);

    return rows;
  },

  async processIn(payload) {
    // exemplo real: inserir staging
    await db.execute(`
      INSERT INTO SYNC_STAGING (PAYLOAD, STATUS)
      VALUES (?, 'P')
    `, [JSON.stringify(payload)]);

    return { success: true };
  }
};
