# IMPRESA v1.0

Sistema administrativo integral para negocio de impresión y bordado en Nicaragua.

Incluye Dashboard, ventas conectadas a inventario, cotizaciones, producción, clientes, proveedores, inventario por SKU/talla/color, compras con entrada automática a inventario, gastos, bancos/caja, cuentas por cobrar, cuentas por pagar, contabilidad, rentabilidad, reportes y balance inicial.

El capital histórico de US$4,100 se mantiene separado del saldo disponible para evitar duplicarlo contablemente.

## Importante
Esta versión usa localStorage para funcionar inmediatamente sin credenciales externas. Para operación multiusuario, respaldo cloud y acceso desde varios dispositivos, la siguiente capa de infraestructura es Supabase/PostgreSQL.

## Ejecutar
npm install
npm run dev

## Vercel
Root Directory: raíz del repositorio
Build Command: npm run build
