# PrintControl Nicaragua

App web V1 para negocio de impresión y bordado en Nicaragua. Incluye dashboard responsive, estructura de ventas, clientes, inventario, compras, gastos, bancos/caja, cuentas por cobrar/pagar, contabilidad, reportes y balance inicial de US$4,100.

## Stack
- Next.js App Router + TypeScript
- Supabase/PostgreSQL (schema incluido)
- CSS responsive
- NIO + USD y tipo de cambio por transacción
- Arquitectura multiempresa

## Ejecutar
1. Instala Node.js 22+.
2. `npm install`
3. `npm run dev`
4. Abre `http://localhost:3000`

## Supabase
1. Crea un proyecto Supabase.
2. Copia `.env.example` a `.env.local` y agrega URL + publishable key.
3. Ejecuta `supabase/migrations/001_initial_schema.sql` en tu base.
4. Antes de producción, completa las políticas RLS equivalentes para todas las tablas y conecta las pantallas a Supabase.

## Estado
Esta entrega es una V1 funcional de interfaz/arquitectura y un esquema inicial de base de datos. Los datos del dashboard son demostrativos hasta conectar Supabase. No debe usarse como libro contable oficial sin completar validaciones, impuestos/facturación aplicables y pruebas contables.
