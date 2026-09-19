# Zynkronyx

Plataforma de integração, sincronização e inteligência operacional para sistemas ERP e aplicações externas, com **Node.js**, **Cloudflare**, **SGBD transacional configurável**, RAG/LLM, governança de IA e aceleração comercial.

> O projeto evoluiu além de uma simples API de sincronização. O Zynkronyx hoje é estruturado como uma plataforma de integração + dados + conhecimento + IA controlada, mantendo o SGBD transacional configurado como fonte de verdade.

## Visão atual

O Zynkronyx conecta:

```
ERP / Delphi
     │
     ▼
SGBD transacional configurado
     │
     ├── Sync / integração
     ├── Auditoria / observabilidade
     ├── Dispositivos / APIs
     ├── Base de conhecimento
     │       └── RAG → retrieval → reranking → contexto autorizado
     │
     ├── IA
     │       └── prompt → LLM → avaliação → canary → promoção/rollback
     │
     └── Aceleração Comercial
             └── Lead → ICP → Intent → Score → Opportunity
                                      │
                                      ▼
                              AI recommendation
                                      │
                              aprovação humana
                                      │
                                  execução
```

## Princípios arquiteturais

- **SGBD transacional é a fonte de verdade.**
- O domínio não depende diretamente de um SGBD específico.
- **Firebird é o adapter atualmente implementado**, não uma exigência arquitetural.
- Dados derivados de IA/RAG podem ser reconstruídos a partir da fonte de verdade.
- Toda leitura comercial e de conhecimento é **tenant-scoped**.
- Recomendações de IA são derivadas e auditáveis.
- LLM não altera CRM diretamente.
- Ações mutáveis exigem aprovação humana explícita.
- Prompts, avaliações e releases possuem governança.
- Integrações devem ser idempotentes, observáveis e resilientes.
- Correlation ID e auditoria acompanham operações relevantes.

## Áreas principais

### 1. Sincronização

Fluxo ERP → cliente:

1. ERP registra alterações.
2. A camada de sincronização calcula/expõe delta.
3. Cliente consome alterações.
4. Conflitos e rastreabilidade são tratados pela camada de sincronização.

Fluxo cliente → ERP:

1. Cliente envia alterações.
2. API recebe e valida.
3. Dados entram no fluxo de staging/processamento.
4. O ERP/SGBD consolida o estado transacional.

Rotas principais:

- `GET /sync/out`
- `GET /sync/device-out`
- `POST /sync/in`

### 2. Dispositivos e integrações

A plataforma possui registro e ciclo de vida de dispositivos:

- `POST /integration/devices`
- `GET /integration/devices`
- `POST /integration/devices/:deviceId/revoke`
- `POST /integration/devices/:deviceId/rotate`

Há escopos específicos para operações de dispositivo e sincronização.

### 3. Base de conhecimento / RAG

A camada de conhecimento deixou de ser apenas um endpoint de consulta.

Fluxo atual:

```
documento
   ↓
ingestão
   ↓
chunking
   ↓
embedding
   ↓
índice derivado
   ↓
retrieval
   ↓
ACL / tenant filtering
   ↓
reranking
   ↓
context assembly
   ↓
LLM
```

Rotas de conhecimento/IA:

- `POST /ai/rag/documents` — ingestão idempotente.
- `POST /ai/rag/documents/preview` — processamento/preview sem persistência.
- `POST /ai/rag/retrieve` — recuperação de contexto autorizado.
- `POST /ai/query` — consulta de IA usando o pipeline RAG quando habilitado.
- `GET /ai/status` — estado da plataforma de IA.

A recuperação possui fallback lexical quando a camada vetorial não está disponível.

O contexto recuperado é tratado como **dados não confiáveis**, e não como instruções executáveis.

### 4. Governança de IA

A plataforma possui ciclo de refinamento:

```
produção
  ↓
traces / auditoria
  ↓
casos de avaliação
  ↓
evaluation
  ↓
ajuste de prompt/retrieval
  ↓
canary
  ↓
métricas
  ↓
promoção ou rollback
```

Rotas:

- `GET /ai/prompts`
- `POST /ai/prompts`
- `POST /ai/prompts/:id/promote`
- `GET /ai/eval/cases`
- `POST /ai/eval/run`
- `GET /ai/audit`
- `GET /ai/releases`
- `POST /ai/releases`
- `POST /ai/releases/:id/rollback`

Operações de governança possuem autorização específica e falham fechadas quando não configuradas.

### 5. Aceleração Comercial com IA

O domínio comercial foi criado como uma camada própria, sem transformar o LLM em operador direto do CRM.

Fluxo:

```
Lead
 ↓
normalização / deduplicação
 ↓
ICP
 ↓
Intent
 ↓
Score Policy versionada
 ↓
Opportunity
 ↓
Activities
 ↓
RAG / evidências
 ↓
AI recommendation
 ↓
human approval
 ↓
completion
```

Rotas:

- `GET /sales/leads`
- `POST /sales/leads`
- `POST /sales/leads/:id/score`
- `GET /sales/opportunities`
- `POST /sales/opportunities`
- `GET /sales/opportunities/:id/activities`
- `POST /sales/opportunities/:id/activities`
- `POST /sales/opportunities/:id/next-action`
- `GET /sales/opportunities/:id/next-actions`
- `POST /sales/next-actions/:id/approve`
- `POST /sales/next-actions/:id/complete`
- `POST /sales/opportunities/:id/copilot`

Aprovação e conclusão de ações mutáveis exigem usuários configurados em `SALES_APPROVAL_USERS`.

O scoring comercial agora possui política versionada e pode combinar ICP com sinais de intenção ponderados.

## API e segurança

A API aplica, conforme o fluxo:

- autenticação;
- tenant isolation;
- autorização;
- rate limiting;
- correlation ID;
- limites de payload;
- headers de segurança;
- auditoria;
- idempotência;
- validação de contexto;
- tratamento padronizado de erros.

Rotas administrativas e de governança possuem controles adicionais.

## Persistência

A arquitetura separa:

```
Domain / Application
        ↓
SQL Database Service
        ↓
Database Adapter
        ↓
SGBD configurado
```

O código de domínio não deve assumir Firebird, PostgreSQL, SQL Server ou MySQL diretamente.

Atualmente:

- contrato de banco: genérico;
- dialect boundary: definido;
- adapter Firebird: implementado;
- migrations executáveis: organizadas por dialect;
- outros adapters: ainda dependem de implementação específica.

Consulte `database/migrations/README.md` antes de adicionar uma nova engine.

## Observabilidade e auditoria

Operações relevantes carregam:

- tenant ID;
- correlation ID;
- usuário quando aplicável;
- resultado da operação;
- metadados operacionais;
- eventos de auditoria.

Para IA também são rastreados, conforme o fluxo:

- provider;
- modelo;
- versão do prompt;
- retrieval;
- latência;
- resultado;
- avaliação;
- release/canary.

## Frontend — Control Center

O Control Center concentra:

- Overview;
- Services;
- API Explorer;
- Database;
- Synchronization;
- Monitoring;
- Security;
- Radar;
- Devices;
- Integrations;
- Audit;
- Deployments;
- Docs;
- AI / RAG;
- AI Sales.

A interface é mobile-first e possui progressive enhancement para telas maiores.

## Cloudflare

A camada Edge utiliza Cloudflare para:

- entrada HTTP;
- roteamento;
- CORS;
- rate limiting;
- correlation;
- proxy para APIs;
- exposição controlada dos serviços.

O Worker possui rotas específicas para os domínios de IA e vendas.

## Documentação arquitetural

Documentos relevantes:

- `docs/ARCHITECTURE-2026.md`
- `docs/API-CONTRACT.md`
- `docs/PRODUCTION-DEPLOYMENT.md`
- `docs/adr/`
- `database/migrations/README.md`

A documentação de arquitetura deve ser atualizada junto com mudanças estruturais, principalmente quando houver alteração de contrato, persistência, segurança ou fluxo de IA.

## Configuração de IA

Variáveis relevantes incluem:

- `AI_ENABLED`
- `AI_PROVIDER`
- `AI_MODEL`
- `AI_EMBEDDING_MODEL`
- `AI_GATEWAY_URL`
- `AI_MAX_INPUT_CHARS`
- `RAG_ENABLED`
- `RAG_TOP_K`
- `AI_GOVERNANCE_USERS`
- `SALES_APPROVAL_USERS`
- `SALES_SCORE_POLICY_VERSION`
- `SALES_FIT_WEIGHT`
- `SALES_INTENT_WEIGHT`

Segredos e credenciais não devem ser armazenados no repositório.

## Estado do projeto

O projeto está em evolução ativa. A arquitetura atual já contempla:

- sincronização;
- multi-tenant;
- abstração de SGBD;
- dispositivos e integrações;
- auditoria;
- observabilidade;
- RAG;
- embeddings e vector store por adapters;
- fallback lexical;
- LLM provider boundary;
- prompt governance;
- evaluation;
- canary/release/rollback;
- AI Sales;
- ICP/Intent scoring versionado;
- aprovação humana de ações mutáveis.

Próximas evoluções naturais incluem:

- motor temporal de sinais de intenção;
- políticas de ICP configuráveis por tenant;
- enriquecimento via adapters;
- deduplicação/conciliação mais avançada;
- feedback loop comercial;
- avaliação de recomendações;
- refinamento contínuo de retrieval, prompts e scoring;
- expansão dos adapters de SGBD.

---

**Zynkronyx — integração, conhecimento e inteligência operacional sob governança.**
