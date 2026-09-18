# Device Registry

Tenant-scoped registry for integration devices.

Credentials are generated server-side and only the SHA-256 hash is persisted. The plaintext credential is returned only during registration.

Operations:
- POST /integration/devices
- GET /integration/devices
- POST /integration/devices/:deviceId/revoke

Revocation changes the device status to inactive.

Production hardening still requires role-based authorization for registry mutation endpoints and credential rotation/expiry enforcement.
