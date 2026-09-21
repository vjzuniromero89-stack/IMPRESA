# IMPRESA v3.24 — Rediseño y edición de ventas

## Publicar en GitHub
Sube el contenido completo de este ZIP a la raíz del repositorio existente (package.json debe quedar en la raíz). Conserva las variables de entorno actuales de Supabase. No subas node_modules ni archivos .env privados. Usa `npm ci` y `npm run build` como de costumbre. No se cambia la conexión ni se incluyen datos de prueba.

## Campos de método de pago en Supabase
Si v3.23 ya tenía las columnas `payment_method` en `sales` y `sale_payments`, no hace falta ninguna migración nueva.

Si al guardar aparece «Falta actualizar los campos de método de pago», abre Supabase → SQL Editor y ejecuta el archivo existente:
`supabase/migrations/20260921135236_sales_payment_methods.sql`.

Es el SQL aditivo de v3.23, incluido en este ZIP. Puede ejecutarse de nuevo: añade solamente las columnas ausentes y refresca el esquema. No modifica ventas, abonos, montos, permisos ni políticas. Hace falta si esas columnas no existen: el código del navegador no puede crear columnas de forma segura. No ejecutes de nuevo las migraciones antiguas de apertura de permisos para resolver este error.

## Comportamiento corregido
Al editar una venta existente se usa UPDATE por su identificador y negocio, enviando solo los campos que cambiaron y comprobando la respuesta. Una edición de método no envía total, pagado, moneda, estado ni tipo de cambio. Se conserva también el importe original cuando no cambió. El historial de abonos no se reasigna ni se vuelve a insertar.

En Ventas Transferencia Efectivo, la venta cambia de grupo según su método. Los cobros siguen agrupados por el método de cada abono: un abono antiguo sin clasificar permanece sin clasificar aunque cambie el método de la venta. No se cuenta ese dinero dos veces.

## Diseño
Barra lateral azul marino con iconos y opción activa azul; encabezados con paneles y breadcrumbs; campos de entrada sombreados; tarjetas con acentos; tablas con encabezados, filas y estados diferenciados. El mismo sistema visual se aplica a las 13 pestañas existentes y al acceso. Se conservan fórmulas y monedas C$/US$.

## Alcance de verificación
Las pruebas locales usan una API simulada y PostgreSQL local para no modificar datos reales. La conexión y los permisos de tu proyecto Supabase deben validarse al publicar. No se ha ejecutado SQL en tu base de producción.
