-- IMPRESA / 006 — usuario y contraseña reales en la pestaña Usuarios
--
-- Qué hace esta migración:
-- 1) La tabla "app_users" (creada en 005 sin contraseña) ahora guarda
--    usuario + contraseña de verdad. La contraseña nunca se guarda en
--    texto plano: la app la convierte en un "hash" (PBKDF2) en el propio
--    navegador antes de mandarla a Supabase, y se guarda ese hash junto
--    con su "sal" (password_salt/password_hash).
-- 2) Los roles cambian de "owner"/"empleado" a **"admin"/"usuario"**
--    (Administrativo / Usuario), que es como se van a mostrar ahora.
-- 3) Las cuentas que se habían creado con la versión anterior (solo
--    nombre y rol, sin contraseña) ya no sirven para entrar — se borran
--    aquí mismo, porque no tienen contraseña y estorbarían para volver a
--    crear un usuario con ese mismo nombre. Si ya habías creado tu
--    usuario en esa versión, vas a tener que crearlo de nuevo (esta vez
--    con su contraseña) desde la pantalla de entrada.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez;
-- se puede volver a correr sin problema si hace falta).
-- Requiere haber corrido antes 001 a 005.

-- Renombra "name" a "username" si esta es la primera vez que se corre esto.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='app_users' and column_name='name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='app_users' and column_name='username'
  ) then
    alter table public.app_users rename column name to username;
  end if;
end $$;

alter table public.app_users add column if not exists username text;
alter table public.app_users add column if not exists password_salt text;
alter table public.app_users add column if not exists password_hash text;

-- Las cuentas viejas (sin contraseña) de la versión anterior de esta
-- pestaña ya no sirven para nada — se quitan para poder recrearlas con
-- contraseña sin chocar por el mismo nombre de usuario.
delete from public.app_users where password_hash is null;

-- Los roles pasan de owner/empleado a admin/usuario.
update public.app_users set role='admin' where role='owner';
update public.app_users set role='usuario' where role='empleado';

alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check check (role in ('admin','usuario'));
alter table public.app_users alter column role set default 'usuario';

alter table public.app_users alter column username set not null;
create unique index if not exists app_users_username_unique on public.app_users (lower(username));
