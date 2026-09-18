# IMPRESA v3.0 PRO
Rediseño profesional sobre la base v2.8, preservando los registros y claves localStorage.
- Dashboard ejecutivo con KPIs, evolución, gastos, liquidez y control del período.
- Contabilidad gerencial con Estado de Situación Financiera, activos, liquidez, inventario, variación patrimonial, composición de activos, gráficos, ejercicio contable y libro de cierres.
- US$4,100 se mantiene solo como capital inicial histórico informativo.
- C$ / US$ y tipo de cambio se mantienen.
- Ventas continúan como registro informativo según la regla definida.
- Se preservan Ventas, Gastos, Inventario, Cierre del mes, Bancos/Caja, Cotizaciones, Producción, Clientes, Reportes, Configuración y opciones de borrar.

## v3.0.1 — corrección de inventario
Se corrigió el guardado persistente de localStorage, la recarga del inventario por mes y la lectura inmediata del inventario guardado desde Dashboard y Contabilidad.

## v3.0.2 — Dashboard doble moneda
Todos los valores monetarios del Dashboard muestran C$ y US$: patrimonio, bancos/caja, inventario, ventas, gastos, evolución, distribución de gastos y saldos por cuenta.

## v3.1 — Regla financiera definitiva
Valor del negocio = Inventario + Bancos + Efectivo.
Ganancia/Pérdida = Valor actual - capital inicial histórico US$4,100.
Ventas y gastos son exclusivamente registros informativos y no afectan el valor ni la ganancia/pérdida.
Contabilidad muestra valores en C$ y US$.


## v3.4 - Sistema de cobros
Ventas con pago inicial, saldo pendiente, abonos, historial y cambio automatico a Pagada al llegar saldo a cero. Conserva las claves localStorage existentes.

## v3.9 — Cierre definitivo con pagos por cuenta
- El cierre del mes es ahora el último paso del período.
- Antes de cerrar se pueden registrar múltiples pagos de deuda.
- Cada pago exige seleccionar la cuenta de origen (BAC Dólares, BAC Córdobas, Efectivo u otra cuenta creada).
- El sistema valida el saldo disponible de la cuenta y evita sobregiros.
- Al confirmar el cierre, descuenta automáticamente cada pago de su cuenta real.
- Guarda valor antes de pagos, pagos detallados, saldos finales por cuenta y cierre definitivo.
- El cierre definitivo se convierte en la apertura del siguiente mes.
- El primer período parte de C$0 / US$0 y no muestra una pérdida inicial artificial.

## v3.10 — Capital histórico US$4,100 sin pérdida prematura
- Mantiene US$4,100 como capital histórico/base inicial.
- Durante la carga de Inventario + Bancos + Efectivo no muestra pérdida automática.
- Contabilidad incorpora “Confirmar situación inicial”. Solo después de confirmar compara los activos registrados contra US$4,100.
- Después del primer cierre, cada período usa como apertura el cierre definitivo trasladado del mes anterior.
- Se conserva la lógica v3.9 de pagos de deuda por cuenta antes del cierre definitivo.

## v3.12 — Tema oscuro y moneda integrada en cada casilla
- Toda la interfaz pasa a fondo negro con texto blanco; cada panel/tarjeta queda con sombra propia.
- Las casillas de dinero (Ventas, Gastos, Inventario, Cotizaciones) integran el selector C$/US$ al final del mismo cuadro, por defecto en C$.

## v3.13 — Conexión real a Supabase con inicio de sesión
- La app deja de guardar solo en `localStorage` y pasa a leer/escribir en Supabase, para que los datos se vean iguales en cualquier dispositivo.
- Se agrega inicio de sesión (correo y contraseña). La primera vez que alguien entra, la app crea su negocio automáticamente.
- Ver `INSTRUCCIONES_SUPABASE.md` para los pasos de configuración (migración 002, llaves de Supabase, variables de entorno en Cloudflare).

## v3.13.1 — Compatibilidad con el asistente de Cloudflare/Supabase
- La app ahora acepta también el nombre `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (el que usa el asistente nuevo de Cloudflare), además de `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `INSTRUCCIONES_SUPABASE.md` se actualizó explicando dónde pegar exactamente las llaves que muestra ese asistente.
