# IMPRESA v3.64

- Eliminados los botones Producto / Servicio / Manual de cada línea de venta.
- La columna **Descripción** ahora permite escribir libremente o seleccionar un producto/servicio desde una lista del inventario.
- Al seleccionar un artículo del inventario se cargan automáticamente sus datos internos (código, talla, color, stock y costo) para conservar la lógica del inventario.
- Nueva columna **Categoría**, editable y cargada desde inventario cuando aplica.
- Precio de venta fijo en **C$**.
- Tabla: Descripción · Categoría · Cantidad · Precio C$ · Total C$.
- La venta se mantiene contablemente en C$; si el pago entra a una cuenta US$, el sistema conserva la conversión al registrar el cobro.
- No requiere nueva migración de Supabase.
