-- IMPRESA / 021 — separar moneda de venta/gasto de moneda real de la cuenta
-- Ejecutar UNA sola vez en Supabase SQL Editor antes de publicar v3.53.
--
-- Regla: amount sigue siendo el valor contable normalizado a C$.
-- sale_amount / entered_amount conservan el importe original de la operación.
-- account_amount conserva lo que REALMENTE entró/salió de la cuenta elegida.
-- exchange_rate queda congelada por transacción para no recalcular históricos.

begin;

alter table public.sale_payments add column if not exists sale_amount numeric(14,2);
alter table public.sale_payments add column if not exists sale_currency text;
alter table public.sale_payments add column if not exists account_amount numeric(14,2);
alter table public.sale_payments add column if not exists account_currency text;
alter table public.expenses add column if not exists account_amount numeric(14,2);
alter table public.expenses add column if not exists account_currency text;

-- Completar pagos antiguos sin cambiar saldos.
update public.sale_payments p
set exchange_rate=coalesce(p.exchange_rate,s.exchange_rate,37),
    sale_currency=coalesce(p.sale_currency,s.currency),
    sale_amount=coalesce(p.sale_amount,case when s.currency='USD' then p.amount/nullif(coalesce(p.exchange_rate,s.exchange_rate,37),0) else p.amount end),
    account_currency=coalesce(p.account_currency,a.currency),
    account_amount=coalesce(p.account_amount,case when a.currency='USD' then p.amount/nullif(coalesce(p.exchange_rate,s.exchange_rate,37),0) else p.amount end)
from public.sales s
left join public.financial_accounts a on a.id=p.account_id
where s.id=p.sale_id;

-- Completar gastos antiguos sin cambiar saldos.
update public.expenses e
set account_currency=coalesce(e.account_currency,a.currency),
    account_amount=coalesce(e.account_amount,case when a.currency='USD' then e.amount/nullif(coalesce(e.exchange_rate,37),0) else e.amount end)
from public.financial_accounts a
where a.id=e.source_account_id;

create or replace function public.impresa_sale_payment_account_delta()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  bid uuid; r numeric; acct_currency text; current_balance numeric; delta numeric;
  client_name text; acct_name text; sale_currency_db text; sale_native numeric; descr text;
begin
  if tg_op in ('UPDATE','DELETE') and old.account_id is not null then
    select a.business_id,a.currency,a.balance,a.name into bid,acct_currency,current_balance,acct_name
      from public.financial_accounts a where a.id=old.account_id;
    if bid is not null then
      r:=coalesce(old.exchange_rate,37);
      delta:=coalesce(old.account_amount,case when acct_currency='USD' then old.amount/nullif(r,0) else old.amount end);
      update public.financial_accounts set balance=balance-delta,updated_at=now() where id=old.account_id;
      delete from public.account_balance_history where source_type='sale_payment' and source_id=old.id and account_id=old.account_id;
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') and new.account_id is not null then
    select s.business_id,coalesce(new.exchange_rate,37),coalesce(nullif(s.client,''),'Cliente'),s.currency,
           a.currency,a.balance,a.name
      into bid,r,client_name,sale_currency_db,acct_currency,current_balance,acct_name
      from public.sales s join public.financial_accounts a on a.id=new.account_id and a.business_id=s.business_id
     where s.id=new.sale_id;
    if bid is null then raise exception 'La cuenta seleccionada no pertenece a este negocio.'; end if;
    new.exchange_rate:=r;
    new.sale_currency:=coalesce(new.sale_currency,sale_currency_db);
    new.sale_amount:=coalesce(new.sale_amount,case when new.sale_currency='USD' then new.amount/nullif(r,0) else new.amount end);
    new.account_currency:=acct_currency;
    new.account_amount:=case when acct_currency='USD' then new.amount/nullif(r,0) else new.amount end;
    delta:=new.account_amount;
    sale_native:=new.sale_amount;
    descr:=concat('Venta · ',client_name,
      case when coalesce(new.payment_method,'')<>'' then ' · '||new.payment_method else '' end,
      ' · ',case when new.sale_currency='USD' then 'US$' else 'C$' end,to_char(sale_native,'FM999999990.00'),
      case when new.sale_currency<>acct_currency then concat(' → ',case when acct_currency='USD' then 'US$' else 'C$' end,to_char(delta,'FM999999990.00'),' · TC ',to_char(r,'FM999999990.0000')) else '' end);
    update public.financial_accounts set balance=current_balance+delta,updated_at=now() where id=new.account_id;
    insert into public.account_balance_history(id,business_id,account_id,account_name,currency,previous_balance,new_balance,changed_by,description,source_type,source_id,transaction_date)
    values(gen_random_uuid(),bid,new.account_id,coalesce(new.account_name,acct_name),acct_currency,current_balance,current_balance+delta,descr,descr,'sale_payment',new.id,new.payment_date);
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end; $$;

drop trigger if exists trg_impresa_sale_payment_account_delta on public.sale_payments;
create trigger trg_impresa_sale_payment_account_delta before insert or update or delete on public.sale_payments
for each row execute function public.impresa_sale_payment_account_delta();

create or replace function public.impresa_expense_account_delta()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  bid uuid; r numeric; acct_currency text; current_balance numeric; native_amount numeric; acct_name text; descr text; expense_native numeric;
begin
  if tg_op in ('UPDATE','DELETE') and old.source_account_id is not null then
    select a.business_id,a.currency,a.balance,a.name into bid,acct_currency,current_balance,acct_name
      from public.financial_accounts a where a.id=old.source_account_id;
    if bid is not null then
      r:=coalesce(old.exchange_rate,37);
      native_amount:=coalesce(old.account_amount,case when acct_currency='USD' then old.amount/nullif(r,0) else old.amount end);
      update public.financial_accounts set balance=balance+native_amount,updated_at=now() where id=old.source_account_id;
      delete from public.account_balance_history where source_type='expense' and source_id=old.id and account_id=old.source_account_id;
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') and new.source_account_id is not null then
    select a.business_id,a.currency,a.balance,a.name into bid,acct_currency,current_balance,acct_name
      from public.financial_accounts a where a.id=new.source_account_id and a.business_id=new.business_id;
    if bid is null then raise exception 'La cuenta seleccionada no pertenece a este negocio.'; end if;
    r:=coalesce(new.exchange_rate,37);
    new.account_currency:=acct_currency;
    new.account_amount:=case when acct_currency='USD' then new.amount/nullif(r,0) else new.amount end;
    native_amount:=new.account_amount;
    if current_balance<native_amount then raise exception 'Saldo insuficiente en la cuenta seleccionada para registrar este gasto.'; end if;
    expense_native:=coalesce(new.entered_amount,case when new.currency='USD' then new.amount/nullif(r,0) else new.amount end);
    descr:=concat('Gasto · ',coalesce(nullif(new.description,''),coalesce(new.category,'Gasto')),
      ' · ',case when new.currency='USD' then 'US$' else 'C$' end,to_char(expense_native,'FM999999990.00'),
      case when new.currency<>acct_currency then concat(' → ',case when acct_currency='USD' then 'US$' else 'C$' end,to_char(native_amount,'FM999999990.00'),' · TC ',to_char(r,'FM999999990.0000')) else '' end);
    update public.financial_accounts set balance=current_balance-native_amount,updated_at=now() where id=new.source_account_id;
    insert into public.account_balance_history(id,business_id,account_id,account_name,currency,previous_balance,new_balance,changed_by,description,source_type,source_id,transaction_date)
    values(gen_random_uuid(),new.business_id,new.source_account_id,coalesce(new.source_account_name,acct_name),acct_currency,current_balance,current_balance-native_amount,descr,descr,'expense',new.id,new.expense_date);
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end; $$;

drop trigger if exists trg_impresa_expense_account_delta on public.expenses;
create trigger trg_impresa_expense_account_delta before insert or update or delete on public.expenses
for each row execute function public.impresa_expense_account_delta();

notify pgrst,'reload schema';
commit;
