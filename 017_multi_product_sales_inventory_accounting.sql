-- IMPRESA 017 — venta con varios productos + contabilidad automática de inventario
alter table public.sales add column if not exists line_items jsonb;

create or replace function public.impresa_sale_inventory_delta()
returns trigger language plpgsql security definer set search_path=public as $$
declare li jsonb; inv uuid; q numeric; available numeric;
begin
  -- devuelve al inventario lo que tenía la venta anterior
  if tg_op in ('UPDATE','DELETE') then
    if old.line_items is not null and jsonb_typeof(old.line_items)='array' then
      for li in select * from jsonb_array_elements(old.line_items) loop
        if coalesce(li->>'mode','')='inventory' and nullif(li->>'inventoryItemId','') is not null then
          inv=(li->>'inventoryItemId')::uuid; q=coalesce((li->>'quantity')::numeric,0);
          if q>0 then update public.monthly_inventory set quantity=quantity+q where id=inv and business_id=old.business_id; end if;
        end if;
      end loop;
    elsif old.inventory_item_id is not null and coalesce(old.quantity,0)>0 then
      update public.monthly_inventory set quantity=quantity+old.quantity where id=old.inventory_item_id and business_id=old.business_id;
    end if;
  end if;
  -- descuenta cada producto de inventario de la venta nueva
  if tg_op in ('INSERT','UPDATE') then
    if new.line_items is not null and jsonb_typeof(new.line_items)='array' then
      for li in select * from jsonb_array_elements(new.line_items) loop
        if coalesce(li->>'mode','')='inventory' and nullif(li->>'inventoryItemId','') is not null then
          inv=(li->>'inventoryItemId')::uuid; q=coalesce((li->>'quantity')::numeric,0);
          select quantity into available from public.monthly_inventory where id=inv and business_id=new.business_id for update;
          if available is null then raise exception 'Un producto seleccionado ya no existe en inventario.'; end if;
          if q<=0 then raise exception 'La cantidad vendida debe ser mayor que cero.'; end if;
          if available<q then raise exception 'Inventario insuficiente. Disponible: %, solicitado: %.',available,q; end if;
          update public.monthly_inventory set quantity=quantity-q where id=inv and business_id=new.business_id;
        end if;
      end loop;
    elsif new.inventory_item_id is not null and coalesce(new.quantity,0)>0 then
      select quantity into available from public.monthly_inventory where id=new.inventory_item_id and business_id=new.business_id for update;
      if available<new.quantity then raise exception 'Inventario insuficiente. Disponible: %, solicitado: %.',available,new.quantity; end if;
      update public.monthly_inventory set quantity=quantity-new.quantity where id=new.inventory_item_id and business_id=new.business_id;
    end if;
  end if;
  return coalesce(new,old);
end; $$;

drop trigger if exists trg_impresa_sale_inventory_delta on public.sales;
create trigger trg_impresa_sale_inventory_delta after insert or update or delete on public.sales for each row execute function public.impresa_sale_inventory_delta();
notify pgrst, 'reload schema';
