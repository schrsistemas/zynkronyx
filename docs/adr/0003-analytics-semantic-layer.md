# ADR 0003 — Analytics semantic layer

## Status

Accepted.

## Context

Zynkronyx integrates heterogeneous ERP, database, and API sources. The platform does not own a universal transactional schema for entities such as Customer, Product, or Order.

Business analytics therefore cannot safely assume physical table and column names.

At the same time, business metrics must remain deterministic and auditable. An LLM must not invent executable SQL against the transactional database.

## Decision

Introduce a tenant-scoped semantic mapping layer for Analytics.

A mapping translates a canonical concept:

`Order.total`

to a physical source:

`PEDIDO.VALOR_TOTAL`

The mapping is stored in `ANALYTICS_MAPPING` and is always scoped by `TENANT_ID`.

The metric catalog is server controlled. V1 defines deterministic metrics such as:

- `revenue`
- `order_count`
- `average_ticket`

Clients submit metric names, periods, and supported dimensions. They never submit executable SQL or unrestricted physical identifiers.

The query builder resolves physical identifiers only from registered mappings and validates identifiers before composing SQL. SQL values remain bound parameters.

## Consequences

### Positive

- Supports heterogeneous ERP schemas without hard-coding one universal business database.
- Preserves tenant isolation.
- Keeps metric calculation deterministic.
- Prevents arbitrary SQL generation through Analytics requests.
- Allows AI/RAG to consume validated analytics results later.
- Keeps the transactional SGBD as the source of truth.

### Limitations

- V1 supports Firebird table mappings only.
- V1 supports the `month` dimension.
- Multi-table semantic relationships and arbitrary joins are intentionally deferred.
- Period calculations use UTC in V1.
- Mapping administration requires explicit configuration through `ANALYTICS_MAPPING_USERS`.

## Non-goals

This ADR does not make Analytics a transactional data store.

It does not grant the LLM database access.

It does not define forecasting, anomaly detection, or automated business actions.

## Future evolution

The semantic layer can later grow to represent relationships, dimensions, measures, metric versions, tenant-specific policies, data-quality checks, and additional database adapters without changing the external metric vocabulary.
