# ADR-0003: SGBD adapter boundary

## Context
Deployments may use different relational database engines. Application and domain code should not encode a specific SGBD as an architectural assumption.

## Decision
The application uses a generic SQL database service boundary. Engine-specific connection behavior is isolated behind an infrastructure adapter. The first adapter may be Firebird, PostgreSQL, SQL Server, MySQL, Oracle or another supported engine.

## Consequences
SQL dialect differences remain an infrastructure concern. Portable queries should be preferred at shared layers; engine-specific SQL must be isolated and documented when unavoidable.

## Security impact
Credentials and connection configuration remain outside application code. Tenant isolation and authorization remain application concerns and cannot be delegated blindly to a database adapter.

## Operational impact
Each supported adapter requires connection, transaction, migration and readiness tests.

## Rollback/recovery
Switching database engines requires a validated migration and reconciliation path; the abstraction does not imply transparent live migration.

## Metrics
Connection latency, query latency, transaction failures, pool utilization and migration status.
