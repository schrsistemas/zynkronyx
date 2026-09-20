# Zynkronyx — Consentimento e privacidade

## Objetivo

O Control Center apresenta um aviso de privacidade antes do uso da interface quando ainda não existe um aceite para a versão vigente. Usuários autenticados têm o aceite persistido no backend em `LEGAL_ACCEPTANCE`, com escopo de tenant e sujeito ao histórico de eventos.

## Registro do aceite

O navegador registra a versão aceita para controlar a experiência da interface. Para usuários autenticados, o backend registra versão da política, finalidade/tipo, ação, timestamp do servidor, tenant, sujeito, origem e correlação da requisição. A chave de versão faz o aviso reaparecer quando o texto vigente mudar.

## Limitação

O `localStorage` continua sendo apenas mecanismo de experiência de usuário e não constitui, sozinho, prova jurídica de consentimento. Para operações autenticadas, o endpoint `/legal/acceptance` persiste a evidência técnica no SGBD transacional configurado.

## Minimização

Não armazenar dados pessoais desnecessários no navegador. Política de retenção, controle de acesso, atendimento aos direitos dos titulares e base legal devem ser definidos pelo responsável pelo tratamento.

Este documento descreve controles técnicos e não constitui parecer jurídico.
