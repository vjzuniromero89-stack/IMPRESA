-- IMPRESA / 005 — acceso abierto (se quita el inicio de sesión)
--
-- Qué hace esta migración:
-- 1) Quita el requisito de haber iniciado sesión para leer/escribir los
--    datos del negocio: todas las políticas de seguridad (RLS) que exigían
--    "ser miembro autenticado del negocio" se reemplazan por políticas
--    abiertas, y se agrega el permiso también al rol "anon" (visitante sin
--    sesión), porque la app ya no pide usuario ni contraseña para entrar.
-- 2) Crea la tabla "app_users": un listado simple de nombres (dueño,
--    empleados) SIN contraseña, solo para que la pestaña "Usuarios" pueda
--    anotar quién hizo cada cosa en el registro de actividad. No tiene
--    ninguna relación con Supabase Auth ni con la tabla anterior
--    "business_users" (esa tabla queda sin usarse, no hace falta borrarla).
--
-- IMPORTANTE: después de correr esto, cualquier persona con el link de la
-- app (o con la llave pública/anon de tu proyecto) puede ver y modificar
-- los datos del negocio, sin que se le pida contraseña. Es exactamente lo
-- que se pidió: quitar el inicio de sesión por completo.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).
-- Requiere haber corrido antes 001, 002, 003 y 004.

-- ---------- Nueva tabla: lista de usuarios (sin contraseña) ----------
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  role text not null default 'empleado' check(role in ('owner','empleado')),
  created_at timestamptz not null default now()
);
create index if not exists idx_app_users_business on public.app_users(business_id);

alter table public.app_users enable row level security;
grant select, insert, update, delete on public.app_users to anon, authenticated;

drop policy if exists app_users_open on public.app_users;
create policy app_users_open on public.app_users for all to public using (true) with check (true);

-- ---------- Abrir el acceso en todas las tablas del negocio ----------
-- Se agrega el permiso de tabla también para "anon" (antes solo lo tenía
-- "authenticated"), y se reemplaza cada política basada en auth.uid()/
-- business_users por una política abierta por tabla.

grant select, insert, update, delete on
  public.businesses, public.business_users, public.products,
  public.financial_accounts, public.sales, public.expenses,
  public.monthly_inventory, public.month_closes, public.sale_payments,
  public.inventory_month_notes, public.quotes, public.activity_log,
  public.debts, public.debt_payments
  to anon, authenticated;

drop policy if exists business_member_select on public.businesses;
drop policy if exists business_create on public.businesses;
drop policy if exists business_member_update on public.businesses;
drop policy if exists businesses_open on public.businesses;
create policy businesses_open on public.businesses for all to public using (true) with check (true);

drop policy if exists business_member_self on public.business_users;
drop policy if exists business_member_join on public.business_users;
drop policy if exists business_owner_invite on public.business_users;
drop policy if exists business_users_open on public.business_users;
create policy business_users_open on public.business_users for all to public using (true) with check (true);

drop policy if exists business_member_data on public.products;
drop policy if exists products_open on public.products;
create policy products_open on public.products for all to public using (true) with check (true);

drop policy if exists business_member_data on public.financial_accounts;
drop policy if exists financial_accounts_open on public.financial_accounts;
create policy financial_accounts_open on public.financial_accounts for all to public using (true) with check (true);

drop policy if exists business_member_data on public.sales;
drop policy if exists sales_open on public.sales;
create policy sales_open on public.sales for all to public using (true) with check (true);

drop policy if exists business_member_data on public.expenses;
drop policy if exists expenses_open on public.expenses;
create policy expenses_open on public.expenses for all to public using (true) with check (true);

drop policy if exists business_member_data on public.monthly_inventory;
drop policy if exists monthly_inventory_open on public.monthly_inventory;
create policy monthly_inventory_open on public.monthly_inventory for all to public using (true) with check (true);

drop policy if exists business_member_data on public.month_closes;
drop policy if exists month_closes_open on public.month_closes;
create policy month_closes_open on public.month_closes for all to public using (true) with check (true);

drop policy if exists sale_payments_member on public.sale_payments;
drop policy if exists sale_payments_open on public.sale_payments;
create policy sale_payments_open on public.sale_payments for all to public using (true) with check (true);

drop policy if exists business_member_data on public.inventory_month_notes;
drop policy if exists inventory_month_notes_open on public.inventory_month_notes;
create policy inventory_month_notes_open on public.inventory_month_notes for all to public using (true) with check (true);

drop policy if exists business_member_data on public.quotes;
drop policy if exists quotes_open on public.quotes;
create policy quotes_open on public.quotes for all to public using (true) with check (true);

drop policy if exists business_member_activity_select on public.activity_log;
drop policy if exists business_member_activity_insert on public.activity_log;
drop policy if exists activity_log_open on public.activity_log;
create policy activity_log_open on public.activity_log for all to public using (true) with check (true);

drop policy if exists business_member_data on public.debts;
drop policy if exists debts_open on public.debts;
create policy debts_open on public.debts for all to public using (true) with check (true);

drop policy if exists business_member_data on public.debt_payments;
drop policy if exists debt_payments_open on public.debt_payments;
create policy debt_payments_open on public.debt_payments for all to public using (true) with check (true);
