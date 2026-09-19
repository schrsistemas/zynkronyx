# ADR-0002: AI/RAG is a derived, rebuildable capability

## Context
LLM output and vector indexes are probabilistic/derived artifacts and cannot be the system of record.

## Decision
AI/RAG may assist retrieval, explanation and analysis, but The configured transactional SGBD and authorized application services remain authoritative. LLMs receive no arbitrary database access and cannot generate executable SQL for production actions.

## Consequences
AI failures must degrade safely. Retrieval indexes can be rebuilt without losing business data.

## Security impact
Tenant isolation, ACL filtering, prompt-injection defenses and output validation are mandatory.

## Operational impact
AI requires evaluation, audit, cost and latency telemetry.

## Rollback/recovery
Disable AI or revert the active prompt/model/provider while preserving transactional operations.

## Metrics
Groundedness, retrieval quality, error rate, latency, token usage and cost.
