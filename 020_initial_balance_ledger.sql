-- IMPRESA / 020 — saldo inicial como movimiento bancario real
-- Ejecutar UNA sola vez después de 019_clean_bank_ledger.sql.
--
-- Objetivos:
-- 1) Recuperar el saldo inicial de cuentas que ya tienen dinero pero cuyo historial
--    quedó vacío por versiones anteriores.
-- 2) Garantizar un solo "Saldo inicial" por cuenta.
-- 3) Guardar futuros saldos iniciales de forma atómica: cuenta + historial juntos.

begin;

alter table public.account_balance_history add column if not exists description text;
alter table public.account_balance_history add column if not exists source_type text;
alter table public.account_balance_history add column if not exists source_id uuid;
alter table public.account_balance_history add column if not exists transaction_date date;

-- Normalizar posibles registros antiguos que ya representaban saldo inicial.
update public.account_balance_history
   set source_type='initial_balance',
       description=coalesce(nullif(description,''),'Saldo inicial'),
       transaction_date=coalesce(transaction_date,created_at::date)
 where source_type is null
   and (coalesce(description,'') ilike '%saldo inicial%'
        or coalesce(changed_by,'') ilike '%saldo inicial%');

-- Si por versiones anteriores quedaron varios saldos iniciales para la misma cuenta,
-- conservar únicamente el más reciente.
with ranked as (
  select id,
         row_number() over(partition by account_id order by created_at desc,id desc) as rn
    from public.account_balance_history
   where source_type='initial_balance'
)
delete from public.account_balance_history h
 using ranked r
 where h.id=r.id and r.rn>1;

-- Reconstruir el saldo inicial faltante:
-- saldo inicial = saldo actual - suma neta de todos los movimientos conocidos.
with movement_totals as (
  select a.id as account_id,
         a.business_id,
         a.name,
         a.currency,
         a.balance,
         a.updated_at,
         coalesce(sum(case when h.source_type is distinct from 'initial_balance'
                           then h.new_balance-h.previous_balance else 0 end),0) as net_movement,
         min(h.transaction_date) as first_tx_date,
         min(h.created_at) as first_created_at
    from public.financial_accounts a
    left join public.account_balance_history h on h.account_id=a.id
   group by a.id,a.business_id,a.name,a.currency,a.balance,a.updated_at
), missing as (
  select m.*,
         round((m.balance-m.net_movement)::numeric,2) as opening_balance
    from movement_totals m
   where not exists(
     select 1 from public.account_balance_history h
      where h.account_id=m.account_id and h.source_type='initial_balance'
   )
)
insert into public.account_balance_history(
  id,business_id,account_id,account_name,currency,
  previous_balance,new_balance,changed_by,description,
  source_type,source_id,transaction_date,created_at
)
select gen_random_uuid(),m.business_id,m.account_id,m.name,m.currency,
       0,m.opening_balance,'Sistema · Saldo inicial','Saldo inicial',
       'initial_balance',null,
       coalesce(m.first_tx_date,m.updated_at::date,current_date),
       coalesce(m.first_created_at-interval '1 second',m.updated_at,now())
  from missing m
 where abs(m.opening_balance)>=0.005;

create unique index if not exists uq_account_history_one_initial
  on public.account_balance_history(account_id)
  where source_type='initial_balance';

-- Guardar/reemplazar el saldo inicial como una operación atómica.
-- Si ya existen ventas, gastos o transferencias, NO se pierden: el saldo actual
-- queda como saldo inicial + movimiento neto posterior.
create or replace function public.impresa_set_initial_balance(
  p_business_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_changed_by text default 'Sistema'
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  acct public.financial_accounts%rowtype;
  net_movement numeric:=0;
  new_current numeric:=0;
  first_tx_date date;
  first_created timestamptz;
begin
  if p_amount is null or p_amount<0 then
    raise exception 'El saldo inicial no puede ser negativo.';
  end if;

  select * into acct
    from public.financial_accounts
   where id=p_account_id and business_id=p_business_id
   for update;

  if not found then
    raise exception 'La cuenta seleccionada no pertenece a este negocio.';
  end if;

  select coalesce(sum(new_balance-previous_balance),0),
         min(transaction_date),min(created_at)
    into net_movement,first_tx_date,first_created
    from public.account_balance_history
   where business_id=p_business_id
     and account_id=p_account_id
     and source_type is distinct from 'initial_balance';

  delete from public.account_balance_history
   where business_id=p_business_id
     and account_id=p_account_id
     and source_type='initial_balance';

  new_current:=round((p_amount+net_movement)::numeric,2);

  update public.financial_accounts
     set balance=new_current,updated_at=now()
   where id=p_account_id and business_id=p_business_id;

  if abs(p_amount)>=0.005 then
    insert into public.account_balance_history(
      id,business_id,account_id,account_name,currency,
      previous_balance,new_balance,changed_by,description,
      source_type,source_id,transaction_date,created_at
    ) values(
      gen_random_uuid(),p_business_id,p_account_id,acct.name,acct.currency,
      0,round(p_amount::numeric,2),coalesce(nullif(p_changed_by,''),'Sistema · Saldo inicial'),'Saldo inicial',
      'initial_balance',null,
      coalesce(first_tx_date,current_date),
      coalesce(first_created-interval '1 second',now())
    );
  end if;
end;
$$;

grant execute on function public.impresa_set_initial_balance(uuid,uuid,numeric,text) to anon,authenticated;

notify pgrst, 'reload schema';
commit;
