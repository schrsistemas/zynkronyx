# Database migrations

Migrations are organized by **logical schema** and **database dialect**.

## Rules

- The transactional database configured for a deployment remains the source of truth.
- A migration is not considered portable merely because the logical model is portable.
- Dialect-specific DDL belongs under its engine directory.
- Application repositories must not depend on migration implementation details.
- Every supported adapter must have its own migration and verification path.

## Layout

`common/` contains the logical schema contract and migration metadata.

`firebird/`, `postgresql/`, `sqlserver/`, `mysql/`, and other engine directories contain executable dialect-specific migrations.

A directory must not be advertised as supported until its migration, adapter, integration tests, and rollback/recovery procedure exist.

## Current status

- Firebird: executable AI/RAG foundation migration exists.
- PostgreSQL: adapter/migration not yet implemented.
- SQL Server: adapter/migration not yet implemented.
- MySQL: adapter/migration not yet implemented.

This explicit status prevents the architecture from claiming support that the repository does not yet provide.
