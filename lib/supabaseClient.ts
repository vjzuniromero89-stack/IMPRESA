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

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : (null as any);

// Cliente "de un solo uso", sin sesión persistente. Se usa para crear
// usuarios nuevos (pestaña Usuarios) sin reemplazar la sesión de quien
// ya inició sesión — createClient()+signUp() normalmente activa la sesión
// del usuario recién creado, y eso desconectaría al dueño que lo está
// creando. Con persistSession:false esto no pasa.
export function createAuthClient() {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
