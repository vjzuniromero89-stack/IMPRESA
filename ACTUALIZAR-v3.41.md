# IMPRESA v3.41 — sistema conectado

1. Ejecuta en Supabase SQL Editor: `migration/018_automatic_cashflow_sales_accounts.sql`.
2. Luego sube/reemplaza todos los archivos del ZIP en GitHub.
3. Cloudflare debe construir la versión 3.41.0.

Cambios principales:
- Ventas ya no usa “Transferencia/Efectivo” como destino. Usa directamente todas las cuentas de Banco y Efectivo.
- Una cuenta nueva aparece automáticamente en Ventas y en Cobros por cuenta.
- Pago inicial y abonos aumentan automáticamente el saldo de la cuenta elegida.
- Al borrar una venta, sus cobros se revierten y el inventario vendido se restaura.
- Productos de inventario se descuentan en vivo por código/producto/cantidad mediante la migración 017 existente.
- Gastos siguen descontándose de la cuenta exacta elegida.
- Control de dinero compara saldo inicial + cobros - gastos contra el dinero real de todas las cuentas.
- El historial de cobros muestra la cuenta destino exacta.
