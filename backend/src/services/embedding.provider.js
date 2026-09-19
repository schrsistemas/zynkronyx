class EmbeddingProvider {
  constructor(name) { this.name = name; }
  async embed() {
    const error = new Error('AI_EMBEDDING_PROVIDER_NOT_IMPLEMENTED');
    error.code = 'AI_EMBEDDING_PROVIDER_NOT_IMPLEMENTED'; error.status = 503; throw error;
  }
}
function createEmbeddingProvider(name) { return name ? new EmbeddingProvider(name) : null; }
module.exports = { EmbeddingProvider, createEmbeddingProvider };
