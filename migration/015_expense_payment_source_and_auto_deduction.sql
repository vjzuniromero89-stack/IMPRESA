-- IMPRESA / 015 — origen del gasto + descuento automático de Banco/Efectivo
-- Ejecutar UNA vez en Supabase SQL Editor antes de publicar esta versión.

alter table public.expenses add column if not exists payment_channel text;
alter table public.expenses add column if not exists source_account_id uuid references public.financial_accounts(id) on delete set null;
alter table public.expenses add column if not exists source_account_name text;

create or replace function public.impresa_expense_account_delta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_value numeric := 0;
  new_value numeric := 0;
begin
  -- amount está normalizado a córdobas; entered_amount conserva lo digitado.
  if tg_op in ('UPDATE','DELETE') and old.source_account_id is not null then
    old_value := case when old.currency = 'USD' then coalesce(old.entered_amount, old.amount / nullif(old.exchange_rate,0)) else coalesce(old.entered_amount, old.amount) end;
    update public.financial_accounts
       set balance = balance + old_value, updated_at = now()
     where id = old.source_account_id and business_id = old.business_id;
  end if;

  if tg_op in ('INSERT','UPDATE') and new.source_account_id is not null then
    new_value := case when new.currency = 'USD' then coalesce(new.entered_amount, new.amount / nullif(new.exchange_rate,0)) else coalesce(new.entered_amount, new.amount) end;
    if not exists (
      select 1 from public.financial_accounts
      where id = new.source_account_id and business_id = new.business_id and balance >= new_value
    ) then
      raise exception 'Saldo insuficiente en la cuenta seleccionada para registrar este gasto.';
    end if;
    update public.financial_accounts
       set balance = balance - new_value, updated_at = now()
     where id = new.source_account_id and business_id = new.business_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_impresa_expense_account_delta on public.expenses;
create trigger trg_impresa_expense_account_delta
after insert or update or delete on public.expenses
for each row execute function public.impresa_expense_account_delta();
