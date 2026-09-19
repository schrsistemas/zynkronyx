# Arduino

Recommended topology: Arduino -> Ethernet/Wi-Fi -> HTTPS -> Zynkronyx Gateway.

For constrained deployments: Arduino -> MQTT or serial gateway -> HTTPS -> Zynkronyx Gateway.

Firmware responsibilities: persist a monotonic sequence, generate a unique event_id, send device headers, retry transient failures without changing event_id, and keep credentials outside telemetry payloads.
