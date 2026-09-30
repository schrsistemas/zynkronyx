# Analytics V1

Zynkronyx Analytics V1 provides deterministic business metrics over tenant-specific semantic mappings.

## Architecture

```
ERP / API / DB
      |
 Integration
      |
 Semantic Mapping
      |
 Metric Catalog
      |
 Query Builder
      |
 Transactional SGBD
      |
 Analytics Result
```

Analytics is derived data. The configured transactional SGBD remains the source of truth.

## Endpoints

All Analytics endpoints require the same tenant and authentication middleware used by the existing API.

### Metric catalog

`GET /analytics/metrics`

Returns server-controlled metrics and whether each metric is configured for the current tenant.

### Query

`POST /analytics/query`

Example:

```json
{
  "metric": "revenue",
  "period": "LAST_90_DAYS",
  "dimensions": ["month"]
}
```

V1 supports the `month` dimension and these periods:

- TODAY
- YESTERDAY
- THIS_WEEK
- LAST_WEEK
- THIS_MONTH
- LAST_MONTH
- LAST_30_DAYS
- LAST_90_DAYS
- YTD
- CUSTOM

For `CUSTOM`, provide ISO-compatible `from` and `to` values.

### Mappings

`GET /analytics/mappings`

Lists mappings for the current tenant.

`POST /analytics/mappings`

Creates or updates a tenant mapping. This operation requires the authenticated user ID to be present in `ANALYTICS_MAPPING_USERS`.

Example:

```json
{
  "entity_name": "Order",
  "field_name": "total",
  "source_type": "TABLE",
  "source_name": "PEDIDO",
  "source_field": "VALOR_TOTAL",
  "data_type": "DECIMAL",
  "status": "ACTIVE"
}
```

The same entity can be mapped differently for another tenant.

`DELETE /analytics/mappings`

Requires `ANALYTICS_MAPPING_USERS`. Send `entity_name` and `field_name` in the JSON body.

## V1 metrics

- `revenue`: SUM of `Order.total`
- `order_count`: COUNT of orders
- `average_ticket`: `revenue / order_count`

The metric catalog is server controlled. Clients and LLMs never provide executable SQL.

## Security rules

- All mappings are tenant scoped.
- Physical identifiers are validated against a strict identifier grammar.
- Values are always sent as SQL parameters.
- Only registered mappings can resolve physical source identifiers.
- Raw SQL is not accepted by Analytics requests.
- An unconfigured metric returns `ANALYTICS_METRIC_NOT_CONFIGURED`; it is never silently represented as zero.
- V1 supports Firebird `TABLE` mappings only.
- Period calculations use UTC in V1.

## Configuration

`ANALYTICS_MAX_PERIOD_DAYS` limits custom and relative query windows. Default: 366.

`ANALYTICS_MAPPING_USERS` is a comma-separated allowlist of authenticated user IDs permitted to create, update, or delete semantic mappings.

## Future layers

Analytics is intentionally independent from AI/RAG:

```
DATA -> METRIC -> INSIGHT -> RAG/CONTEXT -> AI -> RECOMMENDATION -> APPROVAL -> ACTION
```

LLM integration must consume validated Analytics results rather than generating arbitrary executable SQL.

## Insight Engine V1

The Insight Engine consumes validated Analytics results; it does not issue SQL independently.

### Deterministic comparison

`POST /analytics/insights` compares the requested period with the immediately previous equivalent period.

Classification:

- `POSITIVE_TREND`: variation >= +10%.
- `NEGATIVE_TREND`: variation <= -10%.
- `STABLE`: variation between -10% and +10%.
- `NEW_BASELINE`: previous period is zero while the current period is non-zero; percentage variation is `null`.

The 10% threshold is a heuristic for descriptive product behavior. It is not a statistical anomaly detector and does not imply causality.

### Persistence

Generated insights are stored tenant-scoped in `ANALYTICS_INSIGHT`. Generation is keyed by tenant, metric, classification and exact period, allowing repeated requests to refresh the same derived insight.

Stored fields include current/previous values, variation, baseline, explanation, methodology and evidence coverage.

### API

`GET /analytics/insights?metric=revenue&type=NEGATIVE_TREND&limit=25`

`GET /analytics/insights/:id`

`POST /analytics/insights`

The transactional SGBD remains the source of truth. Insights can be discarded and regenerated from Analytics results.

## Evidence and AI explanation

Each generated insight keeps a bounded deterministic evidence series for the current and comparison periods.

`POST /analytics/insights/:id/explain` optionally sends the verified insight facts to the governed AI service for natural-language explanation.

Rules:
- Numeric Analytics values remain authoritative.
- AI does not calculate or mutate transactional data.
- Missing evidence must be reported rather than replaced with invented causes.
- RAG is complementary context; it cannot override deterministic metric values.
- The explanation is an interpretation layer, not a causal inference engine.
## Controlled Natural Language Analytics

`POST /analytics/nl-query` accepts a business question and resolves it against the server-controlled metric catalog.

Example:

```json
{"query":"Compare minha receita dos últimos 90 dias por mês"}
```

The V1 resolver is rule-based. It maps known Portuguese aliases to registered metrics and periods, then calls the same deterministic Analytics query service used by the UI.

It does **not**:
- generate SQL;
- invent unsupported metrics;
- execute arbitrary expressions;
- infer unavailable business entities.

Unknown metrics return `ANALYTICS_INTENT_METRIC_NOT_FOUND`.

This is deliberately the first layer of Natural Language Analytics. A future AI intent resolver can propose an interpretation, but the final metric, period and physical query must still be validated against the semantic layer before execution.
