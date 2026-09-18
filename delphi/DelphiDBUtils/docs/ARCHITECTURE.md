# Arquitetura

Aplicação Delphi -> DelphiDBUtils -> FireDAC -> driver FireDAC -> SGBD.

A biblioteca não cria uma segunda camada concorrente ao FireDAC. SQL comum permanece na camada base; diferenças por engine devem ficar isoladas.

Firebird 2.5 e 5.0 serão tratados como a mesma família de driver, mas a matriz de testes deve validar ambas as versões.

Valores externos devem ser enviados por parâmetros. Identificadores dinâmicos exigem validação e quoting específico.