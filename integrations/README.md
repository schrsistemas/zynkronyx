# Zynkronyx device integrations

Protocol boundary for Arduino, Raspberry Pi, PIC and Simulator.

All profiles converge on POST /integration/events with x-api-key, Authorization when required, x-device-id, x-device-credential and recommended x-correlation-id.

Event body fields: event_id, device_id, device_type, protocol_version, operation, sequence, payload, optional timestamp and location.

The server authenticates the registered device, enforces events:write, validates profile/version, writes legal event and staging atomically, and treats event_id as the idempotency key.

Transport-specific firmware stays thin: UART/RS-485/CAN or MQTT gateways translate into this contract rather than duplicating business logic.
