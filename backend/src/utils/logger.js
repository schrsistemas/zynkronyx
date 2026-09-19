const pino = require('pino');
const base = pino({ level: process.env.LOG_LEVEL || 'info' });
function child(context = {}) { const safe = {}; for (const key of ['requestId','correlationId','tenantId','deviceId','eventId','traceId']) if (context[key] != null) safe[key] = String(context[key]).slice(0,128); return base.child(safe); }
base.childContext = child;
module.exports = base;
