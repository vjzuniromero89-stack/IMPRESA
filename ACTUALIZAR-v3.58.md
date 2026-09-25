# ACTUALIZAR v3.58

## Cambios
- Rediseño completo del formulario de **Ventas** con estilo tipo factura.
- Se reorganizó en bloques:
  - Información del cliente
  - Detalles de la venta
  - Tabla principal de productos/servicios
  - Resumen del producto seleccionado
  - Totales de la venta
- **No** se agregaron teléfono ni dirección.
- Se conservó la lógica actual del módulo de ventas:
  - cliente
  - fecha
  - forma de pago
  - cuenta donde pagó
  - moneda automática según la cuenta
  - nota / trabajo general
  - productos y servicios
  - pago inicial / abono inicial
- Mejoras visuales y responsive del bloque de ventas.

## Migraciones
- No requiere nueva migración de Supabase.
