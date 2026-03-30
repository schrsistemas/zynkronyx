# Zynkronyx

## Objetivo
Plataforma de sincronizacao de dados entre ERP (Delphi + Firebird) e dispositivos externos (mobile/API).

## Problema
ERPs tradicionais nao possuem mecanismo robusto de sincronizacao delta, controle de conflitos e rastreabilidade.

## Solucao
Zynkronyx atua como camada intermediaria de sincronizacao baseada em log (SYNC_LOG), permitindo:
- Sincronizacao incremental (delta)
- Controle de conflitos
- Rastreabilidade completa

## Arquitetura
- ERP (Delphi + Firebird)
- API de sincronizacao (Node ou Delphi)
- Cliente (Mobile / integracoes)

## Fluxo
### ERP -> Cliente
1. ERP grava alteracoes em SYNC_LOG
2. API expoe endpoint de delta
3. Cliente consome alteracoes

### Cliente -> ERP
1. Cliente envia alteracoes
2. API grava staging
3. ERP processa e consolida

## Roadmap
- [ ] Criar estrutura backend
- [ ] Implementar tabela SYNC_LOG
- [ ] Criar endpoints REST
- [ ] Implementar controle de conflito
- [ ] Logging detalhado

## Stack sugerido
- Backend: Node.js (ou Delphi)
- Banco: Firebird 2.5 / 5.0
- Mobile: Android (Kotlin)

---
Projeto em construcao.