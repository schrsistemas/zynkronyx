# Zynkronyx Device Simulator

Perfis: arduino, raspberry-pi, pic, android, ios.

Cenários: normal, duplicate, out-of-order, delayed, offline, invalid-payload, unauthorized, retry, clock-skew.

A mesma seed/configuração produz os mesmos eventos. Exemplo:

    simulator --profile raspberry-pi --scenario offline --count 100 --seed 42

Simulador aponta para teste por padrão e marca eventos simulados.
