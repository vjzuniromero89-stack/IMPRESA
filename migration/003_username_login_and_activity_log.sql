-- IMPRESA / 003 — usuarios con nombre de usuario + registro de actividad
--
-- Qué hace esta migración:
-- 1) Agrega una columna "username" a business_users (para mostrar quién
--    hizo cada cosa, en vez de un correo).
-- 2) Agrega una política para que el dueño (role='owner') pueda crear
--    otros usuarios dentro de SU MISMO negocio desde la pestaña "Usuarios"
--    de la app (antes solo se podía "auto-unir" cada quien a sí mismo).
-- 3) Crea la tabla activity_log: cada vez que alguien agrega, edita o
--    borra algo, la app guarda quién fue y qué hizo.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).
-- Requiere haber corrido antes 001 y 002.

alter table public.business_users add column if not exists username text;
alter table public.business_users add column if not exists created_at timestamptz not null default now();

-- Un mismo nombre de usuario no se puede repetir (sin importar mayúsculas).
create unique index if not exists business_users_username_unique
  on public.business_users (lower(username))
  where username is not null;

-- El dueño de un negocio puede agregar otros usuarios a SU MISMO negocio
-- (la política "business_member_join" de 002 solo permite que cada quien
-- se una a sí mismo; esta es una política adicional, no reemplaza esa).
drop policy if exists business_owner_invite on public.business_users;
create policy business_owner_invite on public.business_users for insert to authenticated
with check (
  exists(
    select 1 from public.business_users bu
    where bu.business_id = business_users.business_id
      and bu.user_id = (select auth.uid())
      and bu.role = 'owner'
  )
);

-- ---------- Registro de actividad ----------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  username text not null default '',
  action text not null,
  entity text,
  description text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_log_business on public.activity_log(business_id, created_at desc);

alter table public.activity_log enable row level security;
grant select, insert on public.activity_log to authenticated;

-- Cualquier miembro del negocio puede ver y agregar actividad, pero nadie
-- puede editar ni borrar el historial (no se crean políticas de update ni
-- delete a propósito, así el registro queda a prueba de manipulación).
drop policy if exists business_member_activity_select on public.activity_log;
create policy business_member_activity_select on public.activity_log for select to authenticated
using (exists(select 1 from public.business_users bu where bu.business_id=activity_log.business_id and bu.user_id=(select auth.uid())));

drop policy if exists business_member_activity_insert on public.activity_log;
create policy business_member_activity_insert on public.activity_log for insert to authenticated
with check (exists(select 1 from public.business_users bu where bu.business_id=activity_log.business_id and bu.user_id=(select auth.uid())));
