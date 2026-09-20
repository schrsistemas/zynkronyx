# Zynkronyx — Consentimento e privacidade

## Objetivo

O Control Center apresenta um aviso de privacidade antes do uso da interface quando ainda não existe um aceite local para a versão vigente.

## Registro do aceite

O navegador registra versão do texto aceito, timestamp ISO-8601 do aceite e finalidade informada no aviso. A chave de versão faz o aviso reaparecer quando o texto vigente mudar.

## Limitação

O registro em localStorage é mecanismo de experiência de usuário e não constitui, sozinho, prova jurídica de consentimento. Para operações autenticadas ou tratamento que exija evidência vinculante, o aceite deve ser persistido no backend, associado ao tenant/usuário, versão do documento, finalidade, timestamp do servidor e metadados de auditoria aplicáveis.

## Minimização

Não armazenar dados pessoais desnecessários no navegador. Política de retenção, controle de acesso, atendimento aos direitos dos titulares e base legal devem ser definidos pelo responsável pelo tratamento.

Este documento descreve controles técnicos e não constitui parecer jurídico.
