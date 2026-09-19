# Zynkronyx API Contract

## Contract rules

- Protected routes require Bearer authentication and tenant API key unless explicitly documented as public.
- Tenant isolation is mandatory for tenant-scoped resources.
- Responses expose correlation context through response headers/body according to the active API gateway contract.
- Errors use JSON with an error identifier and correlation ID.
- Mutating operations must define idempotency semantics where retries are possible.
- New breaking API changes require an explicit versioning decision.
- AI-generated content is derived data; it does not become authoritative transactional state by itself.

## Core API surface

### Synchronization

- `GET /sync/out`
- `GET /sync/device-out`
- `POST /sync/in`

### Devices / integrations

- `POST /integration/devices`
- `GET /integration/devices`
- `POST /integration/devices/:deviceId/revoke`
- `POST /integration/devices/:deviceId/rotate`

## Knowledge and RAG API

The knowledge layer is tenant-scoped and treats retrieved documents as untrusted data.

### Ingestion

- `POST /ai/rag/documents`
  - creates/ingests a knowledge document;
  - ingestion is designed to be idempotent;
  - derived chunks/indexes may be rebuilt.

### Preview

- `POST /ai/rag/documents/preview`
  - previews processing without making the result the transactional source of truth.

### Retrieval

- `POST /ai/rag/retrieve`
  - retrieves authorized context;
  - applies tenant/ACL filtering;
  - can use vector retrieval when configured;
  - has lexical fallback;
  - applies reranking/context limits.

### AI query

- `POST /ai/query`
  - executes the governed AI query pipeline;
  - may consume RAG context;
  - records AI audit information;
  - provider/model are infrastructure configuration, not API-domain dependencies.

### Status

- `GET /ai/status`

## AI governance API

Governance mutations require the configured AI governance authorization.

- `GET /ai/prompts`
- `POST /ai/prompts`
- `POST /ai/prompts/:id/promote`
- `GET /ai/eval/cases`
- `POST /ai/eval/run`
- `GET /ai/audit`
- `POST /ai/feedback`
- `GET /ai/feedback/summary`
- `GET /ai/refinement`
- `POST /ai/refinement`
- `POST /ai/refinement/:id/review`
- `POST /ai/refinement/:id/accept`  
  - accepts optional `Idempotency-Key` header (or `idempotency_key` body field); repeated requests with the same key for the same refinement return the previously created draft instead of creating another one; reuse of the same key for another refinement is rejected.
- `GET /ai/releases`
- `POST /ai/releases`
- `POST /ai/releases/:id/rollback`

Governance flow:

```
prompt candidate
     ↓
evaluation
     ↓
promotion gate
     ↓
canary release
     ↓
metrics / audit
     ↓
promotion or rollback
```

The application must fail closed when required governance authorization is not configured.

## AI Sales API

Sales resources are tenant-scoped.

### Leads

- `GET /sales/leads`
- `POST /sales/leads`
- `POST /sales/leads/:id/score`

Lead capture normalizes identity fields before automatic deduplication. Explicit `external_key` remains supported.

Scoring supports a versioned policy and can combine:

- ICP / fit score;
- intent score;
- weighted intent signals.

Relevant configuration:

- `SALES_SCORE_POLICY_VERSION`
- `SALES_FIT_WEIGHT`
- `SALES_INTENT_WEIGHT`

### Opportunities

- `GET /sales/opportunities`
- `POST /sales/opportunities`

### Activities

- `GET /sales/opportunities/:id/activities`
- `POST /sales/opportunities/:id/activities`

Activity creation requires `idempotency_key`.

### AI recommendations

- `POST /sales/opportunities/:id/next-action`
- `GET /sales/opportunities/:id/next-actions`

Recommendations are derived outputs. RAG evidence may be attached when enabled and authorized.

### Human approval lifecycle

- `POST /sales/next-actions/:id/approve`
- `POST /sales/next-actions/:id/complete`

Both approval and completion require the configured `SALES_APPROVAL_USERS`.

Expected lifecycle:

```
PROPOSED
   │
   └── human approval ──> APPROVED
                              │
                              └── completion ──> COMPLETED
```

The LLM/copilot cannot mutate CRM state directly.

### Commercial copilot

- `POST /sales/opportunities/:id/copilot`

The copilot receives authorized commercial context and is instructed to return analysis/recommendations rather than execute CRM mutations.

## Persistence contract

The transactional SGBD configured for the deployment remains the source of truth.

Application code consumes the generic database service/dialect boundary. It must not embed assumptions about a specific engine in domain services.

The currently implemented executable migration path is Firebird-specific. Adding another SGBD requires its adapter, dialect behavior, migration strategy and verification path.

## Contract verification

CI should exercise:

- authentication;
- tenant isolation;
- correlation/error behavior;
- protected governance routes;
- sales approval/completion boundaries;
- lead idempotency;
- activity idempotency;
- representative RAG lifecycle;
- AI governance lifecycle;

without requiring a live external LLM provider.

## Architectural rule

The API is a contract boundary, not a reflection of internal implementation details. Domain services, database adapters, vector stores and AI providers may evolve behind these contracts without forcing clients to depend on their internal structure.
