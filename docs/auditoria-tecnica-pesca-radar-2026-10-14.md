# Auditoria técnica — Pesca Radar e Zynkronyx

**Data:** 2026-10-14  
**Branch:** `audit/pesca-radar-persistence`  
**Base inspecionada:** `main` no início da auditoria  
**Objetivo:** identificar defeitos verificáveis em frontend, mapa, persistência e limites do escopo do produto sem remover funcionalidades existentes.

## Resumo executivo

A auditoria encontrou dois defeitos reproduzíveis por inspeção estática no Control Center e uma lacuna de escopo importante: o repositório contém o Control Center do Zynkronyx e um radar de dispositivos, mas não foi localizada uma implementação dedicada ao diário de pescaria, capturas, torneios ou persistência dos registros de pesca. Portanto, a existência do Worker público do Pesca Radar, isoladamente, não comprova que seus dados sejam persistidos nem que o Worker corresponda a este código.

## Correções aplicadas nesta branch

### 1. Contrato de retorno incorreto no fluxo de aceite LGPD — corrigido

**Arquivo:** `frontend/pages/index.js`  
**Locais:** verificações e gravação do aceite em torno das linhas 53 e 82.

A função `fetchJson` retorna `{ response, data }`, mas os dois consumidores desestruturavam `{ response: r, j }`. Como `j` não existe no retorno, ele ficava `undefined`; acessos a `j.result` ou `j.error` podiam lançar exceção e interromper a consulta ou o registro do aceite.

**Correção:** ambos os consumidores agora mapeiam `data` para `j`, preservando o restante do fluxo.

### 2. Coordenadas vazias aceitas como latitude/longitude zero — corrigido

**Arquivo:** `frontend/pages/index.js`, filtro de pontos do Radar.

JavaScript converte `Number("")` e `Number(null)` para `0`. Assim, um dispositivo sem coordenadas poderia aparecer incorretamente no mapa próximo a (0, 0), embora a interface afirme que só exibe posições reportadas.

**Correção:** rejeitar valores nulos, indefinidos ou strings vazias, além de validar latitude entre -90 e 90 e longitude entre -180 e 180. Coordenadas numéricas válidas, inclusive recebidas como strings, continuam aceitas.

## Persistência: constatações e limites

- O Control Center consulta o endpoint `GET /integration/devices` e apresenta dados recebidos do backend. A interface, por si só, não comprova a persistência física dos dados.
- O backend declara `node-firebird` como dependência e o repositório possui testes de contrato do adapter Firebird e migrações específicas. Isso não prova que a configuração do banco de produção esteja válida, que o banco esteja acessível ou que a gravação sobreviva a reinicializações.
- Não foi localizado no frontend inspecionado um módulo de diário de pesca/capturas/torneios nem chamadas de API dedicadas a esses registros. A busca por referências de pesca não retornou uma API de domínio correspondente.
- A URL pública previamente associada ao Pesca Radar não foi usada como prova de que o código desse Worker está neste repositório. Antes de implementar persistência de pesca, é necessário identificar o projeto/entrypoint efetivamente implantado e seu armazenamento/bindings.

## Validação necessária

A conexão de GitHub permite inspecionar e registrar código, mas não executa comandos locais de build ou testes neste ambiente. O workflow `deploy-frontend-live.yml` já define validação do contrato backend, build estático do frontend e testes Playwright/axe antes do deploy. Esta branch deve ser validada por esse workflow; nenhum teste é declarado como aprovado nesta auditoria até que haja resultado real do CI.

Após o CI, a validação operacional de persistência deve executar um teste de ponta a ponta com dados descartáveis:
1. criar/atualizar um registro por API autenticada;
2. consultar o registro em uma nova requisição;
3. reiniciar/reconectar o processo, se o ambiente permitir;
4. consultar novamente e verificar a persistência no banco;
5. verificar tenant isolation, autorização e trilha de auditoria;
6. remover somente os dados descartáveis do teste.

Não executar testes destrutivos de limpeza sobre dados reais.

## Próximas ações recomendadas

1. Aguardar os checks de CI desta branch.
2. Identificar o repositório/entrypoint do Worker do Pesca Radar e os bindings de armazenamento realmente usados em produção.
3. Implementar testes de integração de persistência para o domínio de pesca somente depois de confirmar o contrato e a fonte de verdade.
4. Confirmar os resultados no ambiente público após deploy; não inferir sucesso a partir de um commit ou build isolado.
