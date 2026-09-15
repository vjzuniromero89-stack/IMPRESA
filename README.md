# IMPRESA / PrintControl

Aplicación web administrativa para negocio de impresión y bordado en Nicaragua.

## Módulos funcionales de esta versión
Dashboard, Ventas, Cotizaciones, Producción, Clientes, Inventario, Compras, Gastos, Bancos y Caja, Por Cobrar, Contabilidad, Reportes y Configuración.

### Flujo nuevo v0.3
Una cotización puede aprobarse y pasar automáticamente al tablero de Producción. Producción avanza por Nueva → Diseño → Impresión → Bordado → Lista → Entregada. Las compras registradas generan una salida en Bancos/Caja.

Los datos de esta versión se guardan en `localStorage` del navegador. La siguiente etapa debe migrar persistencia, usuarios y multiempresa a Supabase/PostgreSQL.

## Desarrollo
npm install
npm run dev

## Vercel
Framework: Next.js
Root Directory: raíz del repositorio
Build Command: npm run build

## v0.4
Ventas conectadas al inventario, costo de venta y ganancia bruta por orden. Abonos de clientes, cuentas por pagar y pagos a proveedores conectados a Bancos/Caja.
