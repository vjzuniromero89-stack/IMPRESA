-- Diagnóstico: ¿cuáles migraciones ya corriste en este proyecto de Supabase?
-- No cambia nada, solo consulta. Pégalo completo en el SQL Editor y dale Run,
-- luego mándame una captura del resultado (una sola fila con varias columnas
-- true/false).

select
  (to_regclass('public.debts') is not null)                  as tiene_tabla_debts,
  (to_regclass('public.debt_payments') is not null)           as tiene_tabla_debt_payments,
  (to_regclass('public.activity_log') is not null)            as tiene_tabla_activity_log,
  (to_regclass('public.app_users') is not null)                as tiene_tabla_app_users,
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='app_users' and column_name='password_hash'
  )                                                             as app_users_tiene_password,
  (to_regclass('public.account_balance_history') is not null)  as tiene_tabla_historial_saldos;
