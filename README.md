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

## v3.1.3 — base limpia acumulativa
- Eliminados Producción, Clientes y Cotizaciones.
- Se conserva un solo círculo de progreso en Dashboard.
- Fórmula bloqueada: Inventario + Bancos + Efectivo = valor actual.
- Ventas y Gastos son registros informativos.
- US$4,100 es la base inicial de comparación.
- Si el valor actual es menor, se muestra “Por debajo de la base inicial”; no se usa la fórmula antigua de pérdida desde el inicio.

## v3.2 — cambios consolidados de ambos chats
- US$4,100 vuelve a ser capital inicial histórico informativo; no genera pérdida.
- Valor real = Inventario + Bancos + Efectivo.
- Primer cierre establece base real y resultado C$0 / US$0.
- Meses siguientes comparan contra el cierre anterior.
- Ventas y gastos son solo registros.
- Inventario se registra automáticamente al pulsar Agregar al conteo; eliminado Guardar inventario.
- Eliminados Producción, Clientes y Cotizaciones.
