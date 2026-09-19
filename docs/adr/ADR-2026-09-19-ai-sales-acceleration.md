# ADR — AI Sales Acceleration Boundary

- Status: Accepted
- Date: 2026-09-19

## Decision

Introduce commercial acceleration as a bounded domain with tenant-scoped transactional entities:

- SALES_LEAD
- SALES_OPPORTUNITY
- SALES_ACTIVITY
- SALES_NEXT_ACTION

AI is used for scoring, recommendations and copilot analysis. It is not an authority for CRM mutations.

## Rules

1. Lead and activity ingestion are idempotent per tenant.
2. All repositories use the canonical database service and dialect boundary.
3. AI recommendations are derived and auditable.
4. A mutable recommended action is PROPOSED until an authenticated human explicitly approves it.
5. Approval and completion are audited.
6. Copilot receives only authorized opportunity/activity context.
7. RAG and LLM providers remain infrastructure concerns; the sales domain does not depend on a specific provider or vector database.
8. The transactional SGBD remains the source of truth.

## Consequences

This creates a stable domain boundary for later CRM integration, enrichment, scoring models, RAG evidence and provider changes without allowing AI to bypass business authorization.
