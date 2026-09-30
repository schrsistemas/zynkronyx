# AI Platform Contract — RAG, MCP, Skills, Fine-Tuning e LLM

## Regra central
`LLM ≠ fonte de verdade`.

```
Transactional SGBD
       │
       ├── Semantic Layer → Metrics → Insights
       │
       └── Knowledge ingestion → RAG
                              │
                              ▼
                         Context Assembly
                              │
LLM ← Skill ← Intent ← MCP Tool Registry
 │
 ├── Explain
 ├── Summarize
 ├── Recommend
 └── Generate controlled output
                              │
                        Human Approval
                              │
                            Action
                              │
                           Audit
```

## RAG

RAG mantém conhecimento mutável fora dos pesos do modelo.

Pipeline:
1. ingestão;
2. checksum/idempotência;
3. chunking;
4. embedding;
5. vector store derivado;
6. lexical fallback;
7. tenant/ACL filtering;
8. reranking;
9. context assembly;
10. LLM.

Documentos recuperados são dados não confiáveis. O LLM não deve executar instruções contidas em documentos.

RAG é apropriado para documentação ERP, manuais, contratos, políticas, procedimentos, conhecimento operacional e evidências.
RAG não substitui cálculo financeiro determinístico, autorização, source-of-truth transacional ou regras de negócio.

## MCP

No Zynkronyx, MCP é tratado como uma camada de tools governadas.

Uma tool deve possuir nome, descrição, input schema, tenant context, permission requirement, serviço de aplicação responsável e auditoria quando aplicável.

Exemplo: `analytics_query` → Metric Engine → Query Builder → SGBD.

Nunca: `LLM → SQL arbitrário → SGBD`.

A implementação atual fornece um registry interno conceitualmente compatível com tool calling. O transporte/protocolo MCP externo pode ser adicionado sem mover autorização para o modelo.

## Skills

Skill é uma capacidade de alto nível.

Exemplo: `business_analytics` pode utilizar analytics_query, analytics_forecast, analytics_anomaly e analytics_insight.

A Skill não aumenta as permissões do usuário.

Permission → o que o usuário pode fazer
Skill → como uma capacidade é orquestrada
MCP Tool → operação concreta autorizada
LLM → interpretação/linguagem

## Fine-Tuning

Fine-tuning deve ser usado para comportamento, não como banco de conhecimento operacional.

Bom candidato: formato de saída, classificação, estilo controlado, padrões repetitivos e comportamento especializado.

Mau candidato: preços atuais, estoque, clientes atuais, políticas mutáveis e dados transacionais. Esses dados permanecem no SGBD/RAG.

Pipeline planejado:
Human Feedback → Quality Filter → PII/Secret Filter → Deduplication → Dataset Version → Evaluation Split → Fine-Tune Job → Offline Evaluation → Canary → Promotion/Rollback.

A fundação atual apenas normaliza, deduplica e valida exemplos. Ela não dispara treinamento automaticamente.

## LLM Gateway

Application → AI Service → Prompt/Skill/Policy → LLM Gateway → Provider.

Isso permite trocar modelo/provedor sem acoplar o domínio.

Cada chamada relevante deve preservar tenant, correlation ID, provider, model, prompt version, retrieval metadata, latency, outcome e evaluation lineage.

## Guardrails

- tenant isolation;
- RBAC/permissions;
- input limits;
- prompt-injection defenses;
- RAG ACL;
- no arbitrary SQL;
- no direct mutable CRM action;
- human approval;
- audit trail;
- idempotency;
- prompt/release governance.

## Roadmap

### V1 — fundação
- RAG;
- LLM provider boundary;
- prompt governance;
- evaluation;
- canary;
- rollback;
- MCP internal tool registry;
- Skills registry;
- fine-tuning dataset foundation.

### V2
- MCP transport/server formal;
- tool result schemas;
- Skill execution planner;
- tool-level audit;
- fine-tuning dataset governance;
- PII/secret scrubbing;
- offline benchmark suite;
- model registry.

### V3
- multi-model routing;
- cost/latency policy;
- model fallback;
- continuous evaluation;
- production feedback loop;
- automated canary analysis.

## Regra de arquitetura

Não transformar o LLM no centro da autoridade.

Centro: `SOURCE OF TRUTH → POLICY → DETERMINISTIC SERVICES → AI INTERPRETATION → HUMAN GOVERNANCE`.