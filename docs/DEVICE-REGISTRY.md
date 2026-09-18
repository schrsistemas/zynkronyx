# Device Registry

Tenant-scoped registry for integration devices.

Credentials are generated server-side and only the SHA-256 hash is persisted. The plaintext credential is returned only during registration.

Operations:
- POST /integration/devices
- GET /integration/devices
- POST /integration/devices/:deviceId/revoke

Revocation changes the device status to inactive.

Production hardening still requires role-based authorization for registry mutation endpoints and credential rotation/expiry enforcement.


## Credential lifecycle

Credentials expire according to DEVICE_CREDENTIAL_DAYS (default 365, bounded to 1–3650 days). Registration and rotation return the plaintext credential once. The database stores only its SHA-256 hash, expiry timestamp, version, and non-secret scopes. Supported scopes are events:write and sync:read.

Rotation: POST /integration/devices/:deviceId/rotate
