const crypto = require('node:crypto');

function requireTenant(req) {
  if (!req?.tenant?.id) {
    const error = new Error('TENANT_CONTEXT_REQUIRED'); error.status = 401; throw error;
  }
  return req.tenant.id;
}
function checksum(content) { return crypto.createHash('sha256').update(String(content)).digest('hex'); }

async function registerDocument(req, input = {}) {
  const tenantId = requireTenant(req);
  const content = String(input.content || '');
  if (!content.trim()) { const e=new Error('DOCUMENT_CONTENT_REQUIRED'); e.status=400; throw e; }
  const externalKey = String(input.external_key || '').trim();
  if (!externalKey || externalKey.length > 200) { const e=new Error('EXTERNAL_KEY_REQUIRED'); e.status=400; throw e; }
  return {
    tenant_id: tenantId, external_key: externalKey, checksum_sha256: checksum(content),
    stage: 'NORMALIZED', next: ['CLASSIFY','CHUNK','ACL','EMBED','INDEX'],
    persisted: false, reason: 'RAG_STORAGE_PROVIDER_NOT_CONNECTED'
  };
}

async function retrieve(req, input = {}) {
  const tenantId = requireTenant(req);
  const query = String(input.query || '').trim();
  if (!query) { const e=new Error('QUERY_REQUIRED'); e.status=400; throw e; }
  const topK = Math.min(Math.max(Number(input.top_k || 8),1),50);
  return { tenant_id: tenantId, query, top_k: topK, results: [], stage:'RETRIEVAL_PROVIDER_NOT_CONNECTED', safe:true };
}
module.exports = { registerDocument, retrieve };
