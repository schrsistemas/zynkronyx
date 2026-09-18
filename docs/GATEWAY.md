# API Gateway

O Cloudflare Worker `mute-grass-9428` é o ponto de entrada público do Control Center.

Públicas: `/`, `/health`, `/api/status`, `/api/capabilities`.

Encaminhadas ao Node/Express: `/auth/*`, `/sync/*`, `/integration/*`, `/audit/*`, `/admin/*`, `/metrics`.

O gateway trata CORS/OPTIONS e preserva os headers de autenticação e de credencial dos dispositivos.

Configure `BACKEND_URL` como variável/secret do Worker, apontando para a URL HTTPS pública do backend Node/Express. Não coloque esse valor no Git.

Sem essa configuração, o gateway responde `503 BACKEND_NOT_CONFIGURED`. Se o backend não responder, responde `502 BACKEND_UNREACHABLE`.

A imagem do backend é publicada no GHCR; o workflow de produção atualmente verifica a imagem, mas declara que o runtime persistente precisa de um hosting externo. Portanto, o gateway só poderá encaminhar requisições quando esse runtime estiver efetivamente publicado e acessível.
