# ACTUALIZAR v3.60

## Ventas organizadas en 3 barras
- **Crear nueva venta**: vista predeterminada. Muestra el formulario para registrar una venta y, debajo, todas las ventas del mes seleccionado.
- **Ventas cobradas**: muestra únicamente las ventas del mes que ya quedaron pagadas completamente.
- **Ventas pendientes**: muestra las ventas con saldo pendiente, incluyendo las pendientes arrastradas de meses anteriores sin duplicarlas.
- Se eliminó el resumen circular superior de Ventas para que al entrar a la pestaña se vea directamente Crear nueva venta y el registro mensual.
- La lógica de abonos, Banco/Efectivo, inventario y cuentas por cobrar se conserva.

No requiere migración nueva de Supabase.
