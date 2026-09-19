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
## AI Sales API surface
- GET /sales/leads
- POST /sales/leads
- POST /sales/leads/:id/score
- GET /sales/opportunities
- POST /sales/opportunities
- GET /sales/opportunities/:id/activities
- POST /sales/opportunities/:id/activities (requires idempotency_key)
- POST /sales/opportunities/:id/next-action
- GET /sales/opportunities/:id/next-actions
- POST /sales/opportunities/:id/copilot
- POST /sales/next-actions/:id/approve
- POST /sales/next-actions/:id/complete

Sales AI recommendations are derived outputs. The LLM/copilot cannot mutate CRM state directly. A mutable recommended action remains PROPOSED until explicitly approved by an authenticated human, and the approval/completion lifecycle is audited.
