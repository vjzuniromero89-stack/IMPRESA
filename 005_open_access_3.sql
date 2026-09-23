-- IMPRESA / 005 — acceso abierto (se quita el inicio de sesión)
--
-- Qué hace esta migración:
-- 1) Quita el requisito de haber iniciado sesión para leer/escribir los
--    datos del negocio: todas las políticas de seguridad (RLS) que exigían
--    "ser miembro autenticado del negocio" se reemplazan por políticas
--    abiertas, y se agrega el permiso también al rol "anon" (visitante sin
--    sesión), porque la app ya no pide usuario ni contraseña para entrar.
-- 2) Crea la tabla "app_users": un listado simple de nombres (dueño,
--    empleados) SIN contraseña, solo para que la pestaña "Usuarios" pueda
--    anotar quién hizo cada cosa en el registro de actividad. No tiene
--    ninguna relación con Supabase Auth ni con la tabla anterior
--    "business_users" (esa tabla queda sin usarse, no hace falta borrarla).
--
-- Esta versión es "a prueba de orden": si alguna tabla de una migración
-- anterior (003 activity_log, 004 debts/debt_payments) todavía no existe en
-- tu proyecto, esta migración simplemente la salta en vez de fallar a la
-- mitad. Aun así, lo ideal es correr antes 001, 002, 003 y 004 (son
-- seguras de correr de nuevo aunque ya las hayas corrido) para tener
-- también esas funciones (Usuarios/Actividad, Deudas) funcionando.
--
-- IMPORTANTE: después de correr esto, cualquier persona con el link de la
-- app (o con la llave pública/anon de tu proyecto) puede ver y modificar
-- los datos del negocio, sin que se le pida contraseña. Es exactamente lo
-- que se pidió: quitar el inicio de sesión por completo.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez;
-- se puede volver a correr sin problema si hace falta).

-- ---------- Nueva tabla: lista de usuarios (sin contraseña) ----------
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  role text not null default 'empleado' check(role in ('owner','empleado')),
  created_at timestamptz not null default now()
);
create index if not exists idx_app_users_business on public.app_users(business_id);

alter table public.app_users enable row level security;
grant select, insert, update, delete on public.app_users to anon, authenticated;

drop policy if exists app_users_open on public.app_users;
create policy app_users_open on public.app_users for all to public using (true) with check (true);

-- ---------- Abrir el acceso en el resto de tablas del negocio ----------
-- Por cada tabla: si existe, le da permiso también a "anon" (visitante sin
-- sesión) y reemplaza sus políticas anteriores (basadas en auth.uid()) por
-- una sola política abierta. Si la tabla todavía no existe (porque esa
-- migración anterior no se había corrido), la salta sin dar error.
do $$
declare
  cfg record;
  old_policy text;
  i int;
begin
  for cfg in
    select * from (values
      ('businesses'::text,            'businesses_open'::text,            array['business_member_select','business_create','business_member_update']::text[]),
      ('business_users',              'business_users_open',              array['business_member_self','business_member_join','business_owner_invite']),
      ('products',                    'products_open',                    array['business_member_data']),
      ('financial_accounts',          'financial_accounts_open',          array['business_member_data']),
      ('sales',                       'sales_open',                       array['business_member_data']),
      ('expenses',                    'expenses_open',                    array['business_member_data']),
      ('monthly_inventory',           'monthly_inventory_open',           array['business_member_data']),
      ('month_closes',                'month_closes_open',                array['business_member_data']),
      ('sale_payments',               'sale_payments_open',               array['sale_payments_member']),
      ('inventory_month_notes',       'inventory_month_notes_open',       array['business_member_data']),
      ('quotes',                      'quotes_open',                      array['business_member_data']),
      ('activity_log',                'activity_log_open',                array['business_member_activity_select','business_member_activity_insert']),
      ('debts',                       'debts_open',                       array['business_member_data']),
      ('debt_payments',               'debt_payments_open',               array['business_member_data'])
    ) as t(tbl, new_policy, old_policies)
  loop
    if to_regclass('public.' || cfg.tbl) is null then
      raise notice 'IMPRESA 005: la tabla "%" todavía no existe, se omite (corre la migración correspondiente primero si la necesitas).', cfg.tbl;
      continue;
    end if;

    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', cfg.tbl);

    for i in coalesce(array_lower(cfg.old_policies, 1), 1) .. coalesce(array_upper(cfg.old_policies, 1), 0) loop
      old_policy := cfg.old_policies[i];
      execute format('drop policy if exists %I on public.%I', old_policy, cfg.tbl);
    end loop;

    execute format('drop policy if exists %I on public.%I', cfg.new_policy, cfg.tbl);
    execute format('create policy %I on public.%I for all to public using (true) with check (true)', cfg.new_policy, cfg.tbl);
  end loop;
end $$;
