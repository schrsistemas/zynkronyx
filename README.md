# Zynkronyx

Plataforma de sincronização entre ERP Delphi/Firebird, APIs e clientes externos.

## Build ALL

O projeto é tratado como uma plataforma completa, não apenas como uma API. O escopo inclui:

- Backend Node.js/Express
- Firebird e camada de persistência
- Sincronização delta, staging, idempotência e processamento
- Delphi e DelphiDBUtils
- Cloudflare Worker / edge
- Frontend Web / Control Center
- Interfaces operacionais e diagnósticas
- Docker e ambientes CI
- Deploy automatizado
- Observabilidade, health checks e logs
- Segurança, autenticação e controle por tenant
- Testes automatizados e smoke tests
- Documentação técnica e operacional

## Arquitetura atual

```
Delphi / Mobile / Web
        |
        v
Cloudflare Worker
        |
        v
Node.js / Express API
        |
        +--> Auth / Tenant / Rate Limit
        |
        +--> Sync API
        |       |
        |       +--> Repository
        |       +--> Firebird
        |       +--> SYNC_LOG
        |       +--> SYNC_STAGING
        |
        +--> Processor
                |
                v
          ERP / Firebird
```

A arquitetura é evolutiva. Componentes marcados como planejados no Control Center não são considerados implementados apenas por existirem no código.

## Interfaces gráficas

### Control Center Web

O frontend em `frontend/` fornece a interface operacional inicial:

- Overview
- Services
- API Explorer
- Database
- indicadores de disponibilidade
- latência da API
- capacidades publicadas pelo Worker
- visão visual da arquitetura

O frontend é validado por GitHub Actions com build do Next.js.

### Interface pública do Worker

O Worker possui uma página pública de status e endpoints de diagnóstico:

- `/`
- `/health`
- `/api/status`
- `/api/capabilities`

### Interfaces futuras

O Build ALL também contempla interfaces específicas para:

- administração de tenants
- autenticação
- monitoramento de sincronização
- fila/staging
- erros e reprocessamento
- auditoria
- configuração de conexões
- diagnóstico Firebird
- operações Delphi
- documentação/API Explorer avançado

## Deploy

### Cloudflare Worker

O deploy é feito por GitHub Actions quando alterações do Worker chegam à `main`. O pipeline executa smoke tests nos endpoints públicos após o deploy.

### Backend

A imagem Docker é construída e validada por CI. O mecanismo de produção deve apontar para um ambiente real de execução; comandos que apenas iniciam Docker dentro do runner não são considerados deploy de produção.

## Desenvolvimento

Backend:

```bash
cd backend
npm install
npm test
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm start
```

## Princípios

1. Mapear o fluxo real antes de substituir componentes.
2. Não mascarar falhas para obter CI verde.
3. Não considerar mock como integração real.
4. Testar API, banco, processamento e interfaces separadamente e ponta a ponta.
5. Toda mudança operacional deve ser documentada.
6. Credenciais nunca entram no código ou no Git.
7. Deploy deve possuir verificação pós-deploy.

## Estado

O projeto está em evolução contínua. O Build ALL só considera uma capacidade concluída quando código, teste, documentação e operação correspondente estiverem coerentes.
