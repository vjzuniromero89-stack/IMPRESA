-- IMPRESA / 004 — pestaña Deudas
--
-- Qué hace esta migración:
-- 1) Crea la tabla "debts" (la lista de deudas: máquinas, préstamos, etc.)
-- 2) Crea la tabla "debt_payments" (cada abono que se le hace a una deuda,
--    ya sea registrado a mano al crear la deuda o durante el Cierre de mes).
-- 3) Agrega las políticas de seguridad (RLS) para que solo los miembros del
--    negocio puedan ver/editar sus propias deudas y pagos.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).
-- Requiere haber corrido antes 001, 002 y 003.

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  description text not null default '',
  total_amount numeric(14,2) not null default 0,
  currency text not null default 'NIO' check(currency in ('NIO','USD')),
  exchange_rate numeric(14,6) not null default 37,
  entered_total numeric(14,2),
  affects_percent boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_debts_business on public.debts(business_id);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  month text,
  account_id uuid,
  account_name text,
  currency text not null default 'NIO' check(currency in ('NIO','USD')),
  amount numeric(14,2) not null default 0,
  equivalent_cordobas numeric(14,2) not null default 0,
  note text,
  paid_at timestamptz not null default now()
);
create index if not exists idx_debt_payments_debt on public.debt_payments(debt_id);
create index if not exists idx_debt_payments_business on public.debt_payments(business_id);

alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
grant select, insert, update, delete on public.debts, public.debt_payments to authenticated;

drop policy if exists business_member_data on public.debts;
create policy business_member_data on public.debts for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=debts.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=debts.business_id and bu.user_id=(select auth.uid())));

drop policy if exists business_member_data on public.debt_payments;
create policy business_member_data on public.debt_payments for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=debt_payments.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=debt_payments.business_id and bu.user_id=(select auth.uid())));
