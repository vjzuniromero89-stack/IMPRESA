'use client';
import { useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { usernameToEmail, usernameSlug } from '../lib/db';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  if (!supabaseConfigured) {
    return (
      <div className="authWrap">
        <div className="authCard">
          <div className="brandWrap"><div className="brandMark">I</div><div><div className="brand">IMPRESA</div><div className="sub">Business Management</div></div></div>
          <p className="muted" style={{ marginTop: 18 }}>
            Esta app todavía no tiene configurada la conexión a Supabase. Falta la variable
            <code> NEXT_PUBLIC_SUPABASE_URL</code> y la llave
            <code> NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (o <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>).
          </p>
        </div>
      </div>
    );
  }

  const submit = async () => {
    const slug = usernameSlug(username);
    if (slug.length < 3 || !password) { setMsg({ type: 'error', text: 'Escribe un usuario (mínimo 3 letras/números) y tu contraseña.' }); return; }
    const email = usernameToEmail(username);
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/invalid/i.test(error.message)) throw new Error('Usuario o contraseña incorrectos.');
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          if (/registered|exists/i.test(error.message)) throw new Error('Ese usuario ya existe. Elige otro.');
          throw error;
        }
        if (data.session) { setMsg({ type: 'info', text: 'Cuenta creada. Iniciando sesión…' }); }
        else { setMsg({ type: 'error', text: 'La cuenta se creó pero no pudo iniciar sesión sola. En Supabase, ve a Authentication → Sign In / Providers → Email y apaga "Confirm email" (los usuarios de esta app no tienen un correo real que pueda confirmarse).' }); }
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Ocurrió un error. Inténtalo de nuevo.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="authWrap">
      <div className="authCard">
        <div className="brandWrap"><div className="brandMark">I</div><div><div className="brand">IMPRESA</div><div className="sub">Business Management</div></div></div>
        <h1 style={{ fontSize: 20, margin: '18px 0 4px' }}>{mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
        <p className="muted" style={{ marginBottom: 16 }}>{mode === 'signin' ? 'Usa el mismo usuario y contraseña en todos tus dispositivos.' : 'Crea la cuenta una sola vez; luego inicia sesión desde tus otros dispositivos.'}</p>
        <label><span>Usuario</span><input type="text" autoCapitalize="none" autoCorrect="off" value={username} onChange={e => setUsername(e.target.value)} placeholder="ej. victor" /></label>
        <label style={{ marginTop: 11 }}><span>Contraseña</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => { if (e.key === 'Enter') submit(); }} /></label>
        {msg && <div className={msg.type === 'error' ? 'authMsg error' : 'authMsg'}>{msg.text}</div>}
        <button className="btn primary wide" disabled={busy} onClick={submit}>{busy ? 'Un momento…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}</button>
        <button className="authSwitch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(null); }}>
          {mode === 'signin' ? '¿No tienes cuenta? Créala aquí' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
}
