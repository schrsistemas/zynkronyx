# Zynkronyx — Integrações

Protocolo único para Arduino, Raspberry Pi, PIC, simuladores, Android, iOS/iPadOS, Delphi e REST. Dispositivos não acessam Firebird diretamente.

## Arquitetura
```
Arduino/PIC ─┐
Raspberry Pi ┤
Android ─────┤ HTTPS/JSON -> Worker -> Node/Express -> Firebird
iOS ─────────┤                         └-> LEGAL_EVENT_LOG
Delphi ──────┤
Simulador ───┘
```

Hardware sem TLS/IP adequado usa Raspberry Pi/gateway para converter UART, RS-485 ou CAN.

## Envelope
```json
{
  "event_id": "uuid",
  "device_id": "arduino-001",
  "device_type": "arduino",
  "timestamp": "2026-09-18T19:00:00.000Z",
  "sequence": 42,
  "operation": "telemetry",
  "payload": {},
  "protocol_version": 1
}
```

event_id é a chave idempotente. sequence detecta perda/reordenação. O servidor registra seu próprio timestamp e calcula o hash canônico.

## Transportes
| Cliente | Transporte | Uso |
|---|---|---|
| Arduino | HTTPS/MQTT via gateway | telemetria/comandos |
| Raspberry Pi | HTTPS/MQTT | edge/gateway/simulador |
| PIC | UART/RS-485/CAN -> gateway | automação |
| Android | HTTPS | operação móvel |
| iOS/iPadOS | HTTPS | operação móvel |
| Delphi | HTTPS | ERP |
| Simulador | HTTP/HTTPS | QA |

## Simulação
normal, duplicate, out-of-order, delayed, offline, invalid-payload, unauthorized, retry e clock-skew. Seed reproduzível e ambiente de teste por padrão.

## Mobile
Android/Kotlin e Apple/Swift/SwiftUI usam fila offline persistente, retry com backoff, idempotência, delta sync e armazenamento seguro de tokens.

## Hardware
Firmware mantém event_id, sequence, buffer, retry, watchdog e conectividade. Nunca distribuir SYSDBA ou acesso direto ao Firebird.

## Compatibilidade
protocol_version acompanha cada evento; mudanças incompatíveis usam nova versão.


## Atomic device ingestion

Device event ingestion is committed as one Firebird transaction: legal event evidence, device last-seen state, and sync staging are written together. A duplicate (tenant_id, event_id) is detected before mutation and does not create a second staging record.
