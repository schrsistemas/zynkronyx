# Build ALL — Deploy e Interfaces

## Objetivo

Manter uma visão única do que precisa existir para o Zynkronyx operar como plataforma.

## Interfaces

| Interface | Estado | Função |
|---|---|---|
| Worker Public Status | ativa | health, status e capabilities |
| Web Control Center | ativa | visão operacional |
| API Explorer | ativa | inspeção dos endpoints públicos |
| Database UI | foundation | visualização do estado da camada de dados |
| Tenant Administration | planejada | cadastro e controle de tenants |
| Authentication UI | planejada | login, sessão e gestão de acesso |
| Sync Monitor | planejada | filas, throughput, latência e erros |
| Staging/Reprocessamento | planejada | inspeção e reprocessamento |
| Audit UI | planejada | rastreabilidade |
| Firebird Diagnostics | planejada | conexão, schema e saúde |
| Delphi Operations | planejada | diagnóstico e sincronização do ERP |

## Deploy

### Cloudflare

O workflow `.github/workflows/deploy-cloudflare-worker.yml` publica o Worker usando as secrets do GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Depois do deploy são testados:

- `GET /health`
- `GET /api/status`
- `GET /api/capabilities`

### Backend

O pipeline deve separar claramente:

1. teste do código;
2. build da imagem;
3. smoke test da imagem;
4. publicação da imagem;
5. deploy no ambiente;
6. health check pós-deploy;
7. rollback/diagnóstico quando aplicável.

O workflow existente de produção ainda contém um deploy local simulado dentro do runner. Isso não deve ser tratado como produção real e será substituído quando o destino de runtime estiver definido/configurado.

## Ambientes

A evolução prevista é:

```
DEV -> CI -> STAGING -> PROD
          |       |
          v       v
        testes   smoke
```

Cada ambiente deve possuir configuração e secrets próprias.

## Critério de conclusão

Uma interface ou capacidade só é considerada operacional quando:

- implementação existe;
- caminho de execução real está definido;
- teste automatizado existe quando aplicável;
- observabilidade mínima existe;
- documentação existe;
- deploy correspondente é verificável.
