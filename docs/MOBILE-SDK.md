# Mobile SDK contract

## Android
Kotlin: UI -> SyncClient -> LocalQueue -> Transport -> API. Fila persiste após fechamento do app. Tokens no armazenamento seguro do sistema.

## Apple
Swift/SwiftUI: UI -> SyncClient -> LocalQueue -> URLSession -> API. Tokens no Keychain quando aplicável.

## Semântica
QUEUED -> SENDING -> ACCEPTED, RETRY ou REJECTED. ACCEPTED significa aceitação pela API, não aplicação imediata no ERP.

Clientes não duplicam regras de negócio do ERP.
