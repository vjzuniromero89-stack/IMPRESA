-- IMPRESA / 011 — nota libre en cada producto del Inventario
--
-- Algunos Excel de inventario traen columnas extra que la app no usa
-- directamente para calcular nada (por ejemplo "Fecha" de conteo o
-- "Faltante"). Para que esa información no se pierda al importar el
-- archivo, se agrega una columna "note" de texto libre donde se guarda
-- ese dato adicional. Se ve como un pequeño ícono junto al producto, con
-- el texto al pasar el mouse encima — no cambia las columnas de la tabla.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).

alter table public.monthly_inventory add column if not exists note text;

notify pgrst, 'reload schema';
