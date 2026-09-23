-- IMPRESA / 010 — Talla y Color en Inventario, para poder registrar el
-- inventario igual que en tu Excel (Detalle, Talla, Color, Cantidad,
-- Precio, Total).
--
-- Solo agrega dos columnas nuevas ("talla" y "color") a la tabla que ya
-- tenías de inventario mensual. No borra ni cambia ningún producto ya
-- guardado — a los productos que ya tenías, estas dos columnas les quedan
-- vacías, y puedes completarlas editándolos o volviéndolos a registrar.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).

alter table public.monthly_inventory add column if not exists talla text;
alter table public.monthly_inventory add column if not exists color text;

notify pgrst, 'reload schema';
