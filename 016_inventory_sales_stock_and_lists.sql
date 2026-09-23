-- IMPRESA / 016 — códigos de inventario + ventas enlazadas al stock + formas de pago de gastos
-- Ejecutar UNA vez en Supabase SQL Editor antes de publicar v3.36.

alter table public.businesses add column if not exists expense_payment_methods text[] not null default array['Efectivo','Transferencia / BAC'];

alter table public.monthly_inventory add column if not exists sku text;

-- Asigna códigos a filas existentes que todavía no tienen uno.
with numbered as (
  select id, 'IMP-' || lpad(row_number() over(partition by business_id order by month, created_at, id)::text,4,'0') as new_sku
  from public.monthly_inventory
  where sku is null or btrim(sku)=''
)
update public.monthly_inventory mi set sku=n.new_sku from numbered n where mi.id=n.id;

alter table public.sales add column if not exists inventory_item_id uuid references public.monthly_inventory(id) on delete set null;
alter table public.sales add column if not exists product_code text;
alter table public.sales add column if not exists product_name text;
alter table public.sales add column if not exists product_category text;
alter table public.sales add column if not exists talla text;
alter table public.sales add column if not exists color text;
alter table public.sales add column if not exists quantity numeric(14,3);

create or replace function public.impresa_sale_inventory_delta()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  available numeric;
begin
  -- En edición o borrado, devuelve primero al inventario la cantidad anterior.
  if tg_op in ('UPDATE','DELETE') and old.inventory_item_id is not null and coalesce(old.quantity,0)>0 then
    update public.monthly_inventory
       set quantity=quantity+old.quantity
     where id=old.inventory_item_id and business_id=old.business_id;
  end if;

  -- En venta nueva/edición, descuenta la nueva cantidad.
  if tg_op in ('INSERT','UPDATE') and new.inventory_item_id is not null and coalesce(new.quantity,0)>0 then
    select quantity into available from public.monthly_inventory
      where id=new.inventory_item_id and business_id=new.business_id for update;
    if available is null then
      raise exception 'El producto seleccionado ya no existe en inventario.';
    end if;
    if available < new.quantity then
      raise exception 'Inventario insuficiente. Disponible: %, solicitado: %.', available, new.quantity;
    end if;
    update public.monthly_inventory set quantity=quantity-new.quantity
      where id=new.inventory_item_id and business_id=new.business_id;
  end if;
  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_impresa_sale_inventory_delta on public.sales;
create trigger trg_impresa_sale_inventory_delta
after insert or update or delete on public.sales
for each row execute function public.impresa_sale_inventory_delta();

notify pgrst, 'reload schema';
