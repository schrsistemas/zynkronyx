const crypto = require('node:crypto');

function baseUrl() {
  const value = process.env.REFORMA_TRIBUTARIA_API_URL;
  if (!value) throw Object.assign(new Error('REFORMA_TRIBUTARIA_API_URL_NOT_CONFIGURED'), { status: 503 });
  const url = new URL(value);
  if (url.protocol !== 'https:') throw Object.assign(new Error('REFORMA_TRIBUTARIA_API_MUST_USE_HTTPS'), { status: 503 });
  return url;
}

function token() {
  const value = process.env.REFORMA_TRIBUTARIA_API_TOKEN;
  if (!value || value.length < 32) {
    throw Object.assign(new Error('REFORMA_TRIBUTARIA_API_TOKEN_NOT_CONFIGURED'), { status: 503 });
  }
  return value;
}

async function request(path, { method = 'GET', body, tenantId, correlationId, idempotencyKey } = {}) {
  const url = new URL(path, baseUrl());
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${token()}`,
    'x-correlation-id': correlationId,
    'x-zynkronyx-tenant': String(tenantId),
  };
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
  if (body !== undefined) headers['content-type'] = 'application/json';

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch (_) { payload = { raw: text }; }

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `Fiscal API returned ${response.status}`);
    error.status = response.status >= 500 ? 502 : response.status;
    error.code = payload?.error || 'FISCAL_API_ERROR';
    throw error;
  }
  return payload;
}

async function createSimulation({ tenantId, correlationId, idempotencyKey, command }) {
  return request('/api/v1/simulations', {
    method: 'POST', body: command, tenantId, correlationId, idempotencyKey
  });
}

async function getSimulation({ tenantId, correlationId, simulationId }) {
  return request(`/api/v1/simulations/${encodeURIComponent(simulationId)}`, {
    tenantId, correlationId
  });
}

module.exports = { createSimulation, getSimulation };
