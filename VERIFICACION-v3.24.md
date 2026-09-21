# Verificación de IMPRESA v3.24

Fecha: 21 de septiembre de 2026.

- `npm run build`: correcto, compilación y comprobación TypeScript completas.
- `node --test tests/salePersistence.test.cjs`: 5 pruebas correctas.
- Navegador Chrome con API de Supabase simulada: creación y edición de ventas; validación de total menor que abonos; pagos mixtos; edición de gastos; persistencia tras recarga; error de guardado y reintento.
- Caso específico: venta antigua pagada y sin método, con abono histórico sin clasificar e importe original nulo. Cambio a Transferencia y luego a Efectivo; recarga; total, pagado, estado, moneda, tipo de cambio e historial sin modificaciones.
- Esquema ausente: error PGRST204 simulado, mensaje con ubicación del SQL, recuperación y reintento sin duplicación.
- SQL ejecutado en PostgreSQL local (PGlite): migración repetida dos veces, datos antiguos conservados, métodos válidos aceptados y método inválido rechazado.
- Las 13 pestañas revisadas en escritorio de 1440 px y móvil de 390 px. Sin desbordamiento horizontal de la página; tablas con desplazamiento interno. Capturas del Dashboard, historial y Ventas revisadas visualmente.
- No se modificó ni se verificó la base de producción. Las pruebas de integración usaron respuestas simuladas; la migración se verificó en una base local.
