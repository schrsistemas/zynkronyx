# Production deployment contract

## Current state

The backend production image is published by `.github/workflows/backend-image.yml` to GitHub Container Registry (GHCR), tagged with `latest` and the commit SHA.

This workflow builds the production Dockerfile and runs an HTTP health smoke test on an ephemeral GitHub Actions runner.

## Production boundary

An ephemeral GitHub Actions runner is not a persistent production runtime. The repository therefore does not claim that a CI `docker run` is a production deployment.

A persistent deployment requires a configured runtime target (VM, Kubernetes, managed container service, or another supported host), plus deployment credentials and network configuration. Those values are environment-specific and are not invented in CI.

## Required contract

1. Build the immutable image from `Dockerfile.prod.fix`.
2. Publish it to GHCR.
3. Deploy the exact commit-SHA image to the configured runtime.
4. Inject Firebird and authentication secrets through the runtime secret manager.
5. Run `GET /health` against the real runtime.
6. Keep rollback tied to a previously published immutable image tag.
7. Never treat an ephemeral CI container as production.

## Database contract

The canonical `database/full.sql` schema includes the credential fields required by the tenant-scoped device registry:

- `CREDENTIAL_HASH`
- `CREDENTIAL_CREATED_AT`

The registry service stores only a hash of generated device credentials, never the plaintext credential.


## Authentication contract

Production protected routes require a configured bearer token. The token is never hardcoded in source.

Required secrets/environment variables:
- `AUTH_TOKEN`: random secret of at least 32 characters.
- `AUTH_LOGIN`: administrative login identifier.
- `AUTH_PASSWORD`: administrative password of at least 12 characters.
- `AUTH_USER_ID`: optional numeric audit user id; defaults to 1.

`POST /auth/login` validates the configured login/password and returns the configured bearer token. Protected routes compare the bearer token with a constant-time comparison. Missing production secrets produce a configuration error instead of silently accepting a mock token.

The Control Center must obtain the token through the authenticated login flow; `mock-token` and `x-api-key: demo` are preview-only values and must not be used as production credentials.


## AI Sales runtime configuration

For the sales approval boundary, configure `SALES_APPROVAL_USERS` with the authenticated user IDs permitted to approve mutable commercial actions. Leave it unset in environments where approval is intentionally disabled; the approval endpoint then fails closed with `SALES_APPROVAL_NOT_CONFIGURED`.

Sales recommendations can use RAG evidence when `RAG_ENABLED=true`. RAG failure does not authorize a CRM mutation; the recommendation remains derived and requires human approval.
