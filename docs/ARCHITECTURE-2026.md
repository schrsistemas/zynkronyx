# Zynkronyx — Arquitetura alvo 2026

## Objetivo

Evoluir o Zynkronyx de uma API de sincronização para uma plataforma operacional observável, segura e extensível, preservando o contrato da API, o SGBD transacional configurado pelo deployment e o baixo acoplamento entre domínio, infraestrutura e IA.

## Arquitetura lógica

```
Delphi/ERP + SGBD transacional
        |
        | sync / eventos / auditoria
        v
Cloudflare Worker / API Gateway
        |
        +--------------------+
        |                    |
        v                    v
Node/Express API         AI Gateway
        |                    |
        |              +-----+------+
        |              |            |
        |           RAG/Vector   LLM provider
        |              |            |
        +--------------+------------+
                       |
                 Domain services
                       |
             +---------+---------+
             |                   |
       Transactional DB     Event/Outbox
             |                   |
             +---------+---------+
                       v
              Observability plane
        logs + metrics + traces + audit
```

## Camadas

1. **Edge** — Cloudflare Worker, CORS, rate limiting, correlation ID, routing.
2. **Application** — casos de uso, autenticação, autorização, idempotência, políticas.
3. **Domain** — regras de sincronização, conflitos, dispositivos, integrações, auditoria e aceleração comercial.
4. **Infrastructure** — adapter do SGBD transacional/driver, filas/outbox, armazenamento documental e provedores externos.
5. **AI platform** — ingestão, chunking, embeddings, retrieval, reranking, prompt assembly, LLM, guardrails e avaliação.
6. **Observability** — logs estruturados, métricas, tracing, auditoria, SLOs e alertas.
7. **Experience** — Control Center mobile-first; telas, tabelas, formulários e mapas devem funcionar primeiro em telas estreitas e touch, com desktop como progressive enhancement.

## RAG + LLM

O RAG não deve consultar diretamente o SGBD transacional a cada prompt.

Fluxo de ingestão:

```
fonte autorizada
  -> normalização
  -> classificação
  -> chunking
  -> metadata/ACL
  -> embedding
  -> índice vetorial
```

Fluxo de consulta:

```
pergunta
  -> autenticação/tenant
  -> normalização
  -> retrieval semântico
  -> filtros ACL/tenant
  -> reranking
  -> contexto limitado
  -> prompt versionado
  -> LLM
  -> validação de saída
  -> resposta + fontes + trace
```

A resposta de IA deve sempre manter referências às evidências recuperadas quando o modo for factual. O modelo não recebe credenciais nem acesso arbitrário ao banco.

## Provider abstraction

O backend deve tratar LLM e embeddings como portas/interfaces. O provider pode ser Cloudflare Workers AI/AI Gateway, OpenAI ou outro provedor compatível sem alterar o domínio.

Configuração por ambiente, nunca hard-coded:

- `AI_ENABLED`
- `AI_PROVIDER`
- `AI_MODEL`
- `AI_EMBEDDING_MODEL`
- `AI_GATEWAY_URL`
- `AI_MAX_TOKENS`
- `AI_TEMPERATURE`
- `RAG_ENABLED`
- `RAG_TOP_K`
- `AI_GOVERNANCE_USERS`
- `SALES_APPROVAL_USERS`
- `SALES_SCORE_POLICY_VERSION`
- `SALES_FIT_WEIGHT`
- `SALES_INTENT_WEIGHT`

## Segurança de IA

- isolamento por tenant;
- ACL por documento/chunk;
- redaction de PII/secrets;
- prompt-injection detection;
- limites de contexto;
- allowlist de ferramentas;
- nenhuma execução de SQL gerada pelo LLM;
- nenhuma ação mutável sem autorização explícita;
- auditoria de prompt/modelo/retrieval/ação;
- retenção e exclusão de dados definidas por política.

## Refinamento contínuo

O ciclo de qualidade será:

```
produção
 -> traces
 -> dataset de avaliação
 -> avaliação offline
 -> ajuste de prompt/retrieval
 -> canary
 -> métricas
 -> promoção
```

Não usar feedback de produção diretamente para treinar ou alterar comportamento sem validação.

## Dados e consistência

O SGBD transacional configurado pelo deployment continua sendo o sistema de verdade do ERP. Firebird é uma implementação atualmente suportada, não uma dependência arquitetural.

Para integração:

- outbox transacional para eventos;
- consumidores idempotentes;
- correlation ID;
- event ID;
- retry com backoff;
- dead-letter para falhas permanentes;
- versionamento de eventos;
- reconciliation job.

RAG é uma projeção derivada e reconstruível, nunca fonte de verdade transacional.

## API

- versionamento explícito para breaking changes;
- contratos OpenAPI;
- paginação;
- filtros;
- idempotency keys em comandos mutáveis;
- erros padronizados;
- correlation/request ID;
- timeouts;
- limites de payload;
- compatibilidade retroativa.

## Observabilidade

Cada operação deve poder ser correlacionada por:

- request ID;
- correlation ID;
- tenant ID;
- device ID;
- event ID;
- trace ID.

Métricas mínimas:

- latência p50/p95/p99;
- taxa de erro;
- throughput;
- filas/outbox pendentes;
- conflitos de sincronização;
- latência do SGBD transacional;
- cache hit;
- tokens/custo de IA;
- retrieval hit rate;
- groundedness/eval score;
- fallback rate.

## Resiliência

- timeout em chamadas externas;
- retry somente para erros transitórios;
- circuit breaker para providers;
- bulkhead;
- graceful degradation;
- fallback de modelo;
- cache de respostas somente quando semanticamente seguro;
- readiness separado de liveness.

## Segurança de aplicação

- secrets fora do Git;
- menor privilégio;
- RBAC/ABAC;
- rotação de credenciais;
- headers de segurança;
- proteção contra replay;
- rate limiting por identidade;
- auditoria de ações administrativas;
- dependências com SBOM e scan;
- imagens imutáveis por digest em produção.

## CI/CD

Pipeline alvo:

```
lint -> unit -> integration -> contract -> security
 -> build -> SBOM -> image scan
 -> staging -> smoke -> canary -> production
 -> post-deploy verification
```

Nenhum deploy deve ser considerado produção apenas porque a imagem foi construída.

## SLOs iniciais

Definir após coleta de baseline, mas medir desde o primeiro dia:

- disponibilidade API;
- erro 5xx;
- latência p95;
- atraso de sincronização;
- tempo de recuperação;
- sucesso de processamento da outbox;
- disponibilidade do plano de IA.

## ADRs obrigatórios

Manter decisões arquiteturais versionadas para:

- API Gateway;
- SGBD transacional como source of truth; Firebird é apenas o adapter atualmente implementado;
- estratégia de eventos;
- armazenamento RAG;
- provider de embeddings;
- provider LLM;
- autenticação/autorização;
- observabilidade;
- deployment;
- retenção e governança de dados.

## Regra principal

Adicionar IA não significa colocar um chatbot dentro do ERP. A IA deve ser uma capacidade controlada da plataforma, com dados autorizados, evidências rastreáveis, contratos estáveis, limites operacionais e fallback determinístico.


## 2026 Professional Engineering Maturity Roadmap

### Objective
Evolve Zynkronyx into a production-grade reference architecture for enterprise modernization, platform engineering, security, observability and AI engineering.

### Engineering pillars
1. **Architecture governance** — ADRs, explicit trade-offs, ownership, compatibility and rollback criteria.
2. **Platform engineering** — reproducible environments, immutable artifacts, IaC, secrets management, progressive delivery and rollback.
3. **Security** — threat modeling, least privilege, RBAC/ABAC, secret rotation, dependency/container scanning, SBOM and AI security controls.
4. **Quality engineering** — unit, integration, contract, end-to-end, migration, performance and resilience testing.
5. **SRE/observability** — SLIs, SLOs, error budgets, structured logs, metrics, traces, audit and actionable alerts.
6. **Data architecture** — transactional source of truth, event-driven integration, CDC where justified, data quality and lineage.
7. **AI engineering/LLMOps** — provider abstraction, RAG, evaluation, prompt/model versioning, cost/latency tracking, canary releases and rollback.
8. **Business architecture** — every major technical capability must map to an operational outcome and measurable KPI.
9. **Communication** — architecture diagrams, ADRs, runbooks, incident reports and technical decisions written for engineers and stakeholders.
10. **Professional growth** — strengthen English technical communication and system-design interview readiness.

### Definition of Done for architectural capabilities
A capability is not considered production-ready when code merely works. It must have:
- automated tests appropriate to the risk;
- authorization and tenant isolation where applicable;
- structured observability;
- documented operational behavior;
- deployment/release path;
- rollback or recovery strategy;
- security considerations;
- measurable success criteria;
- an ADR when the decision has meaningful architectural trade-offs.

### Execution order
**Phase A — Foundation:** ADR index, security baseline, request-scoped observability, API contracts, environment/secrets model.

**Phase B — Reliability:** integration/contract/E2E tests, SLOs, provider resilience, queue retry/DLQ, migration verification.

**Phase C — AI Engineering:** retrieval evaluation, groundedness, prompt/model cost telemetry, canary policy and automated release evidence.

**Phase D — Platform:** IaC, immutable artifacts, SBOM/scanning, staging smoke tests, progressive delivery and production rollback.

**Phase E — Modernization:** Delphi-to-API boundaries, outbox/event contracts, data architecture and incremental decomposition based on measured bottlenecks.

**Phase F — Professionalization:** architecture portfolio, English technical documentation, system-design case studies and business KPI mapping.


## Knowledge routes and boundaries

The knowledge plane is exposed through the governed AI boundary rather than a parallel undocumented API:

```
POST /ai/rag/documents
        |
        v
ingestion -> chunks -> embeddings -> derived index

POST /ai/rag/retrieve
        |
        v
tenant + ACL -> vector/lexical retrieval -> reranking -> bounded context

POST /ai/query
        |
        v
authorized context -> versioned prompt -> provider -> audit
```

`/ai/rag/documents/preview` is explicitly non-authoritative and is intended for preview/validation without making preview output transactional state.

The vector store is a derived search projection. The configured transactional SGBD remains authoritative for document lifecycle, ingestion state, audit and governance metadata.

## AI Sales Acceleration

Sales is a bounded domain on top of the same tenant, transactional-data, knowledge and AI-governance foundations:

```
Lead
  |
  v
normalization / deduplication
  |
  v
ICP --------+
            |
Intent -----+--> versioned Score Policy --> Priority
                                         |
                                         v
                                   Opportunity
                                         |
                                      Activities
                                         |
                              +----------+----------+
                              |                     |
                         RAG evidence          Copilot/LLM
                              |                     |
                              +----------+----------+
                                         |
                                  recommendation
                                         |
                                  human approval
                                         |
                                     execution
                                         |
                                      feedback
```

### Commercial scoring boundary

Lead priority is derived state. The scoring policy is versioned so historical scores can be attributed to the policy that generated them.

Current scoring boundary supports:

- ICP/fit score;
- explicit intent score;
- weighted intent signals;
- configurable fit/intent weights;
- persisted score-policy version.

The current default weighting is configuration, not a permanent domain invariant. Future scoring policies can evolve without changing the public lead contract.

### Sales invariants

- `SALES_LEAD`, `SALES_OPPORTUNITY`, `SALES_ACTIVITY` and `SALES_NEXT_ACTION` are tenant-scoped transactional entities.
- Lead identity is normalized before automatic deduplication.
- Lead/activity ingestion uses tenant-scoped idempotency boundaries.
- Scores and next-action proposals are derived and auditable.
- Recommendations may consume authorized RAG evidence through the retrieval boundary.
- Copilot receives authorized opportunity/activity context and cannot mutate CRM state.
- AI recommendation state begins as `PROPOSED`.
- Mutable recommendation lifecycle is `PROPOSED -> APPROVED -> COMPLETED`.
- Approval and completion require the configured human authorization boundary.
- Sales remains decoupled from a specific vector store, LLM provider and SGBD engine.

### Refinement loop

Commercial intelligence follows the same engineering principle as prompt governance:

```
signals + outcomes
       |
       v
evaluation dataset
       |
       v
offline scoring evaluation
       |
       v
candidate policy
       |
       v
controlled rollout
       |
       v
business + quality metrics
       |
       +--> promote
       |
       +--> rollback/refine
```

A scoring-policy change must not silently reinterpret historical scores. Policy version, evidence and observed outcome provide the basis for later comparison and refinement.

## Current implementation boundary

Implemented today:

- generic SQL database service/dialect boundary;
- Firebird database adapter and executable Firebird migrations;
- tenant-scoped RAG lifecycle;
- embedding/vector provider boundaries with lexical fallback;
- AI prompt evaluation and release governance;
- tenant-scoped AI Sales foundation;
- normalized lead identity;
- versioned ICP/Intent scoring;
- RAG-backed sales evidence;
- governed human approval/completion.

Architectural targets that are **not implied as already implemented** merely by appearing in this document include additional SGBD adapters, complete event/outbox infrastructure, full OpenAPI coverage, distributed tracing, production SLO enforcement and advanced enrichment providers.
