# Simulator

The web Control Center contains a real-event simulator targeting POST /integration/events. It does not fabricate successful responses.

Keep event_id stable across retries. A duplicate event is accepted idempotently rather than inserted twice.

Example curl contract:

curl -X POST "$ZYNKRONYX_API/integration/events" -H "Content-Type: application/json" -H "x-api-key: $TENANT_API_KEY" -H "Authorization: Bearer $AUTH_TOKEN" -H "x-device-id: simulator-01" -H "x-device-credential: $DEVICE_CREDENTIAL" -H "x-correlation-id: sim-001" --data '{"event_id":"00000000-0000-4000-8000-000000000001","device_id":"simulator-01","device_type":"simulator","protocol_version":1,"operation":"TEST_EVENT","sequence":1,"payload":{"source":"simulator"}}'
