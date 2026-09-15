# IMPRESA v3.2.1 — Corrección de compilación

Corrige el tipo `Sale` para el sistema de pagos parciales:
- `paid`, `payments`, `method` y `note` ahora forman parte del tipo.
- Se conserva `description`, `currency`, `enteredAmount` y `status` del modelo existente.
- Nuevas ventas actualizan automáticamente su estado.
- Los abonos actualizan el estado a Pago parcial o Pagado.
- Mantiene todas las mejoras visuales y funcionales de v3.2.0.
