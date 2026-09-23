# IMPRESA v3.35 — Gastos descontados de Banco / Efectivo

## Antes de publicar
Ejecuta una sola vez en Supabase SQL Editor el archivo:
`migration/015_expense_payment_source_and_auto_deduction.sql`

## Cambios
- Cada gasto ahora selecciona **Forma de pago**: Efectivo o Transferencia / BAC.
- Según la moneda (C$ o US$) se muestran únicamente las cuentas compatibles.
- Al guardar el gasto, Supabase descuenta automáticamente el importe de la cuenta seleccionada.
- Si editas un gasto, primero devuelve el importe anterior y luego aplica el nuevo.
- Si borras un gasto, el importe vuelve a la cuenta de origen.
- Se valida saldo suficiente.
- El historial muestra Forma, Cuenta e Importe original.
- Resumen superior separado: Efectivo C$, Efectivo US$, BAC C$, BAC US$.
- Los gastos viejos quedan como “Sin clasificar” hasta que los edites; no se alteran automáticamente.

## Importante
Para el flujo solicitado crea/mantén estas cuatro cuentas en **Banco y Efectivo**: BAC Córdobas (C$), BAC Dólares (US$), Efectivo Córdobas (C$), Efectivo Dólares (US$).
