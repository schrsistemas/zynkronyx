function timeoutError(code, message) { const e = new Error(message || code); e.code = code; e.status = 504; return e; }
function providerError(code, message, status = 503) { const e = new Error(message || code); e.code = code; e.status = status; return e; }
async function retryTransient(work, attempts = Number(process.env.AI_RETRY_ATTEMPTS || 2)) { let last; for(let i=0;i<=attempts;i++){ try{return await work();}catch(e){last=e;if(![502,503,504].includes(e.status)||i===attempts)throw e; await new Promise(r=>setTimeout(r,Math.min(1000*Math.pow(2,i),4000))); }} throw last; }
async function withTimeout(work, ms) { const limit = Math.max(100, Number(ms || process.env.AI_PROVIDER_TIMEOUT_MS || 15000)); let timer; try { return await Promise.race([Promise.resolve().then(work), new Promise((_, reject) => { timer = setTimeout(() => reject(timeoutError('AI_PROVIDER_TIMEOUT')), limit); })]); } finally { if (timer) clearTimeout(timer); } }
async function requestJson(url, options = {}, timeoutMs) {
  if (!url) throw providerError('AI_GATEWAY_NOT_CONFIGURED');
  const response = await retryTransient(() => withTimeout(() => fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } }), timeoutMs));
  let body; try { body = await response.json(); } catch { body = null; }
  if (!response.ok) throw providerError('AI_PROVIDER_HTTP_ERROR', 'AI provider returned HTTP ' + response.status, response.status >= 500 ? 503 : 502);
  return body;
}
class AIProvider {
  constructor(name) { this.name = name; }
  async generate(input = {}) {
    const url = process.env.AI_GATEWAY_URL;
    const body = await requestJson(url, { method:'POST', body:JSON.stringify({ model:input.model, input:input.input, retrieval:input.retrieval, tenant_id:input.tenantId, correlation_id:input.correlationId }) });
    if (body == null || body.output == null) throw providerError('AI_PROVIDER_INVALID_RESPONSE');
    return body.output;
  }
}
function createProvider(name) { return name ? new AIProvider(name) : null; }
module.exports = { AIProvider, createProvider, withTimeout, requestJson };
