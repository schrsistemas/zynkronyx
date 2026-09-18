# API de sincronização

## ERP -> cliente

`GET /sync/out`

Parâmetros:
- `since`: timestamp ISO8601 do último cursor.
- `cursor_id`: ID usado para desempate quando `DATA` é igual.
- `limit`: 1 a 1000; padrão 100.

O delta é ordenado por `DATA, ID`. A resposta contém `next`, que deve ser persistido pelo cliente.

## Cliente -> ERP

`POST /sync/in`

Payload:

```json
{
  "tabela": "CLIENTE",
  "chave": "123",
  "operacao": "U",
  "dados": {
    "NOME": "Exemplo"
  }
}
```

O evento é gravado em `SYNC_STAGING` com estado `N` e a API responde HTTP 202. Isso confirma somente o aceite no staging, não a aplicação na tabela de negócio.

## Estados

- N = novo
- P = processando
- S = sucesso
- E = erro

O contrato evita o antigo mock de retorno fixo e elimina a dependência HTTP/axios inexistente no runtime.
