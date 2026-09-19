const crypto = require('node:crypto');
const repository = require('./rag.repository');
const { chunkText } = require('./rag.chunker');
const { createEmbeddingProvider } = require('./embedding.provider');
const { createVectorStore } = require('./vector.store');

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
function aclAllows(row, tenantId) { try { const acl=typeof row.acl_json==='string'?JSON.parse(row.acl_json||'{}'):(row.acl_json||{}); if(!acl || acl.mode==='tenant') return true; if(Array.isArray(acl.tenants)) return acl.tenants.map(String).includes(String(tenantId)); return false; } catch { return false; } }
function rerank(results,query,topK) { const terms=[...new Set(String(query).toUpperCase().split(/[^A-Z0-9À-ÿ]+/).filter(t=>t.length>=3))]; return results.map(r=>({...r,score:Number(r.score||0)+terms.reduce((n,t)=>n+(String(r.content||'').toUpperCase().includes(t)?0.15:0),0)})).sort((a,b)=>b.score-a.score).slice(0,topK); }
function assembleContext(results,maxTokens=3000) { let used=0; const sources=[]; for(const r of results){const tokens=Math.max(1,Number(r.token_count||String(r.content||'').split(/\s+/).filter(Boolean).length*1.3));if(used+tokens>maxTokens)break;used+=tokens;sources.push({chunk_id:r.chunk_id,document_id:r.document_id,title:r.title,content:r.content});} return {text:sources.map((s,i)=>'[SOURCE '+(i+1)+'] '+s.content).join('\n\n'),sources,estimated_tokens:Math.ceil(used)}; }
async function retrieve(req, input = {}) {
  const tenantId = requireTenant(req);
  const query = String(input.query || '').trim();
  if (!query) { const e = new Error('QUERY_REQUIRED'); e.status = 400; throw e; }
  const topK = Math.min(Math.max(Number(input.top_k || 8), 1), 50);
  let results=[]; let stage='LEXICAL_FALLBACK'; const ep=createEmbeddingProvider(process.env.AI_EMBEDDING_PROVIDER); const vs=createVectorStore(process.env.AI_VECTOR_STORE); if(ep&&vs){try{const embedded=await ep.embed({input:query,model:process.env.AI_EMBEDDING_MODEL||null,tenantId});results=await vs.search({vector:embedded.vector,topK,tenantId,filters:{status:'ACTIVE'}});stage='VECTOR';}catch(error){stage='VECTOR_FALLBACK';}} if(!results.length)results=await repository.lexicalRetrieve(tenantId,query,topK); results=rerank(results.filter(r=>aclAllows(r,tenantId)),query,topK); const context=assembleContext(results,Number(input.context_max_tokens||3000)); return { tenant_id: tenantId, query, top_k: topK, results, context, stage, safe: true, derived: true };
}
module.exports = { ingest, registerDocument: ingest, preview, retrieve, checksum, rerank, assembleContext };
