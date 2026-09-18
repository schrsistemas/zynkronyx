# DelphiDBUtils

Biblioteca utilitária para Delphi Rio com FireDAC, com suporte a Firebird 2.5/5.0, SQLite e MySQL.

## Princípios
- FireDAC é a camada de acesso.
- A API comum cobre somente operações realmente portáveis.
- Diferenças de SQL e metadata ficam isoladas por driver.
- Valores sempre usam parâmetros.
- Conexões e transações têm ciclo de vida explícito.

## Status
Fundação inicial da biblioteca.