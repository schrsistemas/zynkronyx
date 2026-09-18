function normalizeLimit(value) {
  const n = value === undefined ? 100 : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 1000) throw new Error('limit must be between 1 and 1000');
  return n;
}
function parseCursorId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error('cursor must be non-negative');
  return n;
}
function parseSince(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) throw new Error('since must be ISO8601');
  return d.toISOString();
}
function validateIncomingPayload(item) {
  if (!item || typeof item !== 'object' || !item.tabela) throw new Error('tabela is required');
  if (!item.chave) throw new Error('chave is required');
  if (!item.operacao) throw new Error('operacao is required');
  if (item.dados === undefined) throw new Error('dados is required');
  return item;
}
const syncRepository = require('../repository/sync.repository');
const ERP_BASE_URL = process.env.ERP_BASE_URL || 'http://localhost:8080';
const REQUEST_TIMEOUT_MS = Number(process.env.ERP_REQUEST_TIMEOUT_MS || 10000);
async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = text;
    try { data = text ? JSON.parse(text) : null; } catch (_) {}
    if (!response.ok) { const error = new Error(`ERP respondeu HTTP ${response.status}`); error.status=response.status; error.data=data; throw error; }
    return data;
  } finally { clearTimeout(timer); }
}
exports.normalizeLimit=normalizeLimit;
exports.parseCursorId=parseCursorId;
exports.parseSince=parseSince;
exports.validateIncomingPayload=validateIncomingPayload;
exports.getDelta=async ultimaData=>process.env.ERP_FORWARD_ENABLED==='true'
  ? request(`${ERP_BASE_URL}/sync/out?ultima_data=${encodeURIComponent(ultimaData)}`)
  : syncRepository.fetchDelta(ultimaData);
exports.processIncoming=async payload=>{
  if(!Array.isArray(payload)) throw new Error('Payload deve ser array');
  let staged=0,duplicates=0;
  for(const item of payload){
    validateIncomingPayload(item);
    try{await syncRepository.insertStaging(item);staged++;}
    catch(error){if(error&&(error.code===335544665||/violation.*UNIQUE|unique.*constraint/i.test(error.message||''))){duplicates++;continue;}throw error;}
  }
  if(process.env.ERP_FORWARD_ENABLED!=='true') return {staged,duplicates,forwarded:false};
  try{await request(`${ERP_BASE_URL}/sync/in`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});return {staged,duplicates,forwarded:true};}
  catch(error){console.error('[SYNC][SERVICE][ERP_IN][ERRO]',error.message);return {staged,duplicates,forwarded:false,forwardingError:error.message};}
};
