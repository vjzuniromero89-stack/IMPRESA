-- IMPRESA 018 — flujo automatizado: cada cobro entra a una cuenta exacta.
-- Ejecutar UNA vez en Supabase SQL Editor antes de publicar esta versión.

alter table public.sale_payments add column if not exists account_id uuid references public.financial_accounts(id) on delete set null;
alter table public.sale_payments add column if not exists account_name text;
alter table public.sale_payments add column if not exists exchange_rate numeric(14,4);

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
  delta numeric;
  old_balance numeric;
  new_balance numeric;
begin
  if tg_op='INSERT' then
    if new.account_id is null then return new; end if;
    select s.business_id, coalesce(new.exchange_rate,s.exchange_rate,37), a.currency, a.balance
      into bid,r,acct_currency,old_balance
      from public.sales s join public.financial_accounts a on a.id=new.account_id and a.business_id=s.business_id
     where s.id=new.sale_id;
    if bid is null then raise exception 'La cuenta seleccionada no pertenece a este negocio.'; end if;
    new.exchange_rate:=r;
    delta:=case when acct_currency='USD' then new.amount/nullif(r,0) else new.amount end;
    new_balance:=old_balance+delta;
    update public.financial_accounts set balance=new_balance,updated_at=now() where id=new.account_id;
    insert into public.account_balance_history(id,business_id,account_id,account_name,currency,previous_balance,new_balance,changed_by)
    values(gen_random_uuid(),bid,new.account_id,coalesce(new.account_name,''),acct_currency,old_balance,new_balance,'Venta / cobro');
    return new;
  elsif tg_op='DELETE' then
    if old.account_id is null then return old; end if;
    select a.business_id,a.currency,a.balance into bid,acct_currency,old_balance from public.financial_accounts a where a.id=old.account_id;
    if bid is null then return old; end if;
    r:=coalesce(old.exchange_rate,37);
    delta:=case when acct_currency='USD' then old.amount/nullif(r,0) else old.amount end;
    new_balance:=old_balance-delta;
    update public.financial_accounts set balance=new_balance,updated_at=now() where id=old.account_id;
    insert into public.account_balance_history(id,business_id,account_id,account_name,currency,previous_balance,new_balance,changed_by)
    values(gen_random_uuid(),bid,old.account_id,coalesce(old.account_name,''),acct_currency,old_balance,new_balance,'Reverso de venta');
    return old;
  end if;
  return coalesce(new,old);
end; $$;

drop trigger if exists trg_impresa_sale_payment_account_delta on public.sale_payments;
create trigger trg_impresa_sale_payment_account_delta
before insert or delete on public.sale_payments
for each row execute function public.impresa_sale_payment_account_delta();

notify pgrst, 'reload schema';
