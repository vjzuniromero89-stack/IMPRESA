# IMPRESA v3.52 — Saldo inicial dentro del historial bancario

1. En Supabase > SQL Editor, ejecuta completo `migration/020_initial_balance_ledger.sql`.
2. Luego publica esta versión.

La migración recupera automáticamente los saldos iniciales que ya existen en Banco y Efectivo pero no tenían línea en el historial. No vuelve a sumar ese dinero: solamente reconstruye la línea de apertura faltante.

Desde esta versión, guardar o reemplazar un saldo inicial actualiza la cuenta y su historial en una sola operación. El historial individual y el historial general muestran `Saldo inicial` igual que cualquier estado bancario.
