'use client';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Aceptamos los dos nombres: el clásico "ANON_KEY" y el nuevo "PUBLISHABLE_KEY"
// que ahora usa el asistente de Cloudflare/Supabase. Cualquiera de los dos
// funciona igual con createClient().
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

// Si faltan las variables de entorno, dejamos esto en null y la app muestra
// un aviso claro en vez de fallar de forma confusa.
export const supabaseConfigured = !!(url && anonKey);

// La app ya no usa Supabase Auth (no hay inicio de sesión): el cliente solo
// se usa para leer/escribir tablas directamente con la llave pública/anon.
export const supabase = supabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : (null as any);
