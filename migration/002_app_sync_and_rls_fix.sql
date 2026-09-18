-- IMPRESA / 002 — conectar la app real a Supabase
--
-- Qué hace esta migración:
-- 1) Agrega las columnas y tablas que la app usa y que 001 no tenía
--    (cliente y abonos en ventas, cotizaciones, notas de inventario,
--    datos completos del cierre de mes, situación inicial del negocio).
-- 2) IMPORTANTE: en 001 casi todas las tablas quedaron con RLS activado
--    pero SIN ninguna política (solo "products" tenía una). Eso significa
--    que, aunque conectes la app con un usuario logueado, Postgres niega
--    todo acceso por defecto. Esta migración agrega las políticas que
--    faltaban para que cada usuario pueda leer/escribir SOLO los datos
--    de su propio negocio.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).

-- ---------- Ventas: cliente + seguimiento de pagos ----------
alter table public.sales add column if not exists client text not null default '';
alter table public.sales add column if not exists entered_amount numeric(14,2);
alter table public.sales add column if not exists status text not null default 'Pendiente';
alter table public.sales add column if not exists paid_amount numeric(14,2) not null default 0;

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  amount numeric(14,2) not null default 0,
  payment_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sale_payments_sale on public.sale_payments(sale_id);

-- ---------- Gastos: valor originalmente ingresado ----------
alter table public.expenses add column if not exists entered_amount numeric(14,2);

-- ---------- Negocio: situación inicial confirmada ----------
alter table public.businesses add column if not exists initial_base_confirmed boolean not null default false;
alter table public.businesses add column if not exists initial_base_confirmed_at timestamptz;
alter table public.businesses add column if not exists initial_base_cordobas numeric(14,2);

-- ---------- Cierres de mes: columnas que usa la app ----------
alter table public.month_closes add column if not exists opening_cordobas numeric(14,2);
alter table public.month_closes add column if not exists debt_payments_cordobas numeric(14,2) not null default 0;
alter table public.month_closes add column if not exists carry_forward_cordobas numeric(14,2);
alter table public.month_closes add column if not exists debt_notes text;
alter table public.month_closes add column if not exists pre_close_cordobas numeric(14,2);
alter table public.month_closes add column if not exists debt_payment_details jsonb not null default '[]'::jsonb;

-- ---------- Notas del inventario mensual (una por mes) ----------
create table if not exists public.inventory_month_notes (
  business_id uuid not null references public.businesses(id) on delete cascade,
  month text not null,
  notes text,
  primary key(business_id, month)
);

-- ---------- Cotizaciones ----------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client text not null default '',
  description text,
  amount numeric(14,2) not null default 0,
  currency text not null default 'NIO' check(currency in ('NIO','USD')),
  exchange_rate numeric(14,6) not null default 37,
  entered_amount numeric(14,2),
  status text not null default 'Borrador',
  quote_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_quotes_business on public.quotes(business_id);

alter table public.sale_payments enable row level security;
alter table public.inventory_month_notes enable row level security;
alter table public.quotes enable row level security;

grant select,insert,update,delete on public.sale_payments, public.quotes, public.inventory_month_notes to authenticated;

-- ---------- Políticas de seguridad (RLS) ----------
-- Cada usuario solo puede ver/editar su propia membresía.
drop policy if exists business_member_self on public.business_users;
create policy business_member_self on public.business_users for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists business_member_join on public.business_users;
create policy business_member_join on public.business_users for insert to authenticated
with check (user_id = (select auth.uid()));

-- Un usuario autenticado puede crear un negocio (lo hace la app la primera
-- vez que inicia sesión) y luego solo puede actualizar los negocios donde
-- ya es miembro.
drop policy if exists business_create on public.businesses;
create policy business_create on public.businesses for insert to authenticated
with check (true);

drop policy if exists business_member_update on public.businesses;
create policy business_member_update on public.businesses for update to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=businesses.id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=businesses.id and bu.user_id=(select auth.uid())));

-- Patrón repetido: solo miembros del negocio pueden leer/escribir sus datos.
drop policy if exists business_member_data on public.financial_accounts;
create policy business_member_data on public.financial_accounts for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=financial_accounts.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=financial_accounts.business_id and bu.user_id=(select auth.uid())));

drop policy if exists business_member_data on public.sales;
create policy business_member_data on public.sales for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=sales.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=sales.business_id and bu.user_id=(select auth.uid())));

drop policy if exists business_member_data on public.expenses;
create policy business_member_data on public.expenses for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=expenses.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=expenses.business_id and bu.user_id=(select auth.uid())));

drop policy if exists business_member_data on public.monthly_inventory;
create policy business_member_data on public.monthly_inventory for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=monthly_inventory.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=monthly_inventory.business_id and bu.user_id=(select auth.uid())));

drop policy if exists business_member_data on public.month_closes;
create policy business_member_data on public.month_closes for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=month_closes.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=month_closes.business_id and bu.user_id=(select auth.uid())));

drop policy if exists business_member_data on public.quotes;
create policy business_member_data on public.quotes for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=quotes.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=quotes.business_id and bu.user_id=(select auth.uid())));

drop policy if exists business_member_data on public.inventory_month_notes;
create policy business_member_data on public.inventory_month_notes for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=inventory_month_notes.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=inventory_month_notes.business_id and bu.user_id=(select auth.uid())));

drop policy if exists sale_payments_member on public.sale_payments;
create policy sale_payments_member on public.sale_payments for all to authenticated
using (exists(select 1 from public.sales s join public.business_users bu on bu.business_id=s.business_id where s.id=sale_payments.sale_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.sales s join public.business_users bu on bu.business_id=s.business_id where s.id=sale_payments.sale_id and bu.user_id=(select auth.uid())));

-- Nota: la política de "products" ya existía desde 001 y sigue igual;
-- esa tabla no la usa todavía la app (el inventario usa monthly_inventory).
