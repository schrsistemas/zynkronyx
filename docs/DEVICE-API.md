# Device Event API

Endpoint: POST /integration/events

Authentication: current tenant + bearer authentication middleware.

The body may be one event or an array of up to 100 events.

Required fields:
- event_id
- device_id
- device_type
- protocol_version
- operation

Optional:
- timestamp
- sequence
- payload

The server creates an SHA-256 hash, records the technical audit event and stages the payload using the existing idempotency mechanism.

A duplicate event_id is acknowledged without applying the event again.

Use X-Correlation-Id to correlate a batch across gateway, API, processor and audit.
