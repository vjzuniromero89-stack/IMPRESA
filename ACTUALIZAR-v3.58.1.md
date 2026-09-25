# IMPRESA v3.58.1

Rediseño de Ventas rehecho para parecerse mucho más a la referencia tipo factura enviada por el usuario.

- Encabezado de factura con IMPRESA.
- Información del cliente a la izquierda (solo nombre, sin teléfono ni dirección).
- Detalles de venta a la derecha.
- Tabla compacta: producto/servicio, cantidad, precio, total y eliminar.
- Código/talla/color/stock/costo siguen disponibles dentro de la fila del producto sin ensanchar la tabla principal.
- Botón Agregar producto o servicio debajo de la tabla.
- Notas a la izquierda y totales a la derecha.
- Botones de acción al pie.
- Se conserva toda la lógica actual de inventario, pago, cuenta, moneda automática y abonos.
- No requiere migración de Supabase.
