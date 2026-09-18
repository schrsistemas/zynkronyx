# Cloudflare Gateway

O Control Center usa o Worker `mute-grass-9428` como gateway público.

## Rotas

- Público: `/`, `/health`, `/api/status`, `/api/capabilities`.
- Proxy: `/auth/*`, `/sync/*`, `/integration/*`, `/audit/*`, `/admin/*`, `/metrics`.

As rotas de proxy preservam os cabeçalhos de autenticação e credenciais de dispositivo e retornam o status HTTP do backend.

## Configuração obrigatória

No Worker, configure a variável/secret `BACKEND_URL` apontando para o endpoint HTTP(S) público do Node/Express. O valor não deve ser commitado no repositório.

Sem `BACKEND_URL`, o gateway retorna `503 BACKEND_NOT_CONFIGURED`; se o backend não responder, retorna `502 BACKEND_UNREACHABLE`.

## CORS

OPTIONS é tratado no edge e os headers permitidos incluem Authorization, x-api-key, x-device-id, x-device-credential e x-correlation-id.

## Observação de deployment

A imagem Docker do backend é publicada no GHCR, mas o repositório ainda declara que o runtime persistente precisa de um hosting externo configurado. Portanto, publicar o Worker não cria automaticamente um backend Node/Firebird público.
