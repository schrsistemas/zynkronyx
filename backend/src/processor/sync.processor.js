const syncRepository = require('../repository/sync.repository');
const syncHandlers = require('./sync.handler.registry');

class SyncProcessor {
  async process({ limit = 100 } = {}) {
    const rows = await syncRepository.fetchPending(limit);
    let claimed = 0;
    let applied = 0;
    let failed = 0;
    let unsupported = 0;

    for (const row of rows) {
      try {
        await syncRepository.markProcessing(row.ID);
        claimed += 1;

        if (process.env.SYNC_APPLY_ENABLED !== 'true') continue;

        const handler = syncHandlers.resolve(row.TABELA, row.OPERACAO);
        if (!handler) {
          unsupported += 1;
          continue;
        }

        await handler(row);
        await syncRepository.markProcessed(row.ID);
        applied += 1;
      } catch (error) {
        failed += 1;
        await syncRepository.markError(row.ID).catch(() => {});
      }
    }

    return { selected: rows.length, claimed, applied, failed, unsupported };
  }
}

module.exports = new SyncProcessor();
