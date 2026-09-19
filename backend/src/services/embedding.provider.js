const { requestJson } = require('./ai.provider');
class EmbeddingProvider {
  constructor(name) { this.name = name; }
  async embed(input = {}) {
    const body = await requestJson(process.env.AI_EMBEDDING_GATEWAY_URL || process.env.AI_GATEWAY_URL, {
      method:'POST',
      body:JSON.stringify({ operation:'embedding', model:input.model, input:input.input, tenant_id:input.tenantId, document_id:input.documentId, chunk_id:input.chunkId, metadata:input.metadata })
    });
    if (!Array.isArray(body?.vector)) { const e=new Error('AI_EMBEDDING_INVALID_RESPONSE'); e.code=e.message; e.status=502; throw e; }
    return { vector:body.vector, vector_key:body.vector_key || null, model:body.model || input.model || null };
  }
}
function createEmbeddingProvider(name) { return name ? new EmbeddingProvider(name) : null; }
module.exports = { EmbeddingProvider, createEmbeddingProvider };
