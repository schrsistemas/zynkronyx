# DelphiDBUtils

Biblioteca utilitária para Delphi Rio + FireDAC, com API comum para Firebird 2.5/5.0, SQLite e MySQL.

## Objetivo

Fornecer uma camada pequena e previsível sobre o FireDAC sem esconder o comportamento específico de cada SGBD.

## Camadas atuais

- **DBU.Types** — engines e exceções.
- **DBU.Connection** — ciclo de vida de uma conexão FireDAC externa.
- **DBU.Query** — execução de SQL e parâmetros tipados.
- **DBU.Transaction** — transações explícitas.
- **DBU.Driver** — dialetos SQL por engine.
- **DBU.SQL** — composição segura de identificadores e paginação.
- **DBU.CRUD** — INSERT, UPDATE e DELETE parametrizados.
- **DelphiDBUtils** — unit de fachada.

## Exemplo

```pascal
var
  Connection: TDBUConnection;
  CRUD: TDBUCRUD;
begin
  Connection := TDBUConnection.Create(FDConnection, dbuFirebird);
  try
    Connection.Connect;

    CRUD := TDBUCRUD.Create(Connection, dbuFirebird);
    try
      CRUD.Insert(
        'CLIENTES',
        ['NOME', 'ATIVO'],
        [ 'Maria', True ]
      );
    finally
      CRUD.Free;
    end;
  finally
    Connection.Free;
  end;
end;
```

A biblioteca não assume ownership do `TFDConnection` recebido por `TDBUConnection`.

## Compatibilidade

A camada comum deve permanecer compatível com Delphi Rio. SQL específico deve ficar isolado nos dialetos.

## Validação

Ainda não há compilação/runtime Delphi disponível neste ambiente. A validação real deve ocorrer no Delphi Rio com FireDAC e, posteriormente, em cada engine suportada.

## Evolução

Este projeto é contínuo. Não existe uma definição de “pronto”. Cada etapa deve preservar compatibilidade da API e aumentar cobertura, testes, metadata, CRUD, identidade/RETURNING, performance e qualidade.
