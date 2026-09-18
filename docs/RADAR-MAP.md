# Mapa Radar

Exibe dispositivos ativos e seu último ponto conhecido.

## Privacidade
A API retorna localização coarse por padrão, reduzindo latitude/longitude para duas casas decimais. Isso é redução de precisão, não uma garantia jurídica de anonimização.

Precisão exata só deve ser exposta a função autorizada e justificada pelo propósito operacional.

O mapa não mostra endereço residencial nem histórico de deslocamento por padrão.

## Dados
device_id, tipo, nome, status, última comunicação, última localização, precisão e timestamp da atualização.

## LGPD by design
Finalidade definida, minimização, controle por tenant, precisão reduzida, retenção configurável, trilha de acesso e exportação controlada.

Modos: coarse para operação ampla; precise somente após autorização explícita no middleware.

Próximas camadas: geofencing, trilha temporal opcional, alertas offline e telemetria.
