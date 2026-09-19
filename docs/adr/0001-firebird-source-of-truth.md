# ADR-0001: Firebird remains transactional source of truth

## Context
Zynkronyx contains existing ERP transactional data and business rules. Derived indexes and AI projections must not become authoritative transaction stores.

## Decision
Firebird remains the source of truth for transactional ERP state. Search indexes, embeddings, caches and AI projections are derived and rebuildable.

## Consequences
Writes that change business truth remain governed by transactional application logic. Derived systems require reconciliation and rebuild procedures.

## Security impact
AI retrieval must enforce tenant and authorization boundaries and must not bypass transactional authorization.

## Operational impact
Rebuildability and reconciliation become first-class operational requirements.

## Rollback/recovery
Rebuild derived projections from authoritative Firebird data.

## Metrics
Projection freshness, reconciliation failures, queue backlog and rebuild duration.
