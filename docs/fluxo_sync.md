# Fluxo de Sincronizacao

## Saida (ERP -> Node -> Cliente)
1. ERP registra em SYNC_LOG
2. Node chama /sync/out no ERP
3. Cliente consome delta por ultima_data

## Entrada (Cliente -> Node -> ERP)
1. Cliente envia payload para Node /sync/in
2. Node persiste (staging/log) e repassa ao ERP
3. ERP grava em SYNC_STAGING
4. Job processa staging e aplica nas tabelas de negocio

## Regras
- Sempre delta por DATA + ID
- Datas em ISO8601
- Nunca aplicar direto sem staging
- Idempotencia por CHAVE+DATA+OPERACAO
