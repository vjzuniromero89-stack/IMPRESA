# ACTUALIZAR v3.61

## Ventas: Producto / Servicio / Manual
- El selector de cada línea ahora tiene tres opciones: **Producto**, **Servicio** y **Manual**.
- Producto y Servicio usan la misma búsqueda del inventario y completan automáticamente código, talla, color, existencia y costo.
- Manual permite escribir libremente la descripción, cantidad y precio.
- En líneas Manual el precio puede indicarse en **C$ o US$**; por defecto inicia en **C$**.
- Si la moneda manual es diferente de la moneda de la venta, el sistema convierte el total de esa línea usando el tipo de cambio actual antes de sumar la venta.

## Impacto contable
- No requiere migración de Supabase: los campos nuevos viven dentro del JSON de line_items.
- Control de dinero y Contabilidad continúan recibiendo el total canónico de la venta, por lo que no se crean movimientos duplicados ni cambia la lógica de cobros.
