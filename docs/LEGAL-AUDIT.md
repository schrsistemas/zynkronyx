# Zynkronyx — Logs jurídicos e trilha de auditoria

Define requisitos técnicos de rastreabilidade; não constitui parecer jurídico.

## Evidência
Registrar tenant, usuário, dispositivo, event_id, ação, recurso, chave, timestamp do servidor, timestamp do cliente, correlation_id, hash do evento, hash do payload, resultado e metadados técnicos.

## Integridade
- SHA-256 calculado no servidor;
- eventos append-only na aplicação;
- correções viram novos eventos;
- correlation_id atravessa Worker/API/processor/dispositivo;
- UTC no transporte;
- segredos e dados pessoais desnecessários ficam fora dos logs.

PREVIOUS_HASH pode encadear eventos dentro de escopo definido. Isso não substitui controles de acesso, backups ou assinatura digital quando aplicáveis.

## LGPD e retenção
Minimização, controle de acesso e retenção configurável. Prazos específicos devem ser definidos pelo responsável pelo tratamento e assessoria aplicável.

## Exportação
Exportações carregam filtros, período, tenant, id, hash do arquivo, versão do schema, timestamp e usuário solicitante. Exportar não altera registros.
