const config = {
  enabled: () => String(process.env.AI_ENABLED || '').toLowerCase() === 'true',
  ragEnabled: () => String(process.env.RAG_ENABLED || '').toLowerCase() === 'true',
  provider: () => process.env.AI_PROVIDER || null,
  model: () => process.env.AI_MODEL || null,
  embeddingModel: () => process.env.AI_EMBEDDING_MODEL || null,
  topK: () => Math.min(Math.max(Number(process.env.RAG_TOP_K || 8), 1), 50)
};

function status() {
  return {
    enabled: config.enabled(),
    provider: config.provider(),
    model: config.model(),
    rag: {
      enabled: config.ragEnabled(),
      embeddingModel: config.embeddingModel(),
      topK: config.topK()
    }
  };
}

async function query() {
  const error = new Error('AI_PIPELINE_NOT_CONFIGURED');
  error.status = 503;
  throw error;
}

module.exports = { config, status, query };
