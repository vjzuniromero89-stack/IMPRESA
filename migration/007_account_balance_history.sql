-- IMPRESA / 007 — historial de saldos en "Banco y Efectivo"
--
-- Qué hace esta migración:
-- Crea la tabla "account_balance_history": cada vez que se actualiza el
-- saldo de una cuenta (BAC Dólares, BAC Córdobas, Efectivo o cualquier
-- otra cuenta creada), la app guarda el saldo anterior, el saldo nuevo,
-- la fecha y quién lo hizo. Así queda un registro permanente de cada
-- cambio, visible desde el botón "Historial" de cada cuenta.
--
-- Igual que "activity_log", nadie puede editar ni borrar este historial
-- (no se crean políticas de update ni delete a propósito), para que quede
-- a prueba de manipulación.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).
-- Requiere haber corrido antes 001 y 002 (financial_accounts ya debe existir).

create table if not exists public.account_balance_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete cascade,
  account_name text not null default '',
  currency text not null default 'NIO' check(currency in ('NIO','USD')),
  previous_balance numeric(14,2) not null default 0,
  new_balance numeric(14,2) not null default 0,
  changed_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_account_balance_history_business on public.account_balance_history(business_id, account_id, created_at desc);

alter table public.account_balance_history enable row level security;

-- La app ya trabaja con acceso abierto (sin inicio de sesión de Supabase,
-- ver migration/005_open_access.sql), así que esta tabla se crea abierta
-- desde el principio, igual que "app_users".
grant select, insert on public.account_balance_history to anon, authenticated;

drop policy if exists account_balance_history_select on public.account_balance_history;
create policy account_balance_history_select on public.account_balance_history for select to public using (true);

drop policy if exists account_balance_history_insert on public.account_balance_history;
create policy account_balance_history_insert on public.account_balance_history for insert to public with check (true);
