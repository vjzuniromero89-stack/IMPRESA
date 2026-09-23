-- IMPRESA / 019 — libro bancario limpio (estilo estado de cuenta)
-- IMPORTANTE: ejecutar UNA sola vez en Supabase SQL Editor antes de publicar v3.51.
--
-- Corrige el problema de movimientos duplicados que ocurría porque Ventas/Gastos
-- ajustaban el saldo en la app y también mediante triggers de Supabase.
-- A partir de esta migración Supabase es la única fuente que ajusta saldos para
-- ventas y gastos. El historial guarda una sola línea por movimiento real.
-- Si una venta/gasto se borra, se revierte el saldo pero se ELIMINA su línea del
-- historial en lugar de crear una línea de "reverso".

begin;

alter table public.account_balance_history add column if not exists description text;
alter table public.account_balance_history add column if not exists source_type text;
alter table public.account_balance_history add column if not exists source_id uuid;
alter table public.account_balance_history add column if not exists transaction_date date;

create index if not exists idx_account_balance_history_transaction_date
  on public.account_balance_history(business_id, transaction_date desc, created_at desc);

-- Las versiones anteriores podían escribir DOS líneas de historial para una venta
-- (una desde Supabase y otra desde la interfaz), aunque el saldo final quedaba
-- correcto porque la interfaz guardaba el mismo saldo absoluto calculado por el
-- trigger. Por eso aquí NO se modifica ningún saldo existente: solo se limpia y
-- reconstruye el historial de ventas/gastos.

-- Detener la lógica vieja antes de reconstruir el libro.
drop trigger if exists trg_impresa_sale_payment_account_delta on public.sale_payments;
drop trigger if exists trg_impresa_expense_account_delta on public.expenses;

-- Limpiar solamente líneas antiguas de ventas/gastos y sus reversos.
-- Se conservan saldo inicial, transferencias y otros ajustes manuales.
delete from public.account_balance_history
 where source_type in ('sale_payment','expense')
    or changed_by = 'Venta / cobro'
    or changed_by = 'Reverso de venta'
    or changed_by ilike '% · Venta · %'
    or changed_by ilike '%Venta eliminada%'
    or changed_by ilike '% · Gasto · %'
    or changed_by ilike '%Reversión/edición de gasto%';

-- Dar nombre y fecha bancaria a saldos iniciales/transferencias antiguas que se conservan.
update public.account_balance_history
   set transaction_date = coalesce(transaction_date, created_at::date),
       description = case
         when coalesce(description,'')<>'' then description
         when previous_balance=0 and new_balance<>0 and coalesce(changed_by,'') not ilike '%Transferencia%'
           then 'Saldo inicial'
         when position(' · ' in coalesce(changed_by,''))>0
           then substring(changed_by from position(' · ' in changed_by)+3)
         else coalesce(nullif(changed_by,''),'Movimiento')
       end,
       source_type = case
         when source_type is not null then source_type
         when previous_balance=0 and new_balance<>0 and coalesce(changed_by,'') not ilike '%Transferencia%' then 'initial_balance'
         when coalesce(changed_by,'') ilike '%Transferencia%' then 'transfer'
         else source_type
       end;

-- Reconstruir UNA línea por cada cobro que todavía existe.
insert into public.account_balance_history(
  id,business_id,account_id,account_name,currency,
  previous_balance,new_balance,changed_by,description,
  source_type,source_id,transaction_date,created_at
)
select gen_random_uuid(),s.business_id,p.account_id,coalesce(p.account_name,a.name),a.currency,
       0,
       case when a.currency='USD'
            then p.amount/nullif(coalesce(p.exchange_rate,s.exchange_rate,37),0)
            else p.amount end,
       concat('Venta · ',coalesce(nullif(s.client,''),'Cliente'),
              case when coalesce(p.payment_method,'')<>'' then ' · '||p.payment_method else '' end),
       concat('Venta · ',coalesce(nullif(s.client,''),'Cliente'),
              case when coalesce(p.payment_method,'')<>'' then ' · '||p.payment_method else '' end),
       'sale_payment',p.id,p.payment_date,coalesce(p.created_at,now())
  from public.sale_payments p
  join public.sales s on s.id=p.sale_id
  join public.financial_accounts a on a.id=p.account_id
 where p.account_id is not null and p.amount<>0;

-- Reconstruir UNA línea por cada gasto que todavía existe.
insert into public.account_balance_history(
  id,business_id,account_id,account_name,currency,
  previous_balance,new_balance,changed_by,description,
  source_type,source_id,transaction_date,created_at
)
select gen_random_uuid(),e.business_id,e.source_account_id,coalesce(e.source_account_name,a.name),a.currency,
       case when a.currency='USD'
            then coalesce(e.entered_amount,e.amount/nullif(coalesce(e.exchange_rate,37),0))
            else e.amount end,
       0,
       concat('Gasto · ',coalesce(nullif(e.description,''),coalesce(e.category,'Gasto'))),
       concat('Gasto · ',coalesce(nullif(e.description,''),coalesce(e.category,'Gasto'))),
       'expense',e.id,e.expense_date,coalesce(e.created_at,now())
  from public.expenses e
  join public.financial_accounts a on a.id=e.source_account_id
 where e.source_account_id is not null and e.amount<>0;

-- Un movimiento fuente solo puede tener una línea por cuenta.
create unique index if not exists uq_account_history_source_account
  on public.account_balance_history(source_type,source_id,account_id)
  where source_id is not null;

-- VENTAS: una sola entrada real. Borrar la venta/pago revierte el saldo y
-- elimina la línea correspondiente; NO crea una línea de reversión.
create or replace function public.impresa_sale_payment_account_delta()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  bid uuid;
  r numeric;
  acct_currency text;
  current_balance numeric;
  delta numeric;
  client_name text;
  acct_name text;
  descr text;
begin
  if tg_op in ('UPDATE','DELETE') and old.account_id is not null then
    select a.business_id,a.currency,a.balance,a.name
      into bid,acct_currency,current_balance,acct_name
      from public.financial_accounts a where a.id=old.account_id;
    if bid is not null then
      r:=coalesce(old.exchange_rate,37);
      delta:=case when acct_currency='USD' then old.amount/nullif(r,0) else old.amount end;
      update public.financial_accounts
         set balance=balance-delta,updated_at=now()
       where id=old.account_id;
      delete from public.account_balance_history
       where source_type='sale_payment' and source_id=old.id and account_id=old.account_id;
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') and new.account_id is not null then
    select s.business_id,coalesce(new.exchange_rate,s.exchange_rate,37),
           coalesce(nullif(s.client,''),'Cliente'),a.currency,a.balance,a.name
      into bid,r,client_name,acct_currency,current_balance,acct_name
      from public.sales s
      join public.financial_accounts a on a.id=new.account_id and a.business_id=s.business_id
     where s.id=new.sale_id;
    if bid is null then raise exception 'La cuenta seleccionada no pertenece a este negocio.'; end if;
    new.exchange_rate:=r;
    delta:=case when acct_currency='USD' then new.amount/nullif(r,0) else new.amount end;
    descr:=concat('Venta · ',client_name,
                  case when coalesce(new.payment_method,'')<>'' then ' · '||new.payment_method else '' end);
    update public.financial_accounts
       set balance=current_balance+delta,updated_at=now()
     where id=new.account_id;
    insert into public.account_balance_history(
      id,business_id,account_id,account_name,currency,previous_balance,new_balance,
      changed_by,description,source_type,source_id,transaction_date
    ) values(
      gen_random_uuid(),bid,new.account_id,coalesce(new.account_name,acct_name),acct_currency,
      current_balance,current_balance+delta,descr,descr,'sale_payment',new.id,new.payment_date
    );
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;

create trigger trg_impresa_sale_payment_account_delta
before insert or update or delete on public.sale_payments
for each row execute function public.impresa_sale_payment_account_delta();

-- GASTOS: una sola salida real. Editar reemplaza la línea; borrar restaura el
-- saldo y elimina la línea sin mostrar "reversión".
create or replace function public.impresa_expense_account_delta()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  bid uuid;
  r numeric;
  acct_currency text;
  current_balance numeric;
  native_amount numeric;
  acct_name text;
  descr text;
begin
  if tg_op in ('UPDATE','DELETE') and old.source_account_id is not null then
    select a.business_id,a.currency,a.balance,a.name
      into bid,acct_currency,current_balance,acct_name
      from public.financial_accounts a where a.id=old.source_account_id;
    if bid is not null then
      r:=coalesce(old.exchange_rate,37);
      native_amount:=case when acct_currency='USD'
                          then coalesce(old.entered_amount,old.amount/nullif(r,0))
                          else old.amount end;
      update public.financial_accounts
         set balance=balance+native_amount,updated_at=now()
       where id=old.source_account_id;
      delete from public.account_balance_history
       where source_type='expense' and source_id=old.id and account_id=old.source_account_id;
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') and new.source_account_id is not null then
    select a.business_id,a.currency,a.balance,a.name
      into bid,acct_currency,current_balance,acct_name
      from public.financial_accounts a
     where a.id=new.source_account_id and a.business_id=new.business_id;
    if bid is null then raise exception 'La cuenta seleccionada no pertenece a este negocio.'; end if;
    r:=coalesce(new.exchange_rate,37);
    native_amount:=case when acct_currency='USD'
                        then coalesce(new.entered_amount,new.amount/nullif(r,0))
                        else new.amount end;
    if current_balance<native_amount then
      raise exception 'Saldo insuficiente en la cuenta seleccionada para registrar este gasto.';
    end if;
    descr:=concat('Gasto · ',coalesce(nullif(new.description,''),coalesce(new.category,'Gasto')));
    update public.financial_accounts
       set balance=current_balance-native_amount,updated_at=now()
     where id=new.source_account_id;
    insert into public.account_balance_history(
      id,business_id,account_id,account_name,currency,previous_balance,new_balance,
      changed_by,description,source_type,source_id,transaction_date
    ) values(
      gen_random_uuid(),new.business_id,new.source_account_id,coalesce(new.source_account_name,acct_name),acct_currency,
      current_balance,current_balance-native_amount,descr,descr,'expense',new.id,new.expense_date
    );
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;

create trigger trg_impresa_expense_account_delta
before insert or update or delete on public.expenses
for each row execute function public.impresa_expense_account_delta();

notify pgrst, 'reload schema';
commit;
