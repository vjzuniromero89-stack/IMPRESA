-- IMPRESA / 022 — Reinicio total de datos de prueba
--
-- Habilita el botón "Borrar registro total" de Configuración con una operación
-- transaccional. Conserva:
--   • negocio y sus listas/configuración
--   • usuarios de la app
--   • nombres de bancos/cajas creados
-- Pero pone todas las cuentas en saldo 0 y borra la actividad operativa.
--
-- Es segura de ejecutar más de una vez. Ejecutarla UNA VEZ en Supabase SQL Editor.

begin;

create or replace function public.impresa_reset_operational_data(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_business_id is null then
    raise exception 'Falta el negocio que se desea reiniciar.';
  end if;

  if not exists(select 1 from public.businesses where id=p_business_id) then
    raise exception 'El negocio indicado no existe.';
  end if;

  -- Ventas primero: sus pagos se eliminan por cascade y los triggers actuales
  -- pueden revertir temporalmente saldos/inventario. Al final todo queda en 0.
  delete from public.sales where business_id=p_business_id;
  delete from public.expenses where business_id=p_business_id;
  delete from public.debts where business_id=p_business_id;
  delete from public.quotes where business_id=p_business_id;
  delete from public.month_closes where business_id=p_business_id;
  delete from public.monthly_inventory where business_id=p_business_id;
  delete from public.inventory_month_notes where business_id=p_business_id;
  delete from public.products where business_id=p_business_id;
  delete from public.account_balance_history where business_id=p_business_id;
  delete from public.activity_log where business_id=p_business_id;

  -- Se conservan las cuentas/cajas ya configuradas, pero vuelven a cero.
  update public.financial_accounts
     set balance=0, updated_at=now()
   where business_id=p_business_id;

  -- La próxima carga inicial vuelve a ser una apertura limpia.
  update public.businesses
     set initial_base_confirmed=false,
         initial_base_confirmed_at=null,
         initial_base_cordobas=null,
         inventory_baseline_month=null
   where id=p_business_id;
end;
$$;

grant execute on function public.impresa_reset_operational_data(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
