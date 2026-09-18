const syncRepository = require('../repository/sync.repository');

class SyncProcessor {
  async process({ limit = 100 } = {}) {
    const rows = await syncRepository.fetchPending(limit);
    let claimed = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await syncRepository.markProcessing(row.ID);
        claimed += 1;

        // A table-specific business handler must be registered before an event
        // can be marked successful. Keeping it in P prevents false positives.
        if (process.env.SYNC_APPLY_ENABLED !== 'true') continue;

        // Business application is intentionally feature-gated. The current
        // processor owns queue claiming; ERP-specific handlers come next.
      } catch (error) {
        failed += 1;
        await syncRepository.markError(row.ID).catch(() => {});
      }
    }

    return { selected: rows.length, claimed, failed };
  }
}

module.exports = new SyncProcessor();
