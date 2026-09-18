'use client';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Si faltan las variables de entorno, dejamos esto en null y la app muestra
// un aviso claro en vez de fallar de forma confusa.
export const supabaseConfigured = !!(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : (null as any);
