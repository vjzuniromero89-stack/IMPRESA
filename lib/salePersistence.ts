// Pure helpers shared by persistence and regression tests.
export function changedSaleFields(previous: Record<string, unknown>, next: Record<string, unknown>) {
 const changes: Record<string, unknown> = {};
 for (const key of Object.keys(next)) {
  if (key !== 'id' && key !== 'business_id' && key !== 'exchange_rate' && next[key] !== previous[key]) changes[key] = next[key];
 }
 // Keep the original conversion rate for edits that do not change the amount.
 if ('amount' in changes || 'currency' in changes || 'entered_amount' in changes) changes.exchange_rate = next.exchange_rate;
 return changes;
}
export function saleSaveError(error: {code?:string;message?:string}) {
 if (['PGRST204','42703'].includes(error.code||'') && /payment_method/i.test(error.message||'')) {
  return new Error('Falta actualizar los campos de método de pago en Supabase. Ejecuta el SQL incluido en supabase/migrations/20260921135236_sales_payment_methods.sql y vuelve a guardar. Tus abonos no se han modificado.');
 }
 if (['PGRST204','42703'].includes(error.code||'') && /inventory_item_id|product_code|product_name|product_category|quantity|talla|color/i.test(error.message||'')) return new Error('Falta correr migration/016_inventory_sales_stock_and_lists.sql en Supabase. Ejecútalo y vuelve a guardar la venta.');
 return error;
}
// Cuando falta una columna en Supabase (porque todavía no se corrió una
// migración), Postgres/PostgREST avisan con el código 42703 (columna no
// existe) o PGRST204 (no está en la caché del esquema). En vez de un error
// genérico, esto arma un mensaje que dice exactamente qué migración correr.
export function businessColumnSaveError(error: {code?:string;message?:string}, column: string, migrationFile: string) {
 if (['PGRST204','42703'].includes(error.code||'') && new RegExp(column, 'i').test(error.message||'')) {
  return new Error(`Falta correr una migración en Supabase para esta función. Ejecuta el SQL de migration/${migrationFile} en el SQL Editor de Supabase y vuelve a intentarlo. No se perdió nada — el guardado solo no se pudo completar.`);
 }
 return error;
}
export function inventoryItemSaveError(error: {code?:string;message?:string}) {
 if (!['PGRST204','42703'].includes(error.code||'')) return error;
 if (/\bsku\b/i.test(error.message||'')) return new Error('Falta correr migration/016_inventory_sales_stock_and_lists.sql en Supabase. Ejecútalo antes de guardar códigos de inventario.');
 if (/\bnote\b/i.test(error.message||'')) return new Error('Falta correr migration/011_inventory_note.sql en Supabase. Ejecútalo en el SQL Editor de Supabase y vuelve a guardar.');
 if (/\btalla\b/i.test(error.message||'') || /\bcolor\b/i.test(error.message||'')) return new Error('Falta correr migration/010_inventory_talla_color.sql en Supabase. Ejecútalo en el SQL Editor de Supabase y vuelve a guardar.');
 return error;
}
