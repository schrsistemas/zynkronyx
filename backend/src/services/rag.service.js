const crypto = require('node:crypto');
const repository = require('./rag.repository');
const { chunkText } = require('./rag.chunker');

function requireTenant(req) {
  if (!req?.tenant?.id) { const error = new Error('TENANT_CONTEXT_REQUIRED'); error.status = 401; throw error; }
  return req.tenant.id;
}
function checksum(content) { return crypto.createHash('sha256').update(String(content)).digest('hex'); }
function jsonText(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'string') { try { JSON.parse(value); return value; } catch { const e = new Error('INVALID_JSON'); e.status = 400; throw e; } }
  try { return JSON.stringify(value); } catch { const e = new Error('INVALID_JSON'); e.status = 400; throw e; }
}
async function ingest(req, input = {}) {
  const tenantId = requireTenant(req);
  const content = String(input.content || '');
  if (!content.trim()) { const e = new Error('DOCUMENT_CONTENT_REQUIRED'); e.status = 400; throw e; }
  const externalKey = String(input.external_key || '').trim();
  if (!externalKey || externalKey.length > 200) { const e = new Error('EXTERNAL_KEY_REQUIRED'); e.status = 400; throw e; }
  const sourceType = String(input.source_type || 'ERP').trim().slice(0, 40) || 'ERP';
  const title = input.title == null ? null : String(input.title).trim().slice(0, 250);
  const classification = String(input.classification || 'INTERNAL').trim().toUpperCase().slice(0, 30) || 'INTERNAL';
  const idempotencyKey = String(input.idempotency_key || req.headers['idempotency-key'] || '').trim();
  if (!idempotencyKey || idempotencyKey.length > 150) { const e = new Error('IDEMPOTENCY_KEY_REQUIRED'); e.status = 400; throw e; }
  const metadataJson = jsonText(input.metadata, '{}');
  const aclJson = jsonText(input.acl, '{"mode":"tenant"}');
  const chunks = chunkText(content, { maxChars: input.chunk_max_chars, overlap: input.chunk_overlap });
  return repository.createIngestion({ tenantId, sourceType, externalKey, title, checksum: checksum(content), classification, aclJson, metadataJson, correlationId: req.correlationId, idempotencyKey, chunks });
}
async function preview(input = {}) { const content=String(input.content||''); if(!content.trim()){const e=new Error('DOCUMENT_CONTENT_REQUIRED');e.status=400;throw e;} return {content_length:content.length,checksum:checksum(content),chunks:chunkText(content,{maxChars:input.chunk_max_chars,overlap:input.chunk_overlap})}; }
async function retrieve(req, input = {}) {
  const tenantId = requireTenant(req);
  const query = String(input.query || '').trim();
  if (!query) { const e = new Error('QUERY_REQUIRED'); e.status = 400; throw e; }
  const topK = Math.min(Math.max(Number(input.top_k || 8), 1), 50);
  const results=await repository.lexicalRetrieve(tenantId,query,topK); return { tenant_id: tenantId, query, top_k: topK, results, stage: 'LEXICAL_FALLBACK', safe: true, derived: true };
}
module.exports = { ingest, registerDocument: ingest, preview, retrieve, checksum };
