# IMPRESA v3.56.2

- Corrige Movimientos Generales para que las transferencias internas no alteren el saldo consolidado.
- Se conservan las dos líneas de auditoría: salida de la cuenta origen y entrada a la cuenta destino.
- Ambas líneas muestran el mismo Saldo final consolidado, porque el dinero permanece dentro del negocio.
- Control de dinero ya excluye transferencias internas de entradas y salidas.
- No requiere migración nueva de Supabase.
