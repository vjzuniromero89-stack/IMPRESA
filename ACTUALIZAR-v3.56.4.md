# IMPRESA v3.56.4

## Control de dinero: descripción y cuenta separadas

- El historial de **Control de dinero** ahora tiene una columna **Cuenta** independiente.
- **Descripción** muestra solamente qué ocurrió: venta, gasto, abono o transferencia.
- **Cuenta** muestra por separado dónde entró o salió el dinero: BAC Dollar, BAC Córdobas, Efectivo, etc.
- El saldo inicial indica **Todas las cuentas**.
- Se conserva la lógica existente de entradas verdes, salidas rojas, transferencias informativas y saldo consolidado C$ / US$.
- No requiere migración nueva de Supabase.
