-- IMPRESA / 014 — categorías de Gastos personalizables
--
-- Hasta ahora, la categoría de Gastos (Materiales, Operativo, Servicios,
-- Transporte, Nómina, Publicidad, Equipos, Otro) era una lista fija escrita
-- en el código, sin forma de agregar ni borrar categorías. Ahora funciona
-- igual que Categoría de Inventario y Método de pago de Ventas: se agrega
-- una columna a "businesses" para guardar la lista en la nube (para que se
-- vea igual en cualquier dispositivo). Si ya tenías gastos con categorías,
-- esto NO los borra: solo agrega la columna con la lista de fábrica como
-- valor inicial.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).
-- Es seguro correrlo más de una vez (no hace nada si la columna ya existe).

alter table public.businesses add column if not exists expense_categories text[] not null default array['Materiales','Operativo','Servicios','Transporte','Nómina','Publicidad','Equipos','Otro'];

notify pgrst, 'reload schema';
