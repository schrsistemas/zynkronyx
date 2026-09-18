const syncRepository = require('../repository/sync.repository');

class SyncHandlerRegistry {
  constructor() {
    this.handlers = new Map();
  }

  register(tabela, operacao, handler) {
    if (!tabela || !operacao || typeof handler !== 'function') {
      throw new TypeError('tabela, operacao e handler sao obrigatorios');
    }
    this.handlers.set(this.key(tabela, operacao), handler);
    return this;
  }

  resolve(tabela, operacao) {
    return this.handlers.get(this.key(tabela, operacao)) || null;
  }

  key(tabela, operacao) {
    return `${String(tabela).trim().toUpperCase()}:${String(operacao).trim().toUpperCase()}`;
  }
}

module.exports = new SyncHandlerRegistry();
