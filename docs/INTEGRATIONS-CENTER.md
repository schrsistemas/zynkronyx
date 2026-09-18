# Integration Center

The Control Center exposes an Integrations & Simulator screen for the real device integration contract.

## Supported profiles

- Arduino
- Raspberry Pi
- PIC
- Android
- iOS
- Delphi
- Simulator

## Simulator

The simulator sends a real POST /integration/events request. It supplies device ID and credential, device type, operation, sequence, event ID, optional correlation ID, optional coordinates and arbitrary JSON payload. The UI reports the actual HTTP response and does not fabricate successful events.

## Security

Device credentials are sent only as request headers. The device must already exist in the tenant registry and have the events:write scope.

## Provenance

Location is optional and is persisted only when valid coordinates are reported by the device. The Control Center does not infer a location.

## Protocol boundary

PIC integrations should use UART/RS-485/CAN through a gateway. Arduino and Raspberry Pi may use HTTPS or MQTT through a gateway. Mobile and Delphi clients use HTTPS/JSON. The simulator uses HTTP/HTTPS directly against the integration API.

## Deployment

The screen is part of the static Next.js Control Center and is published by the Cloudflare Pages deployment workflow after merge to main.
