const { requestJson } = require('./ai.provider');
class VectorStore {
  constructor(name) { this.name = name; }
  async upsert(input = {}) {
    const body = await requestJson(process.env.AI_VECTOR_GATEWAY_URL || process.env.AI_GATEWAY_URL, { method:'POST', body:JSON.stringify({ operation:'vector_upsert', id:input.id, vector:input.vector, tenant_id:input.tenantId, document_id:input.documentId, chunk_id:input.chunkId, metadata:input.metadata }) });
    return { vector_key:body?.vector_key || input.id };
  }
  async search(input = {}) {
    const body = await requestJson(process.env.AI_VECTOR_GATEWAY_URL || process.env.AI_GATEWAY_URL, { method:'POST', body:JSON.stringify({ operation:'vector_search', vector:input.vector, top_k:input.topK, tenant_id:input.tenantId, filters:input.filters || {} }) });
    return Array.isArray(body?.results) ? body.results : [];
  }
  async delete(input = {}) {
    const body = await requestJson(process.env.AI_VECTOR_GATEWAY_URL || process.env.AI_GATEWAY_URL, { method:'POST', body:JSON.stringify({ operation:'vector_delete', id:input.id, tenant_id:input.tenantId }) });
    return { deleted:Boolean(body?.deleted ?? true) };
  }
}
function createVectorStore(name) { return name ? new VectorStore(name) : null; }
module.exports = { VectorStore, createVectorStore };
