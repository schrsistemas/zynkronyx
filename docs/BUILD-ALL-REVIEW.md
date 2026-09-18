# Build ALL refinement review

## Security
Device credentials are random server-generated values and only their hashes are persisted. Registry authentication checks tenant, active status and credential expiration.

## LGPD
Location remains coarse by default in Radar. Audit data should be minimized and retention configured by purpose.

## Radar
Only registered active devices with stored last-known coordinates are candidates for the operational map. No fabricated coordinates or residential-address enrichment is performed.

## Multi-platform
All clients use the same event envelope and server-side validation. Hardware clients should never connect directly to Firebird.

## Quality gate
Before production: automated Node tests, Docker smoke test, database migration validation, dependency audit, secret scanning and client contract tests.
