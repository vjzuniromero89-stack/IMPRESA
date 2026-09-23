-- IMPRESA / 013 — Inventario inicial (mes base para comparar contra el inventario actual)
--
-- Guarda cuál mes de Inventario marcaste como "Inventario Inicial" (tu punto
-- de partida). Solo puede haber uno por negocio a la vez — al marcar uno
-- nuevo, reemplaza al anterior.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).

alter table public.businesses add column if not exists inventory_baseline_month text;

notify pgrst, 'reload schema';
