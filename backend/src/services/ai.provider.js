class AIProvider {
  constructor(name) { this.name = name; }
  async generate() {
    const error = new Error('AI_PROVIDER_NOT_IMPLEMENTED');
    error.code = 'AI_PROVIDER_NOT_IMPLEMENTED'; error.status = 503; throw error;
  }
  async embed() {
    const error = new Error('AI_EMBEDDING_PROVIDER_NOT_IMPLEMENTED');
    error.code = 'AI_EMBEDDING_PROVIDER_NOT_IMPLEMENTED'; error.status = 503; throw error;
  }
}
function createProvider(name) { return name ? new AIProvider(name) : null; }
module.exports = { AIProvider, createProvider };
