# Zynkronyx API Contract

## Contract rules
- Protected routes require Bearer authentication and tenant API key unless explicitly documented as public.
- Every response must expose correlation and request IDs through response headers.
- Errors use JSON with an error identifier and correlation ID.
- Mutating operations must define idempotency semantics where retries are possible.
- Tenant isolation is mandatory for tenant-scoped resources.
- New breaking API changes require an explicit versioning decision.

## AI API surface
- GET /ai/status
- POST /ai/query
- GET /ai/audit
- POST /ai/rag/documents
- POST /ai/rag/documents/preview
- POST /ai/rag/retrieve
- GET /ai/eval/cases
- POST /ai/eval/run
- GET /ai/prompts
- POST /ai/prompts
- POST /ai/prompts/:id/promote
- GET /ai/releases
- POST /ai/releases
- POST /ai/releases/:id/rollback

## Contract verification
CI should exercise authentication, tenant isolation, correlation headers, protected-route behavior, and representative AI lifecycle endpoints without requiring an external LLM provider.