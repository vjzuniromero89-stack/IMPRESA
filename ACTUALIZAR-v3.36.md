# IMPRESA v3.36 — Inventario conectado a Ventas

Antes de publicar esta versión, ejecuta **una sola vez** en Supabase SQL Editor:

`migration/016_inventory_sales_stock_and_lists.sql`

Esta migración no borra registros. Agrega códigos/SKU al inventario existente, campos de producto a Ventas, la lista configurable de formas de pago de Gastos y el trigger que descuenta/restaura existencias automáticamente.

## Comportamiento
- Inventario: cada línea tiene Código/SKU. Los registros existentes reciben IMP-0001, IMP-0002, etc.
- Ventas: puedes elegir un producto del inventario del mes. Se muestran código, categoría, talla, color, existencia y cantidad vendida.
- Al registrar una venta enlazada a inventario, Supabase descuenta la cantidad de forma transaccional.
- Al editar la cantidad/producto, devuelve la cantidad anterior y descuenta la nueva.
- Al borrar una venta, restaura la existencia.
- Las ventas de servicios/trabajos pueden seguir registrándose sin producto de inventario.
- Gastos: Forma de pago usa una lista administrable con botón +; puedes agregar nuevas opciones y elegir la cuenta real de salida.
