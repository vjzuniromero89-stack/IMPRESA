# IMPRESA 3.23 — Tema claro, edición y métodos de pago

Esta actualización parte exclusivamente de `IMPRESA-main (1).zip`, cuya versión declarada era 3.22.0.

## Antes de subir a GitHub

1. Abre el SQL Editor de tu proyecto de Supabase.
2. Ejecuta el contenido completo de `supabase/migrations/20260921135236_sales_payment_methods.sql`.
3. Sube a tu repositorio todos los archivos de este paquete, conservando las variables de entorno que ya utilizas para conectar Supabase.
4. Publica la actualización con el proceso habitual del proyecto.

El SQL solo agrega el método de pago a ventas y abonos. No borra datos ni cambia permisos. Puede ejecutarse nuevamente sin borrar registros. Este paquete no ejecuta el SQL en tu cuenta automáticamente. Si no se aplica, no se podrán guardar los nuevos métodos de pago.

## Cambios incluidos

- Fondo blanco en todas las pestañas y en el inicio de sesión, con textos oscuros, cuadros claros, botones azules y estados con colores legibles.
- Ventas: botón Editar para fecha, cliente, trabajo, importe, moneda y método de pago. Conserva el identificador y los abonos; no permite reducir el total por debajo del importe cobrado.
- Gastos: botón Editar para fecha, categoría, descripción, importe y moneda; también permite cancelar sin guardar.
- Selector Transferencia / Efectivo al crear o editar una venta, y al registrar cada abono.
- Nueva pestaña Ventas Transferencia Efectivo, conectada directamente a las mismas ventas: secciones separadas, totales y detalle de pagos. Permite consultar el mes seleccionado o todo el historial.
- Los totales de ventas se agrupan por método y fecha de venta. Los cobros se agrupan por método y fecha de cada abono: una venta puede tener pagos por ambos métodos.
- Los registros antiguos sin método aparecen como Sin clasificar. Editar el método de una venta no modifica los métodos de sus abonos anteriores.
- Los registros antiguos que tengan un saldo cobrado pero no un detalle de abonos siguen mostrando ese saldo en Ventas. No se inventan pagos en el historial detallado.

Las ventas y gastos mantienen su función informativa en la contabilidad. Seleccionar transferencia o efectivo no modifica automáticamente las cuentas bancarias o de caja.

## Verificación

Compilación de producción y revisión de TypeScript aprobadas. Pruebas en navegador con un servicio simulado: creación y edición de ventas, límite del importe según abonos, pagos mixtos, edición de gastos en dólares, recarga, error de guardado y reintento, 13 pestañas y vista móvil. Migración SQL comprobada en PostgreSQL local de prueba, incluidos datos antiguos y ejecución repetida.

No se han ejecutado cambios ni pruebas contra la base de datos real del negocio. El ZIP no incluye credenciales, dependencias instaladas ni datos de prueba.
