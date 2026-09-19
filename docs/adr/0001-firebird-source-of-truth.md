# ADR-0001: Configured transactional SGBD remains source of truth

## Context
Zynkronyx contains existing ERP transactional data and business rules. The concrete SGBD may vary by deployment. Derived indexes and AI projections must not become authoritative transaction stores.

## Decision
The configured transactional SGBD remains the source of truth for transactional ERP state. Firebird, PostgreSQL, SQL Server, MySQL, Oracle or another supported SGBD are infrastructure choices. Search indexes, embeddings, caches and AI projections are derived and rebuildable.

## Consequences
Writes that change business truth remain governed by transactional application logic. Derived systems require reconciliation and rebuild procedures.

## Security impact
AI retrieval must enforce tenant and authorization boundaries and must not bypass transactional authorization.

## Operational impact
Rebuildability and reconciliation become first-class operational requirements.

## Rollback/recovery
Rebuild derived projections from the configured authoritative SGBD data.

## Metrics
Projection freshness, reconciliation failures, queue backlog and rebuild duration.
