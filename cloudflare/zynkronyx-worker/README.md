# Zynkronyx Cloudflare Worker

Worker público inicial do Zynkronyx.

## Endpoints

- `GET /` — página pública de status.
- `GET /health` — health check.
- `GET /api/status` — metadados do serviço.
- `GET /api/capabilities` — capacidades públicas e roadmap técnico.

## Deploy

O Worker pode ser conectado ao repositório pelo painel do Cloudflare. O arquivo `wrangler.toml` define o entrypoint.

## Próximas etapas

1. Binding do Cloudflare D1.
2. Migrações SQL versionadas.
3. Repositórios de dados.
4. Autenticação.
5. Observabilidade.
6. Testes de integração.
