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
