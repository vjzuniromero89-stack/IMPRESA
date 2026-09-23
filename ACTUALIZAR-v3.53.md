# IMPRESA v3.53 — moneda de operación vs moneda de cuenta

Antes de publicar esta versión, ejecuta una sola vez `migration/021_transaction_currency_separation.sql` en Supabase SQL Editor.

La venta conserva su moneda y el pago conserva también el importe real que entra a la cuenta. Cada pago congela su tipo de cambio. Ejemplo: venta C$370, pago C$296 a BAC Dollar con TC 37 = US$8 que realmente entran al banco. Los abonos usan la tasa vigente en el momento de cada abono.

La misma regla se aplica a gastos: el gasto conserva su moneda y la cuenta registra la salida en su propia moneda. Los historiales bancarios muestran el importe real de la cuenta.
