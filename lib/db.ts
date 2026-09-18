'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';

// ---------- Tipos (iguales a los que usaba la app con localStorage) ----------
export type Currency = 'C$' | 'US$';
export type Payment = { id: string; date: string; amount: number; note?: string };
export type Sale = { id: string; date: string; client: string; description: string; amount: number; currency?: Currency; enteredAmount?: number; status: string; paidAmount?: number; payments?: Payment[] };
export type Expense = { id: string; date: string; category: string; description: string; amount: number; currency?: Currency; enteredAmount?: number };
export type Account = { id: string; name: string; currency: Currency; balance: number; updated: string };
export type InventoryItem = { id: string; name: string; category: string; qty: number; unitValue: number; currency?: Currency; enteredUnitValue?: number };
export type InventoryClose = { id: string; month: string; date: string; items: InventoryItem[]; total: number; notes: string };
export type DebtPayment = { id: string; accountId: string; accountName: string; currency: Currency; amount: number; equivalentC: number; note: string };
export type MonthClose = { id: string; month: string; closedAt: string; rate: number; inventoryC: number; accounts: { name: string; currency: Currency; balance: number; equivalentC: number }[]; bankCashC: number; expensesC: number; salesC: number; currentValueC: number; baseC: number; resultC: number; notes: string; openingC?: number; debtPaymentsC?: number; carryForwardC?: number; debtNotes?: string; preCloseC?: number; debtPaymentDetails?: DebtPayment[] };
export type Quote = { id: string; date: string; client: string; description: string; amount: number; currency?: Currency; enteredAmount?: number; status: string };
export type InitialBase = { confirmed: boolean; baseUSD: number; baseC: number; confirmedAt?: string };

export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const toDbCurrency = (c?: Currency) => (c === 'US$' ? 'USD' : 'NIO');
const fromDbCurrency = (c: string): Currency => (c === 'USD' ? 'US$' : 'C$');
const dateOnly = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

// ---------- Arranque de sesión: negocio + cuentas por defecto ----------
export async function ensureBusiness(userId: string): Promise<string> {
  const { data: existing, error: e1 } = await supabase.from('business_users').select('business_id').eq('user_id', userId).limit(1).maybeSingle();
  if (e1) throw e1;
  if (existing) return existing.business_id as string;
  // Importante: generamos el id en el cliente y NO pedimos de vuelta la fila
  // recién insertada (sin .select()) — justo después de crear el negocio
  // todavía no existe la fila en business_users que la política de lectura
  // exige, así que pedir la fila de vuelta fallaría aunque el insert en sí
  // sí se permite.
  const businessId = uid();
  const { error: e2 } = await supabase.from('businesses').insert({ id: businessId, name: 'IMPRESA', country: 'Nicaragua', base_currency: 'NIO', initial_capital_usd: 4100, exchange_rate: 37 });
  if (e2) throw e2;
  const { error: e3 } = await supabase.from('business_users').insert({ business_id: businessId, user_id: userId, role: 'owner' });
  if (e3) throw e3;
  const { error: e4 } = await supabase.from('financial_accounts').insert([
    { business_id: businessId, name: 'BAC Dólares', type: 'bank', currency: 'USD', balance: 0 },
    { business_id: businessId, name: 'BAC Córdobas', type: 'bank', currency: 'NIO', balance: 0 },
    { business_id: businessId, name: 'Efectivo', type: 'cash', currency: 'NIO', balance: 0 }
  ]);
  if (e4) throw e4;
  return businessId;
}

export async function fetchBusinessSettings(businessId: string): Promise<{ rate: number; initialBase: InitialBase }> {
  const { data, error } = await supabase.from('businesses').select('*').eq('id', businessId).single();
  if (error) throw error;
  return {
    rate: Number(data.exchange_rate) || 37,
    initialBase: {
      confirmed: !!data.initial_base_confirmed,
      baseUSD: Number(data.initial_capital_usd) || 4100,
      baseC: data.initial_base_cordobas != null ? Number(data.initial_base_cordobas) : 0,
      confirmedAt: data.initial_base_confirmed_at ? dateOnly(data.initial_base_confirmed_at) : undefined
    }
  };
}
export async function updateRateRemote(businessId: string, rate: number) {
  const { error } = await supabase.from('businesses').update({ exchange_rate: rate }).eq('id', businessId);
  if (error) throw error;
}
export async function confirmInitialBaseRemote(businessId: string, baseC: number) {
  const { error } = await supabase.from('businesses').update({ initial_base_confirmed: true, initial_base_confirmed_at: new Date().toISOString(), initial_base_cordobas: baseC }).eq('id', businessId);
  if (error) throw error;
}

// ---------- Mapeos por entidad (fila de Supabase <-> objeto de la app) ----------
async function loadSales(businessId: string): Promise<Sale[]> {
  const { data, error } = await supabase.from('sales').select('*, sale_payments(*)').eq('business_id', businessId).order('sale_date', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id, date: dateOnly(r.sale_date), client: r.client || '', description: r.description || '',
    amount: Number(r.amount) || 0, currency: fromDbCurrency(r.currency), enteredAmount: r.entered_amount != null ? Number(r.entered_amount) : undefined,
    status: r.status || 'Pendiente', paidAmount: Number(r.paid_amount) || 0,
    payments: (r.sale_payments || []).map((p: any) => ({ id: p.id, date: dateOnly(p.payment_date), amount: Number(p.amount) || 0, note: p.note || undefined }))
      .sort((a: Payment, b: Payment) => a.date.localeCompare(b.date))
  }));
}
function saleToRow(businessId: string, rate: number, s: Sale) {
  return { id: s.id, business_id: businessId, sale_date: s.date, client: s.client, description: s.description, amount: s.amount, currency: toDbCurrency(s.currency), exchange_rate: rate, entered_amount: s.enteredAmount ?? null, status: s.status, paid_amount: s.paidAmount ?? 0 };
}

async function loadExpenses(businessId: string): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').eq('business_id', businessId).order('expense_date', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, date: dateOnly(r.expense_date), category: r.category || 'Operativo', description: r.description || '', amount: Number(r.amount) || 0, currency: fromDbCurrency(r.currency), enteredAmount: r.entered_amount != null ? Number(r.entered_amount) : undefined }));
}
function expenseToRow(businessId: string, rate: number, e: Expense) {
  return { id: e.id, business_id: businessId, expense_date: e.date, category: e.category, description: e.description, amount: e.amount, currency: toDbCurrency(e.currency), exchange_rate: rate, entered_amount: e.enteredAmount ?? null };
}

async function loadAccounts(businessId: string): Promise<Account[]> {
  const { data, error } = await supabase.from('financial_accounts').select('*').eq('business_id', businessId);
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, name: r.name, currency: fromDbCurrency(r.currency), balance: Number(r.balance) || 0, updated: dateOnly(r.updated_at) }));
}
function accountToRow(businessId: string, a: Account) {
  const type = /efectivo|caja/i.test(a.name) ? 'cash' : 'bank';
  return { id: a.id, business_id: businessId, name: a.name, type, currency: toDbCurrency(a.currency), balance: a.balance, updated_at: new Date().toISOString() };
}

async function loadQuotes(businessId: string): Promise<Quote[]> {
  const { data, error } = await supabase.from('quotes').select('*').eq('business_id', businessId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, date: dateOnly(r.quote_date), client: r.client || '', description: r.description || '', amount: Number(r.amount) || 0, currency: fromDbCurrency(r.currency), enteredAmount: r.entered_amount != null ? Number(r.entered_amount) : undefined, status: r.status || 'Borrador' }));
}
function quoteToRow(businessId: string, rate: number, q: Quote) {
  return { id: q.id, business_id: businessId, client: q.client, description: q.description, amount: q.amount, currency: toDbCurrency(q.currency), exchange_rate: rate, entered_amount: q.enteredAmount ?? null, status: q.status, quote_date: q.date };
}

async function loadMonthCloses(businessId: string): Promise<MonthClose[]> {
  const { data, error } = await supabase.from('month_closes').select('*').eq('business_id', businessId);
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id, month: r.month, closedAt: dateOnly(r.closed_at), rate: Number(r.exchange_rate) || 37,
    inventoryC: Number(r.inventory_cordobas) || 0, accounts: [], bankCashC: Number(r.bank_cash_cordobas) || 0,
    expensesC: Number(r.expenses_info_cordobas) || 0, salesC: Number(r.sales_info_cordobas) || 0,
    currentValueC: Number(r.current_value_cordobas) || 0, baseC: Number(r.previous_close_value_cordobas) || 0,
    resultC: Number(r.result_cordobas) || 0, notes: r.notes || '',
    openingC: r.opening_cordobas != null ? Number(r.opening_cordobas) : undefined,
    debtPaymentsC: Number(r.debt_payments_cordobas) || 0,
    carryForwardC: r.carry_forward_cordobas != null ? Number(r.carry_forward_cordobas) : undefined,
    debtNotes: r.debt_notes || '', preCloseC: r.pre_close_cordobas != null ? Number(r.pre_close_cordobas) : undefined,
    debtPaymentDetails: r.debt_payment_details || []
  }));
}
export async function addMonthCloseRemote(businessId: string, mc: MonthClose) {
  const { error } = await supabase.from('month_closes').insert({
    id: mc.id, business_id: businessId, month: mc.month, exchange_rate: mc.rate, inventory_cordobas: mc.inventoryC,
    bank_cash_cordobas: mc.bankCashC, current_value_cordobas: mc.currentValueC, previous_close_value_cordobas: mc.baseC,
    result_cordobas: mc.resultC, sales_info_cordobas: mc.salesC, expenses_info_cordobas: mc.expensesC, notes: mc.notes,
    opening_cordobas: mc.openingC ?? null, debt_payments_cordobas: mc.debtPaymentsC ?? 0,
    carry_forward_cordobas: mc.carryForwardC ?? null, debt_notes: mc.debtNotes ?? null,
    pre_close_cordobas: mc.preCloseC ?? null, debt_payment_details: mc.debtPaymentDetails ?? []
  });
  if (error) throw error;
}

// ---------- Inventario mensual (filas por producto, agrupadas por mes) ----------
export async function loadInventory(businessId: string): Promise<InventoryClose[]> {
  const [{ data: items, error: e1 }, { data: notesRows, error: e2 }] = await Promise.all([
    supabase.from('monthly_inventory').select('*').eq('business_id', businessId),
    supabase.from('inventory_month_notes').select('*').eq('business_id', businessId)
  ]);
  if (e1) throw e1; if (e2) throw e2;
  const notesByMonth: Record<string, string> = {};
  (notesRows || []).forEach((n: any) => { notesByMonth[n.month] = n.notes || ''; });
  const byMonth: Record<string, any[]> = {};
  (items || []).forEach((r: any) => { (byMonth[r.month] ||= []).push(r); });
  return Object.entries(byMonth).map(([month, rows]) => {
    const mapped: InventoryItem[] = rows.map((r: any) => ({ id: r.id, name: r.product_name, category: r.category || '', qty: Number(r.quantity) || 0, unitValue: Number(r.unit_value_cordobas) || 0, currency: fromDbCurrency(r.currency), enteredUnitValue: r.entered_unit_value != null ? Number(r.entered_unit_value) : undefined }));
    const total = mapped.reduce((a, x) => a + x.qty * x.unitValue, 0);
    return { id: month, month, date: month, items: mapped, total, notes: notesByMonth[month] || '' };
  });
}
export async function addInventoryItemRemote(businessId: string, month: string, item: InventoryItem) {
  const { error } = await supabase.from('monthly_inventory').insert({ id: item.id, business_id: businessId, month, product_name: item.name, category: item.category, quantity: item.qty, unit_value_cordobas: item.unitValue, currency: toDbCurrency(item.currency), entered_unit_value: item.enteredUnitValue ?? null });
  if (error) throw error;
}
export async function deleteInventoryItemRemote(itemId: string) {
  const { error } = await supabase.from('monthly_inventory').delete().eq('id', itemId);
  if (error) throw error;
}
export async function deleteInventoryMonthRemote(businessId: string, month: string) {
  await supabase.from('monthly_inventory').delete().eq('business_id', businessId).eq('month', month);
  await supabase.from('inventory_month_notes').delete().eq('business_id', businessId).eq('month', month);
}

// ---------- Ventas: abono / pago inicial ----------
export async function addSalePaymentRemote(saleId: string, payment: Payment) {
  const { error } = await supabase.from('sale_payments').insert({ id: payment.id, sale_id: saleId, amount: payment.amount, payment_date: payment.date, note: payment.note || null });
  if (error) throw error;
}
export async function updateSalePaidRemote(saleId: string, paidAmount: number, status: string) {
  const { error } = await supabase.from('sales').update({ paid_amount: paidAmount, status }).eq('id', saleId);
  if (error) throw error;
}

// ---------- Hook genérico: colección local sincronizada con una tabla ----------
// Mantiene la MISMA forma que useState([...]) para no tocar la lógica de cada
// pantalla (Ventas/Gastos/Cuentas/Cotizaciones siguen usando setX(nuevoArreglo)),
// pero además calcula qué cambió y lo guarda en Supabase en segundo plano.
function useCloudCollection<T extends { id: string }>(
  businessId: string | null,
  load: (businessId: string) => Promise<T[]>,
  table: string,
  toRow: (businessId: string, item: T) => any,
  onAfterUpsert?: (businessId: string, item: T, old: T | undefined) => Promise<void>
) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const prevRef = useRef<T[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!businessId) { setItems([]); prevRef.current = []; setReady(false); return; }
    setReady(false);
    load(businessId).then(rows => { if (cancelled) return; prevRef.current = rows; setItems(rows); setReady(true); })
      .catch(err => { console.error('IMPRESA: no se pudo cargar ' + table, err); if (!cancelled) setReady(true); });
    return () => { cancelled = true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, table]);

  const setValue = (next: T[] | ((prev: T[]) => T[])) => {
    const resolved = typeof next === 'function' ? (next as (prev: T[]) => T[])(prevRef.current) : next;
    const prev = prevRef.current;
    const prevMap = new Map(prev.map(x => [x.id, x]));
    const nextMap = new Map(resolved.map(x => [x.id, x]));
    const toDelete: string[] = [];
    prevMap.forEach((_, id) => { if (!nextMap.has(id)) toDelete.push(id); });
    const toUpsert: { item: T; old?: T }[] = [];
    resolved.forEach(item => { const old = prevMap.get(item.id); if (!old || JSON.stringify(old) !== JSON.stringify(item)) toUpsert.push({ item, old }); });
    prevRef.current = resolved;
    setItems(resolved);
    if (!businessId) return;
    (async () => {
      if (toDelete.length) { const { error } = await supabase.from(table).delete().in('id', toDelete); if (error) throw error; }
      for (const { item, old } of toUpsert) {
        const { error } = await supabase.from(table).upsert(toRow(businessId, item));
        if (error) throw error;
        if (onAfterUpsert) await onAfterUpsert(businessId, item, old);
      }
    })().catch(err => { console.error('IMPRESA: no se pudo guardar en ' + table, err); alert('No se pudo guardar el cambio en la nube. Revisa tu conexión e inténtalo de nuevo.'); });
  };

  return [items, setValue, ready] as const;
}

export function useSalesCloud(businessId: string | null, rate: number) {
  return useCloudCollection<Sale>(businessId, loadSales, 'sales', (b, s) => saleToRow(b, rate, s), async (b, item, old) => {
    const oldPayments = old?.payments || [];
    const newPayments = item.payments || [];
    if (newPayments.length > oldPayments.length) {
      const oldIds = new Set(oldPayments.map(p => p.id));
      for (const p of newPayments) if (!oldIds.has(p.id)) await addSalePaymentRemote(item.id, p);
    }
  });
}
export function useExpensesCloud(businessId: string | null, rate: number) {
  return useCloudCollection<Expense>(businessId, loadExpenses, 'expenses', (b, e) => expenseToRow(b, rate, e));
}
export function useAccountsCloud(businessId: string | null) {
  return useCloudCollection<Account>(businessId, loadAccounts, 'financial_accounts', accountToRow);
}
export function useQuotesCloud(businessId: string | null, rate: number) {
  return useCloudCollection<Quote>(businessId, loadQuotes, 'quotes', (b, q) => quoteToRow(b, rate, q));
}
export function useMonthClosesCloud(businessId: string | null) {
  // Los cierres solo se agregan, nunca se editan ni se borran desde la app,
  // así que no necesitan el diffing genérico: solo cargar + insertar.
  const [items, setItems] = useState<MonthClose[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!businessId) { setItems([]); setReady(false); return; }
    setReady(false);
    loadMonthCloses(businessId).then(rows => { if (!cancelled) { setItems(rows); setReady(true); } })
      .catch(err => { console.error('IMPRESA: no se pudo cargar month_closes', err); if (!cancelled) setReady(true); });
    return () => { cancelled = true };
  }, [businessId]);
  const addClose = async (mc: MonthClose) => { await addMonthCloseRemote(businessId as string, mc); setItems(prev => [...prev, mc]); };
  return [items, addClose, ready] as const;
}
