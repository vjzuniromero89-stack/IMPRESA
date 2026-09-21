-- IMPRESA / PrintControl
-- Migración inicial reconstruible para Supabase
-- Capital inicial US$4,100 = dato histórico informativo.
-- Valor real del negocio = inventario + bancos + efectivo.
-- Ganancia/pérdida mensual se compara contra el cierre anterior.
-- Ventas y gastos son registros informativos.

create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'Nicaragua',
  base_currency text not null default 'NIO',
  initial_capital_usd numeric(14,2) not null default 4100,
  exchange_rate numeric(14,6) not null default 37,
  created_at timestamptz not null default now()
);

create table if not exists public.business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('owner','admin','employee','accountant','viewer')),
  unique(business_id,user_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sku text,
  name text not null,
  category text,
  stock numeric(14,3) not null default 0,
  unit_cost_cordobas numeric(14,2) not null default 0,
  currency text not null default 'NIO' check(currency in ('NIO','USD')),
  created_at timestamptz not null default now()
);

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  type text not null check(type in ('bank','cash')),
  currency text not null check(currency in ('NIO','USD')),
  balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  description text,
  amount numeric(14,2) not null default 0,
  currency text not null check(currency in ('NIO','USD')),
  exchange_rate numeric(14,6) not null default 37,
  sale_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null,
  description text,
  amount numeric(14,2) not null default 0,
  currency text not null check(currency in ('NIO','USD')),
  exchange_rate numeric(14,6) not null default 37,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_inventory (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  month text not null,
  product_name text not null,
  category text,
  quantity numeric(14,3) not null default 0,
  unit_value_cordobas numeric(14,2) not null default 0,
  currency text not null default 'NIO' check(currency in ('NIO','USD')),
  entered_unit_value numeric(14,2),
  created_at timestamptz not null default now()
);

create table if not exists public.month_closes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  month text not null,
  closed_at timestamptz not null default now(),
  exchange_rate numeric(14,6) not null,
  inventory_cordobas numeric(14,2) not null default 0,
  bank_cash_cordobas numeric(14,2) not null default 0,
  current_value_cordobas numeric(14,2) not null default 0,
  previous_close_value_cordobas numeric(14,2),
  result_cordobas numeric(14,2) not null default 0,
  sales_info_cordobas numeric(14,2) not null default 0,
  expenses_info_cordobas numeric(14,2) not null default 0,
  notes text,
  unique(business_id,month)
);

create index if not exists idx_products_business on public.products(business_id);
create index if not exists idx_accounts_business on public.financial_accounts(business_id);
create index if not exists idx_sales_business_date on public.sales(business_id,sale_date);
create index if not exists idx_expenses_business_date on public.expenses(business_id,expense_date);
create index if not exists idx_inventory_business_month on public.monthly_inventory(business_id,month);
create index if not exists idx_closes_business_month on public.month_closes(business_id,month);

alter table public.businesses enable row level security;
alter table public.business_users enable row level security;
alter table public.products enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.monthly_inventory enable row level security;
alter table public.month_closes enable row level security;

grant select,insert,update,delete on public.businesses,public.business_users,public.products,
  public.financial_accounts,public.sales,public.expenses,public.monthly_inventory,public.month_closes
  to authenticated;

drop policy if exists business_member_select on public.businesses;
create policy business_member_select on public.businesses for select to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=businesses.id and bu.user_id=(select auth.uid())));

drop policy if exists business_member_data on public.products;
create policy business_member_data on public.products for all to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=products.business_id and bu.user_id=(select auth.uid())))
with check (exists(select 1 from public.business_users bu where bu.business_id=products.business_id and bu.user_id=(select auth.uid())));

-- Nota:
-- US$4,100 NO se usa para generar pérdida automática.
-- En el primer cierre: previous_close_value_cordobas = current_value_cordobas y result_cordobas = 0.
-- Desde el segundo cierre: result_cordobas = current_value_cordobas - previous_close_value_cordobas.
