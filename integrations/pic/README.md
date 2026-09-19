# PIC

Recommended topology: PIC -> UART / RS-485 / CAN -> gateway -> HTTPS/JSON -> Zynkronyx Gateway.

The gateway owns TLS, HTTP, credential storage, retries and JSON serialization. The PIC owns deterministic acquisition and sequence generation.

Never put tenant API keys or device credentials into source-controlled firmware images.
