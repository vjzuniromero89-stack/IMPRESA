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
 return error;
}
