# LGPD — Privacy by Design

O Zynkronyx trata proteção de dados como requisito arquitetural.

Regras: coletar somente o necessário; definir finalidade; separar dados pessoais e operacionais; menor privilégio; isolamento por tenant; reduzir precisão de localização; auditar acessos relevantes; retenção configurável; anonimização quando aplicável; nunca colocar segredos em logs; proteger exportações.

O sistema não presume consentimento como única base legal. A base aplicável depende da finalidade e deve ser definida pelo responsável pelo tratamento.

Localização de dispositivo pode ser dado pessoal quando associável a uma pessoa. Por isso o Radar usa precisão reduzida por padrão e não mantém histórico por padrão.

Logs devem evitar payload pessoal desnecessário. Retenção não é hard-coded: é configurável por finalidade, contrato e obrigação aplicável.
