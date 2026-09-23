-- IMPRESA / 008 — permitir borrar líneas del Historial de saldo
--
-- La migración 007 creó "account_balance_history" a propósito sin permiso
-- de borrar (solo se podía ver y agregar), igual que el registro de
-- actividad. Ahora se pidió poder borrar líneas de ese historial (por
-- ejemplo, si una quedó mal registrada), así que esta migración agrega el
-- permiso de "delete" que faltaba.
--
-- Ejecuta este archivo completo en el SQL Editor de Supabase (una sola vez).
-- Requiere haber corrido antes 007_account_balance_history.sql.

grant delete on public.account_balance_history to anon, authenticated;

drop policy if exists account_balance_history_delete on public.account_balance_history;
create policy account_balance_history_delete on public.account_balance_history for delete to public using (true);
