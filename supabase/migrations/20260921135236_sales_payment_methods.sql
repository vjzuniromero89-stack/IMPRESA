-- IMPRESA 3.23 — Ejecutar antes de publicar la nueva aplicación.
-- Solo añade campos; conserva registros, políticas y permisos existentes.
begin;
alter table public.sales add column if not exists payment_method text
  check (payment_method in ('Transferencia','Efectivo'));
alter table public.sale_payments add column if not exists payment_method text
  check (payment_method in ('Transferencia','Efectivo'));
notify pgrst, 'reload schema';
commit;
