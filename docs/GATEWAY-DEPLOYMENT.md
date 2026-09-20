# Gateway deployment contract

The public Control Center uses the Cloudflare Worker as the API gateway.

## Required production secret

The Worker deployment requires the GitHub Actions secret:

- `BACKEND_URL`: base URL of the persistent Node/Express production runtime.

The value must point to a reachable production backend. It must not contain a path suffix such as `/integration`.

Example shape:

    https://api.example.com

Do not commit the real value to the repository.

## Request path

    Browser
    -> Cloudflare Pages
    -> Cloudflare Worker
    -> BACKEND_URL
    -> Node/Express
    -> configured SQL adapter

The Worker forwards authentication and device headers:

- Authorization
- x-api-key
- x-device-id
- x-device-credential
- x-correlation-id

## Failure semantics

- `503 BACKEND_NOT_CONFIGURED`: Worker is deployed but no `BACKEND_URL` secret is available.
- `502 BACKEND_UNREACHABLE`: Worker has a backend URL but cannot reach it.
- Upstream HTTP status/body: returned to the client without converting a real backend failure into a fake success.

## Smoke-test requirement

A production Worker deployment is only considered operational when CI verifies:

1. `/health`
2. CORS preflight
3. `/api/status`
4. `/api/capabilities`
5. a backend-gateway request

The persistent backend runtime is a separate deployment boundary and must be available before protected Control Center features can operate.
