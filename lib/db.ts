'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import {changedSaleFields, saleSaveError, businessColumnSaveError, inventoryItemSaveError} from './salePersistence';

// ---------- Tipos (iguales a los que usaba la app con localStorage) ----------
export type Currency = 'C$' | 'US$';
export type PaymentMethod = string;
export type Payment = { id: string; date: string; amount: number; note?: string; method?: PaymentMethod; paymentChannel?: 'Transferencia'|'Efectivo'; accountId?: string; accountName?: string };
export type SaleLine = { id:string; mode:'inventory'|'manual'; inventoryItemId?:string; productCode?:string; name:string; category?:string; talla?:string; color?:string; quantity:number; unitCostC?:number; unitPrice:number };
export type Sale = { id: string; date: string; client: string; description: string; amount: number; currency?: Currency; enteredAmount?: number; status: string; paidAmount?: number; payments?: Payment[]; paymentMethod?: PaymentMethod; inventoryItemId?: string; productCode?: string; productName?: string; productCategory?: string; talla?: string; color?: string; quantity?: number; lineItems?:SaleLine[] };
export type Expense = { id: string; date: string; category: string; description: string; amount: number; currency?: Currency; enteredAmount?: number; paymentChannel?: string; sourceAccountId?: string; sourceAccountName?: string };
export type Account = { id: string; name: string; currency: Currency; balance: number; updated: string };
export type InventoryItem = { id: string; sku?: string; name: string; category: string; talla?: string; color?: string; qty: number; unitValue: number; currency?: Currency; enteredUnitValue?: number; note?: string };
export type InventoryClose = { id: string; month: string; date: string; items: InventoryItem[]; total: number; notes: string };
export type DebtPayment = { id: string; accountId: string; accountName: string; currency: Currency; amount: number; equivalentC: number; note: string; debtId?: string; debtDescription?: string };
export type Debt = { id: string; description: string; totalAmount: number; currency?: Currency; enteredTotal?: number; affectsPercent: boolean; createdAt: string };
export type DebtPaymentRecord = { id: string; debtId: string; month?: string; accountId?: string; accountName?: string; currency: Currency; amount: number; equivalentC: number; note?: string; at: string };
export type AccountBalanceEntry = { id: string; accountId: string; accountName: string; currency: Currency; previousBalance: number; newBalance: number; changedBy?: string; description?: string; sourceType?: string; sourceId?: string; transactionDate?: string; at: string };
export type MonthClose = { id: string; month: string; closedAt: string; rate: number; inventoryC: number; accounts: { name: string; currency: Currency; balance: number; equivalentC: number }[]; bankCashC: number; expensesC: number; salesC: number; currentValueC: number; baseC: number; resultC: number; notes: string; openingC?: number; debtPaymentsC?: number; carryForwardC?: number; debtNotes?: string; preCloseC?: number; debtPaymentDetails?: DebtPayment[] };
export type Quote = { id: string; date: string; client: string; description: string; amount: number; currency?: Currency; enteredAmount?: number; status: string };
export type InitialBase = { confirmed: boolean; baseUSD: number; baseC: number; confirmedAt?: string };
export type BusinessUserRole = 'admin' | 'usuario';
export type AppUser = { id: string; username: string; role: BusinessUserRole; createdAt: string };
export type ActivityEntry = { id: string; username: string; action: string; entity: string; description: string; at: string };
export type LogInfo = { userId?: string; username?: string };

export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const toDbCurrency = (c?: Currency) => (c === 'US$' ? 'USD' : 'NIO');
const fromDbCurrency = (c: string): Currency => (c === 'USD' ? 'US$' : 'C$');
const dateOnly = (v?: string | null) => (v ? String(v).slice(0, 10) : '');
const fmt = (n: number) => 'C$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);

// ---------- Arranque: negocio + cuentas por defecto (sin inicio de sesión) ----------
// Ya no hay usuario ni contraseña: la app trabaja siempre con UN solo
// negocio, guardado en Supabase (la nube) — así se ve igual desde la PC,
// el celular o cualquier dispositivo. Si no existe todavía, se crea la
// primera vez que alguien entra.
//
// Importante: esto NO se guarda en el navegador ni en el dispositivo. Cada
// vez que la app carga, le pregunta a Supabase cuál es el negocio y usa
// siempre el mismo criterio (el más antiguo, y si dos tuvieran la misma
// fecha, se desempata por id) — así, sin importar el aparato, todos
// terminan viendo exactamente el mismo negocio y los mismos datos.
export async function ensureBusiness(): Promise<string> {
  const { data: existing, error: e1 } = await supabase.from('businesses').select('id').order('created_at', { ascending: true }).order('id', { ascending: true }).limit(1).maybeSingle();
  if (e1) throw e1;
  if (existing) return existing.id as string;
  const businessId = uid();
  const { error: e2 } = await supabase.from('businesses').insert({ id: businessId, name: 'IMPRESA', country: 'Nicaragua', base_currency: 'NIO', initial_capital_usd: 4100, exchange_rate: 37 });
  if (e2) throw e2;
  const { error: e4 } = await supabase.from('financial_accounts').insert([
    { business_id: businessId, name: 'BAC Dólares', type: 'bank', currency: 'USD', balance: 0 },
    { business_id: businessId, name: 'BAC Córdobas', type: 'bank', currency: 'NIO', balance: 0 },
    { business_id: businessId, name: 'Efectivo', type: 'cash', currency: 'NIO', balance: 0 }
  ]);
  if (e4) throw e4;
  return businessId;
}

// ---------- Contraseñas: hash en el navegador (PBKDF2 + sal) ----------
// Nunca se manda ni se guarda la contraseña en texto plano. Esto NO
// reemplaza a un backend real: como las tablas quedaron abiertas (sin
// inicio de sesión de Supabase), alguien con la llave anon técnicamente
// podría leer el hash y tratar de adivinarlo offline. Sirve para que la
// pantalla de entrada funcione como se pidió (usuario/contraseña, roles
// Administrativo/Usuario), no como una bóveda a prueba de todo.
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
async function pbkdf2(password: string, saltHex?: string): Promise<{ salt: string; hash: string }> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 150000, hash: 'SHA-256' }, keyMaterial, 256);
  return { salt: bytesToHex(salt), hash: bytesToHex(new Uint8Array(bits)) };
}

// ---------- Usuarios del negocio (pestaña "Usuarios") ----------
// Usuario y contraseña reales, con dos roles: admin (Administrativo) y
// usuario (Usuario). Con esas credenciales se entra a la app.
export async function listAppUsers(businessId: string): Promise<AppUser[]> {
  const { data, error } = await supabase.from('app_users').select('id, username, role, created_at').eq('business_id', businessId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, username: r.username || '(sin nombre)', role: (r.role as BusinessUserRole) || 'usuario', createdAt: dateOnly(r.created_at) }));
}

// true si ya existe al menos una cuenta con contraseña en este negocio.
// Sirve para decidir si la pantalla de entrada debe ofrecer "crear tu
// primera cuenta" (Administrativo) o el formulario normal de inicio de sesión.
export async function hasAnyLoginableUser(businessId: string): Promise<boolean> {
  const { data, error } = await supabase.from('app_users').select('id').eq('business_id', businessId).not('password_hash', 'is', null).limit(1);
  if (error) throw error;
  return !!(data && data.length);
}

export async function addAppUser(businessId: string, rawUsername: string, password: string, role: BusinessUserRole): Promise<AppUser> {
  const username = (rawUsername || '').trim();
  if (username.length < 3) throw new Error('El usuario debe tener al menos 3 letras o números.');
  if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  const { data: existing, error: e0 } = await supabase.from('app_users').select('id, username').eq('business_id', businessId);
  if (e0) throw e0;
  if ((existing || []).some((r: any) => (r.username || '').toLowerCase() === username.toLowerCase())) {
    throw new Error('Ese usuario ya existe. Elige otro.');
  }
  const { salt, hash } = await pbkdf2(password);
  const id = uid();
  const { error } = await supabase.from('app_users').insert({ id, business_id: businessId, username, role, password_salt: salt, password_hash: hash });
  if (error) throw error;
  return { id, username, role, createdAt: dateOnly(new Date().toISOString()) };
}

export async function authenticateUser(businessId: string, rawUsername: string, password: string): Promise<AppUser> {
  const username = (rawUsername || '').trim();
  const { data, error } = await supabase.from('app_users').select('*').eq('business_id', businessId);
  if (error) throw error;
  const row = (data || []).find((r: any) => (r.username || '').toLowerCase() === username.toLowerCase());
  const fail = (): never => { throw new Error('Usuario o contraseña incorrectos.'); };
  if (!row || !row.password_hash || !row.password_salt) return fail();
  const { hash } = await pbkdf2(password, row.password_salt);
  if (hash !== row.password_hash) return fail();
  return { id: row.id, username: row.username, role: (row.role as BusinessUserRole) || 'usuario', createdAt: dateOnly(row.created_at) };
}

export async function removeAppUser(id: string) {
  const { error } = await supabase.from('app_users').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Registro de actividad ----------
export async function logActivity(businessId: string | null, userId: string | undefined, username: string, action: string, entity: string, description: string) {
  if (!businessId) return;
  try {
    const { error } = await supabase.from('activity_log').insert({ business_id: businessId, user_id: userId || null, username: username || '', action, entity, description });
    if (error) throw error;
  } catch (err) {
    // El registro de actividad nunca debe romper la operación principal.
    console.error('IMPRESA: no se pudo registrar la actividad', err);
  }
}

export async function listActivity(businessId: string): Promise<ActivityEntry[]> {
  const { data, error } = await supabase.from('activity_log').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, username: r.username || '—', action: r.action, entity: r.entity || '', description: r.description, at: r.created_at }));
}

const DEFAULT_INVENTORY_CATEGORIES = ['Camisas', 'Hilos', 'Tintas', 'Vinil', 'Sublimación', 'Empaque', 'Otros'];
const DEFAULT_PAYMENT_METHODS = ['Transferencia', 'Efectivo'];
const DEFAULT_INVENTORY_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2', '4', '6', '8', '10', '12', '14', '16'];
const DEFAULT_EXPENSE_CATEGORIES = ['Materiales', 'Operativo', 'Servicios', 'Transporte', 'Nómina', 'Publicidad', 'Equipos', 'Otro'];
const DEFAULT_EXPENSE_PAYMENT_METHODS = ['Efectivo','Transferencia / BAC'];

export async function fetchBusinessSettings(businessId: string): Promise<{ rate: number; initialBase: InitialBase; inventoryCategories: string[]; paymentMethods: string[]; inventorySizes: string[]; expenseCategories: string[]; expensePaymentMethods: string[]; inventoryBaselineMonth: string | null }> {
  const { data, error } = await supabase.from('businesses').select('*').eq('id', businessId).single();
  if (error) throw error;
  return {
    rate: Number(data.exchange_rate) || 37,
    initialBase: {
      confirmed: !!data.initial_base_confirmed,
      baseUSD: Number(data.initial_capital_usd) || 4100,
      baseC: data.initial_base_cordobas != null ? Number(data.initial_base_cordobas) : 0,
      confirmedAt: data.initial_base_confirmed_at ? dateOnly(data.initial_base_confirmed_at) : undefined
    },
    inventoryCategories: (Array.isArray(data.inventory_categories) && data.inventory_categories.length) ? data.inventory_categories : DEFAULT_INVENTORY_CATEGORIES,
    paymentMethods: (Array.isArray(data.payment_methods) && data.payment_methods.length) ? data.payment_methods : DEFAULT_PAYMENT_METHODS,
    inventorySizes: (Array.isArray(data.inventory_sizes) && data.inventory_sizes.length) ? data.inventory_sizes : DEFAULT_INVENTORY_SIZES,
    expenseCategories: (Array.isArray(data.expense_categories) && data.expense_categories.length) ? data.expense_categories : DEFAULT_EXPENSE_CATEGORIES,
    expensePaymentMethods: (Array.isArray(data.expense_payment_methods) && data.expense_payment_methods.length) ? data.expense_payment_methods : DEFAULT_EXPENSE_PAYMENT_METHODS,
    inventoryBaselineMonth: data.inventory_baseline_month || null
  };
}
export async function setInventoryBaselineMonthRemote(businessId: string, month: string | null) {
  const { error } = await supabase.from('businesses').update({ inventory_baseline_month: month }).eq('id', businessId);
  if (error) throw businessColumnSaveError(error, 'inventory_baseline_month', '013_inventory_baseline.sql');
}
export async function updateRateRemote(businessId: string, rate: number) {
  const { error } = await supabase.from('businesses').update({ exchange_rate: rate }).eq('id', businessId);
  if (error) throw error;
}
export async function confirmInitialBaseRemote(businessId: string, baseC: number) {
  const { error } = await supabase.from('businesses').update({ initial_base_confirmed: true, initial_base_confirmed_at: new Date().toISOString(), initial_base_cordobas: baseC }).eq('id', businessId);
  if (error) throw error;
}

// ---------- Categorías de inventario y métodos de pago (listas "+ Agregar") ----------
// Se guardan en la fila del negocio (tabla "businesses") como arreglo de
// texto, para que la lista de opciones se vea igual en cualquier
// dispositivo. Si alguien más agregó una entre que tú cargabas la página,
// se vuelve a leer la lista actual antes de agregar la tuya, para no perder
// la del otro.
const BUSINESS_LIST_MIGRATIONS: Record<string, string> = {
  inventory_categories: '009_custom_categories_and_payment_methods.sql',
  payment_methods: '009_custom_categories_and_payment_methods.sql',
  inventory_sizes: '012_inventory_sizes.sql',
  expense_categories: '014_expense_categories.sql',
  expense_payment_methods: '016_inventory_sales_stock_and_lists.sql'
};
async function appendBusinessListRemote(businessId: string, column: 'inventory_categories' | 'payment_methods' | 'inventory_sizes' | 'expense_categories' | 'expense_payment_methods', fallback: string[], value: string): Promise<string[]> {
  const name = (value || '').trim();
  if (!name) throw new Error('Escribe un nombre antes de guardar.');
  const { data, error } = await supabase.from('businesses').select(column).eq('id', businessId).single();
  if (error) throw businessColumnSaveError(error, column, BUSINESS_LIST_MIGRATIONS[column]);
  const current: string[] = (Array.isArray((data as any)?.[column]) && (data as any)[column].length) ? (data as any)[column] : fallback;
  if (current.some(c => c.toLowerCase() === name.toLowerCase())) return current;
  const next = [...current, name];
  const { error: e2 } = await supabase.from('businesses').update({ [column]: next }).eq('id', businessId);
  if (e2) throw businessColumnSaveError(e2, column, BUSINESS_LIST_MIGRATIONS[column]);
  return next;
}
export async function addInventoryCategoryRemote(businessId: string, category: string): Promise<string[]> {
  return appendBusinessListRemote(businessId, 'inventory_categories', DEFAULT_INVENTORY_CATEGORIES, category);
}
export async function addPaymentMethodRemote(businessId: string, method: string): Promise<string[]> {
  return appendBusinessListRemote(businessId, 'payment_methods', DEFAULT_PAYMENT_METHODS, method);
}
export async function addInventorySizeRemote(businessId: string, size: string): Promise<string[]> {
  return appendBusinessListRemote(businessId, 'inventory_sizes', DEFAULT_INVENTORY_SIZES, size);
}
export async function addExpenseCategoryRemote(businessId: string, category: string): Promise<string[]> {
  return appendBusinessListRemote(businessId, 'expense_categories', DEFAULT_EXPENSE_CATEGORIES, category);
}
export async function addExpensePaymentMethodRemote(businessId: string, method: string): Promise<string[]> {
  return appendBusinessListRemote(businessId, 'expense_payment_methods', DEFAULT_EXPENSE_PAYMENT_METHODS, method);
}
// Quitar un valor de una de estas listas guardadas. Lo que ya está usado en
// productos/ventas anteriores conserva su dato tal cual — esto solo lo quita
// de la lista para que no se vuelva a elegir en registros nuevos.
async function removeBusinessListItemRemote(businessId: string, column: 'inventory_categories' | 'payment_methods' | 'inventory_sizes' | 'expense_categories' | 'expense_payment_methods', fallback: string[], value: string): Promise<string[]> {
  const { data, error } = await supabase.from('businesses').select(column).eq('id', businessId).single();
  if (error) throw businessColumnSaveError(error, column, BUSINESS_LIST_MIGRATIONS[column]);
  const current: string[] = (Array.isArray((data as any)?.[column]) && (data as any)[column].length) ? (data as any)[column] : fallback;
  const next = current.filter(c => c.toLowerCase() !== value.trim().toLowerCase());
  const { error: e2 } = await supabase.from('businesses').update({ [column]: next }).eq('id', businessId);
  if (e2) throw businessColumnSaveError(e2, column, BUSINESS_LIST_MIGRATIONS[column]);
  return next;
}
export async function removeInventoryCategoryRemote(businessId: string, category: string): Promise<string[]> {
  return removeBusinessListItemRemote(businessId, 'inventory_categories', DEFAULT_INVENTORY_CATEGORIES, category);
}
export async function removePaymentMethodRemote(businessId: string, method: string): Promise<string[]> {
  return removeBusinessListItemRemote(businessId, 'payment_methods', DEFAULT_PAYMENT_METHODS, method);
}
export async function removeInventorySizeRemote(businessId: string, size: string): Promise<string[]> {
  return removeBusinessListItemRemote(businessId, 'inventory_sizes', DEFAULT_INVENTORY_SIZES, size);
}
export async function removeExpenseCategoryRemote(businessId: string, category: string): Promise<string[]> {
  return removeBusinessListItemRemote(businessId, 'expense_categories', DEFAULT_EXPENSE_CATEGORIES, category);
}
export async function removeExpensePaymentMethodRemote(businessId: string, method: string): Promise<string[]> {
  return removeBusinessListItemRemote(businessId, 'expense_payment_methods', DEFAULT_EXPENSE_PAYMENT_METHODS, method);
}

// ---------- Mapeos por entidad (fila de Supabase <-> objeto de la app) ----------
async function loadSales(businessId: string): Promise<Sale[]> {
  const { data, error } = await supabase.from('sales').select('*, sale_payments(*)').eq('business_id', businessId).order('sale_date', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id, date: dateOnly(r.sale_date), client: r.client || '', description: r.description || '',
    amount: Number(r.amount) || 0, currency: fromDbCurrency(r.currency), enteredAmount: r.entered_amount != null ? Number(r.entered_amount) : undefined,
    paymentMethod: r.payment_method || undefined, inventoryItemId:r.inventory_item_id||undefined, productCode:r.product_code||undefined, productName:r.product_name||undefined, productCategory:r.product_category||undefined, talla:r.talla||undefined, color:r.color||undefined, quantity:r.quantity!=null?Number(r.quantity):undefined, lineItems:Array.isArray(r.line_items)?r.line_items:undefined, status: r.status || 'Pendiente', paidAmount: Number(r.paid_amount) || 0,
    payments: (r.sale_payments || []).map((p: any) => ({ id: p.id, date: dateOnly(p.payment_date), amount: Number(p.amount) || 0, note: p.note || undefined, method: p.payment_method || undefined, paymentChannel: p.payment_method || undefined, accountId: p.account_id || undefined, accountName: p.account_name || undefined }))
      .sort((a: Payment, b: Payment) => a.date.localeCompare(b.date))
  }));
}
function saleToRow(businessId: string, rate: number, s: Sale) {
  return { id: s.id, business_id: businessId, sale_date: s.date, client: s.client, description: s.description, amount: s.amount, currency: toDbCurrency(s.currency), exchange_rate: rate, entered_amount: s.enteredAmount ?? null, status: s.status, payment_method: s.paymentMethod || null, paid_amount: s.paidAmount ?? 0, inventory_item_id:s.inventoryItemId||null, product_code:s.productCode||null, product_name:s.productName||null, product_category:s.productCategory||null, talla:s.talla||null, color:s.color||null, quantity:s.quantity??null, line_items:s.lineItems||null };
}

async function loadExpenses(businessId: string): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').eq('business_id', businessId).order('expense_date', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, date: dateOnly(r.expense_date), category: r.category || 'Operativo', description: r.description || '', amount: Number(r.amount) || 0, currency: fromDbCurrency(r.currency), enteredAmount: r.entered_amount != null ? Number(r.entered_amount) : undefined, paymentChannel: r.payment_channel || undefined, sourceAccountId: r.source_account_id || undefined, sourceAccountName: r.source_account_name || undefined }));
}
function expenseToRow(businessId: string, rate: number, e: Expense) {
  return { id: e.id, business_id: businessId, expense_date: e.date, category: e.category, description: e.description, amount: e.amount, currency: toDbCurrency(e.currency), exchange_rate: rate, entered_amount: e.enteredAmount ?? null, payment_channel: e.paymentChannel || null, source_account_id: e.sourceAccountId || null, source_account_name: e.sourceAccountName || null };
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

// Historial de saldos de "Banco y Efectivo": cada vez que se actualiza el
// saldo de una cuenta queda anotado el saldo anterior y el nuevo.
export async function addAccountBalanceHistoryRemote(businessId: string, entry: { id: string; accountId: string; accountName: string; currency: Currency; previousBalance: number; newBalance: number; changedBy?: string; description?: string; sourceType?: string; sourceId?: string; transactionDate?: string }) {
  const { error } = await supabase.from('account_balance_history').insert({
    id: entry.id, business_id: businessId, account_id: entry.accountId, account_name: entry.accountName,
    currency: toDbCurrency(entry.currency), previous_balance: entry.previousBalance, new_balance: entry.newBalance, changed_by: entry.changedBy || null,
    description: entry.description || null, source_type: entry.sourceType || null, source_id: entry.sourceId || null, transaction_date: entry.transactionDate || null
  });
  if (error) throw error;
}
export async function loadAccountBalanceHistory(businessId: string): Promise<AccountBalanceEntry[]> {
  const { data, error } = await supabase.from('account_balance_history').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, accountId: r.account_id, accountName: r.account_name || '', currency: fromDbCurrency(r.currency), previousBalance: Number(r.previous_balance) || 0, newBalance: Number(r.new_balance) || 0, changedBy: r.changed_by || undefined, description: r.description || undefined, sourceType: r.source_type || undefined, sourceId: r.source_id || undefined, transactionDate: dateOnly(r.transaction_date) || undefined, at: r.created_at }));
}
export async function removeAccountBalanceHistoryRemote(id: string) {
  const { error } = await supabase.from('account_balance_history').delete().eq('id', id);
  if (error) throw error;
}

async function loadQuotes(businessId: string): Promise<Quote[]> {
  const { data, error } = await supabase.from('quotes').select('*').eq('business_id', businessId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, date: dateOnly(r.quote_date), client: r.client || '', description: r.description || '', amount: Number(r.amount) || 0, currency: fromDbCurrency(r.currency), enteredAmount: r.entered_amount != null ? Number(r.entered_amount) : undefined, status: r.status || 'Borrador' }));
}
function quoteToRow(businessId: string, rate: number, q: Quote) {
  return { id: q.id, business_id: businessId, client: q.client, description: q.description, amount: q.amount, currency: toDbCurrency(q.currency), exchange_rate: rate, entered_amount: q.enteredAmount ?? null, status: q.status, quote_date: q.date };
}

async function loadDebts(businessId: string): Promise<Debt[]> {
  const { data, error } = await supabase.from('debts').select('*').eq('business_id', businessId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, description: r.description || '', totalAmount: Number(r.total_amount) || 0, currency: fromDbCurrency(r.currency), enteredTotal: r.entered_total != null ? Number(r.entered_total) : undefined, affectsPercent: !!r.affects_percent, createdAt: dateOnly(r.created_at) }));
}
function debtToRow(businessId: string, rate: number, d: Debt) {
  return { id: d.id, business_id: businessId, description: d.description, total_amount: d.totalAmount, currency: toDbCurrency(d.currency), exchange_rate: rate, entered_total: d.enteredTotal ?? null, affects_percent: d.affectsPercent };
}

// Pagos hechos a una deuda (uno inicial al crearla y luego uno por cada
// pago que se registre en Cierre de mes vinculado a esa deuda).
export async function addDebtPaymentRemote(businessId: string, debtId: string, payment: { id: string; accountId?: string | null; accountName?: string | null; currency: Currency; amount: number; equivalentC: number; note?: string; month?: string }) {
  const { error } = await supabase.from('debt_payments').insert({
    id: payment.id, debt_id: debtId, business_id: businessId, month: payment.month || null,
    account_id: payment.accountId || null, account_name: payment.accountName || null,
    currency: toDbCurrency(payment.currency), amount: payment.amount, equivalent_cordobas: payment.equivalentC, note: payment.note || null
  });
  if (error) throw error;
}
export async function loadDebtPayments(businessId: string): Promise<DebtPaymentRecord[]> {
  const { data, error } = await supabase.from('debt_payments').select('*').eq('business_id', businessId).order('paid_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, debtId: r.debt_id, month: r.month || undefined, accountId: r.account_id || undefined, accountName: r.account_name || undefined, currency: fromDbCurrency(r.currency), amount: Number(r.amount) || 0, equivalentC: Number(r.equivalent_cordobas) || 0, note: r.note || undefined, at: r.paid_at }));
}
export async function removeDebtPaymentRemote(paymentId: string) {
  const { error } = await supabase.from('debt_payments').delete().eq('id', paymentId);
  if (error) throw error;
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
    const mapped: InventoryItem[] = rows.map((r: any) => ({ id: r.id, sku:r.sku||'', name: r.product_name, category: r.category || '', talla: r.talla || '', color: r.color || '', qty: Number(r.quantity) || 0, unitValue: Number(r.unit_value_cordobas) || 0, currency: fromDbCurrency(r.currency), enteredUnitValue: r.entered_unit_value != null ? Number(r.entered_unit_value) : undefined, note: r.note || '' }));
    const total = mapped.reduce((a, x) => a + x.qty * x.unitValue, 0);
    return { id: month, month, date: month, items: mapped, total, notes: notesByMonth[month] || '' };
  });
}
function inventoryItemFields(item: InventoryItem) {
  return { sku:item.sku||null, product_name: item.name, category: item.category, talla: item.talla || null, color: item.color || null, quantity: item.qty, unit_value_cordobas: item.unitValue, currency: toDbCurrency(item.currency), entered_unit_value: item.enteredUnitValue ?? null, note: item.note || null };
}
function inventoryItemToRow(businessId: string, month: string, item: InventoryItem) {
  return { id: item.id, business_id: businessId, month, ...inventoryItemFields(item) };
}
export async function addInventoryItemRemote(businessId: string, month: string, item: InventoryItem) {
  const { error } = await supabase.from('monthly_inventory').insert(inventoryItemToRow(businessId, month, item));
  if (error) throw inventoryItemSaveError(error);
}
export async function updateInventoryItemRemote(itemId: string, item: InventoryItem) {
  const { error } = await supabase.from('monthly_inventory').update(inventoryItemFields(item)).eq('id', itemId);
  if (error) throw inventoryItemSaveError(error);
}
// Importación desde Excel: inserta muchos productos de una sola vez (en
// bloques, para no mandar una sola petición gigante si el archivo es muy
// grande).
export async function addInventoryItemsBulkRemote(businessId: string, month: string, items: InventoryItem[]) {
  const rows = items.map(item => inventoryItemToRow(businessId, month, item));
  const chunkSize = 300;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { error } = await supabase.from('monthly_inventory').insert(rows.slice(i, i + chunkSize));
    if (error) throw inventoryItemSaveError(error);
  }
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
  const { error } = await supabase.from('sale_payments').insert({ id: payment.id, sale_id: saleId, amount: payment.amount, payment_date: payment.date, note: payment.note || null, payment_method: payment.method || payment.accountName || null, account_id: payment.accountId || null, account_name: payment.accountName || null });
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
  onAfterUpsert?: (businessId: string, item: T, old: T | undefined) => Promise<void>,
  logInfo?: LogInfo & { label: string }
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
    const confirmedSave = table === 'sales' || table === 'expenses';
    if (confirmedSave && (!ready || !businessId)) return Promise.reject(new Error('Los datos todavía se están cargando.'));
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
    return (async () => {
      if (toDelete.length) {
        const { error } = await supabase.from(table).delete().in('id', toDelete);
        if (error) throw error;
        if (logInfo) for (const _id of toDelete) await logActivity(businessId, logInfo.userId, logInfo.username || '', 'deleted', table, `Eliminó ${logInfo.label}`);
      }
      for (const { item, old } of toUpsert) {
        if (table === 'sales' && old) {
          const changes = changedSaleFields(toRow(businessId, old), toRow(businessId, item));
          if (Object.keys(changes).length) {
            const { data, error } = await supabase.from(table).update(changes).eq('id', item.id).eq('business_id', businessId).select('id').single();
            if (error) throw saleSaveError(error);
            if (!data) throw new Error('La venta no está disponible o no tienes permiso para actualizarla.');
          }
        } else {
          const { error } = await supabase.from(table).upsert(toRow(businessId, item));
          if (error) throw table === 'sales' ? saleSaveError(error) : error;
        }
        if (onAfterUpsert) await onAfterUpsert(businessId, item, old);
        if (logInfo) await logActivity(businessId, logInfo.userId, logInfo.username || '', old ? 'updated' : 'created', table, `${old ? 'Editó' : 'Agregó'} ${logInfo.label}`);
      }
    })().catch(async err => {
      console.error('IMPRESA: no se pudo guardar en ' + table, err);
      if (confirmedSave) {
        try { const actual = await load(businessId); prevRef.current = actual; setItems(actual); }
        catch { prevRef.current = prev; setItems(prev); }
        throw err;
      }
      alert('No se pudo guardar el cambio en la nube. Revisa tu conexión e inténtalo de nuevo.');
    });
  };

  const reload = async () => {
    if (!businessId) return [] as T[];
    const rows = await load(businessId);
    prevRef.current = rows;
    setItems(rows);
    setReady(true);
    return rows;
  };

  return [items, setValue, ready, reload] as const;
}

export function useSalesCloud(businessId: string | null, rate: number, logInfo?: LogInfo) {
  return useCloudCollection<Sale>(businessId, loadSales, 'sales', (b, s) => saleToRow(b, rate, s), async (b, item, old) => {
    const oldPayments = old?.payments || [];
    const newPayments = item.payments || [];
    if (newPayments.length > oldPayments.length) {
      const oldIds = new Set(oldPayments.map(p => p.id));
      for (const p of newPayments) if (!oldIds.has(p.id)) {
        await addSalePaymentRemote(item.id, p);
        if (logInfo) await logActivity(b, logInfo.userId, logInfo.username || '', 'payment', 'sales', `Registró un abono de ${fmt(p.amount)} a una venta`);
      }
    }
  }, logInfo ? { label: 'una venta', ...logInfo } : undefined);
}
export function useExpensesCloud(businessId: string | null, rate: number, logInfo?: LogInfo) {
  return useCloudCollection<Expense>(businessId, loadExpenses, 'expenses', (b, e) => expenseToRow(b, rate, e), undefined, logInfo ? { label: 'un gasto', ...logInfo } : undefined);
}
export function useAccountsCloud(businessId: string | null, logInfo?: LogInfo) {
  return useCloudCollection<Account>(businessId, loadAccounts, 'financial_accounts', accountToRow, undefined, logInfo ? { label: 'una cuenta', ...logInfo } : undefined);
}
export function useQuotesCloud(businessId: string | null, rate: number, logInfo?: LogInfo) {
  return useCloudCollection<Quote>(businessId, loadQuotes, 'quotes', (b, q) => quoteToRow(b, rate, q), undefined, logInfo ? { label: 'una cotización', ...logInfo } : undefined);
}
export function useDebtsCloud(businessId: string | null, rate: number, logInfo?: LogInfo) {
  return useCloudCollection<Debt>(businessId, loadDebts, 'debts', (b, d) => debtToRow(b, rate, d), undefined, logInfo ? { label: 'una deuda', ...logInfo } : undefined);
}
export function useMonthClosesCloud(businessId: string | null, logInfo?: LogInfo) {
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
  const addClose = async (mc: MonthClose) => {
    await addMonthCloseRemote(businessId as string, mc);
    setItems(prev => [...prev, mc]);
    if (logInfo) await logActivity(businessId, logInfo.userId, logInfo.username || '', 'closed', 'month_closes', `Cerró el mes de ${mc.month}`);
  };
  return [items, addClose, ready] as const;
}
