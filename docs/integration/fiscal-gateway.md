# Fiscal Gateway

The Zynkronyx backend exposes the fiscal domain through a thin gateway.

## Routes

- POST /fiscal/simulations
- GET /fiscal/simulations/:id

The gateway is not a tax engine. It:
1. authenticates the caller through existing Zynkronyx auth/tenant middleware;
2. propagates tenant and correlation context;
3. requires an idempotency key for simulation commands;
4. calls the Reforma Tributária Simulator;
5. returns the fiscal result without reproducing its rules.

## Configuration

Set these as deployment secrets/environment variables:

- REFORMA_TRIBUTARIA_API_URL
- REFORMA_TRIBUTARIA_API_TOKEN

The token is an application credential, not a Cloudflare account token.

Cloudflare Worker-to-Worker calls should preferably use Service Bindings when both services run as Workers. Service bindings avoid a public URL and provide an internal capability boundary. For external HTTP calls, use a dedicated application secret.

## Request metadata

Zynkronyx propagates:

- X-Correlation-Id
- X-Zynkronyx-Tenant
- Idempotency-Key

Never put Cloudflare account credentials in this gateway.
