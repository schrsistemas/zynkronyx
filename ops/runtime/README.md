# Zynkronyx Runtime

Topologia: `Internet -> Caddy/TLS -> Node/Express -> Firebird`.

O Worker Cloudflare deve apontar `BACKEND_URL` para `https://<API_DOMAIN>`.

## Segurança
- Nunca commit `.env` real.
- Use secrets fortes.
- Firebird não é publicado diretamente na Internet.
- Backend fica em `127.0.0.1:3000`; Caddy é a porta pública.

## Inicialização
1. Copie `.env.example` para `.env` e preencha os secrets.
2. Aponte o DNS de `API_DOMAIN` para o servidor.
3. Execute `docker compose up -d`.
4. Aplique as migrações/schema do repositório ao Firebird.
5. Verifique `https://<API_DOMAIN>/ready`.
6. Configure `BACKEND_URL` no Worker com `https://<API_DOMAIN>`.

O compose não executa migrações automaticamente para evitar alterações destrutivas no banco existente.
