// Logger com correlacao trace_id (OpenTelemetry + Pino)

const pino = require('pino');
const { context, trace } = require('@opentelemetry/api');

function getTraceId() {
  const span = trace.getSpan(context.active());
  if (!span) return undefined;
  return span.spanContext().traceId;
}

const logger = pino({
  level: 'info',
  mixin() {
    return {
      trace_id: getTraceId(),
    };
  },
});

module.exports = logger;
