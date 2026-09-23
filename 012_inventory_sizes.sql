-- IMPRESA / 012 — lista guardada de tallas para Inventario
--
-- Igual que las categorías y los métodos de pago, las tallas ahora se eligen
-- de una lista guardada (con botón "+" para agregar tallas nuevas), en vez
-- de escribirse a mano cada vez — así se evita que alguien la escriba mal.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).

alter table public.businesses add column if not exists inventory_sizes text[] not null default array['XS','S','M','L','XL','XXL','2','4','6','8','10','12','14','16'];

notify pgrst, 'reload schema';
