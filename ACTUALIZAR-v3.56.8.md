# IMPRESA v3.56.8 — Borrar registro total

Configuración incorpora una zona de reinicio total para limpiar los datos de prueba antes de comenzar la operación real.

Se eliminan ventas y abonos, gastos, inventario, historial y saldos iniciales, transferencias registradas, cotizaciones, deudas y pagos, cierres mensuales, productos antiguos y registro de actividad. Las cuentas bancarias/cajas se conservan pero quedan con saldo 0. También se conservan usuarios, tipo de cambio y listas de configuración.

El botón está disponible solamente para usuarios Administrativos y exige dos confirmaciones, incluida la frase BORRAR TODO.

Para un reinicio transaccional ejecutar una vez `migration/022_total_test_data_reset.sql`. La app incluye compatibilidad directa si aún no se ejecutó la migración, pero se recomienda ejecutar 022 antes de usar el botón.
