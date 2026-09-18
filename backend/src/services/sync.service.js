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
    if (!response.ok) {
      const error = new Error(`ERP respondeu HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

exports.getDelta = async (ultimaData) => {
  if (process.env.ERP_FORWARD_ENABLED === 'true') {
    return request(`${ERP_BASE_URL}/sync/out?ultima_data=${encodeURIComponent(ultimaData)}`);
  }
  return syncRepository.fetchDelta(ultimaData);
};

exports.processIncoming = async (payload) => {
  if (!Array.isArray(payload)) throw new Error('Payload deve ser array');

  let staged = 0;
  let duplicates = 0;

  for (const item of payload) {
    if (!item || !item.tabela || !item.operacao) throw new Error('Payload invalido');
    try {
      await syncRepository.insertStaging(item);
      staged += 1;
    } catch (error) {
      if (error && (error.code === 335544665 || /violation.*UNIQUE|unique.*constraint/i.test(error.message || ''))) {
        duplicates += 1;
        continue;
      }
      throw error;
    }
  }

  if (process.env.ERP_FORWARD_ENABLED !== 'true') {
    return { staged, duplicates, forwarded: false };
  }

  try {
    await request(`${ERP_BASE_URL}/sync/in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { staged, duplicates, forwarded: true };
  } catch (error) {
    console.error('[SYNC][SERVICE][ERP_IN][ERRO]', error.message);
    return { staged, duplicates, forwarded: false, forwardingError: error.message };
  }
};
