# IMPRESA v2.5 — Cierre mensual

Nuevo flujo:
- Inventario mensual ahora incluye “Cerrar mes y guardar en Contabilidad”.
- Al cerrar se crea una fotografía contable permanente con:
  inventario, cada banco/caja, gastos del mes, ventas informativas, tipo de cambio,
  valor del negocio, base histórica y ganancia/pérdida.
- Los meses cerrados quedan bloqueados para evitar cierres duplicados.
- Contabilidad muestra el historial mensual y el detalle del mes seleccionado.
- El tipo de cambio usado queda congelado dentro de cada cierre.
- Bancos y caja NO se ponen en cero al cambiar de mes: continúan con su saldo real.
- Ventas y gastos históricos NO se borran; al seleccionar el nuevo mes las pantallas
  quedan visualmente limpias porque cada módulo filtra por el mes seleccionado.
- C$ y US$ se muestran en los cierres.
