-- IMPRESA / 009 — categorías de Inventario y métodos de pago personalizables
--
-- Hasta ahora, las categorías de Inventario y los métodos de pago de Ventas
-- (Transferencia / Efectivo) eran una lista fija escrita en el código. Ahora
-- se puede agregar más desde la propia app (botón "+"), así que:
--
-- 1) Se agregan tres columnas a "businesses" para guardar esas listas en la
--    nube (para que se vean igual en cualquier dispositivo). Si ya tenías
--    categorías o métodos personalizados, esto NO los borra: solo agrega la
--    columna con la lista de fábrica como valor inicial.
-- 2) Se quita el límite ("check") que solo dejaba guardar "Transferencia" o
--    "Efectivo" como método de pago en Ventas, para poder guardar cualquier
--    método nuevo que agregues.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).
-- Requiere haber corrido antes 007 y la migración de métodos de pago de
-- Ventas (archivo "supabase/migrations/20260921135236_sales_payment_methods.sql").

alter table public.businesses add column if not exists inventory_categories text[] not null default array['Camisas','Hilos','Tintas','Vinil','Sublimación','Empaque','Otros'];
alter table public.businesses add column if not exists payment_methods text[] not null default array['Transferencia','Efectivo'];

alter table public.sales drop constraint if exists sales_payment_method_check;
alter table public.sale_payments drop constraint if exists sale_payments_payment_method_check;

notify pgrst, 'reload schema';
