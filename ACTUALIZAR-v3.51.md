# IMPRESA v3.51 — Historial bancario limpio y general multimoneda

## IMPORTANTE: paso obligatorio en Supabase
Antes de publicar esta versión, abre **Supabase → SQL Editor** y ejecuta completo:

`migration/019_clean_bank_ledger.sql`

Esta migración corrige el doble registro que existía entre la app y los triggers anteriores, limpia las líneas antiguas de ventas/gastos duplicadas y reconstruye una sola línea por cada venta cobrada o gasto que todavía existe.

## Qué cambia

- El historial individual de cada banco/caja usa formato de estado de cuenta: Fecha, Descripción, Depósitos/Créditos, Retiros/Débitos y Saldo final.
- Si borras una venta o un gasto, se restaura el saldo pero su movimiento desaparece del historial. Ya no aparece una línea de “reversión”.
- Ventas y gastos ya no ajustan el saldo dos veces: Supabase es la única fuente para esos movimientos y la app recarga el saldo después de guardar.
- El historial general usa el mismo formato bancario y agrega la cuenta de origen/destino.
- En el historial general los córdobas y dólares se mantienen separados. Se muestra el saldo general en C$ y US$ después de cada movimiento; arriba se muestra el total consolidado convertido al tipo de cambio actual.
- El botón **Borrar cuenta** se quitó de Banco y Efectivo. Ahora solamente existe en **Configuración**, junto con Saldo inicial.
- Saldo inicial queda identificado claramente como “Saldo inicial” en el historial.
