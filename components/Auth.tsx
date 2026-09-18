'use client';
import { useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  if (!supabaseConfigured) {
    return (
      <div className="authWrap">
        <div className="authCard">
          <div className="brandWrap"><div className="brandMark">I</div><div><div className="brand">IMPRESA</div><div className="sub">Business Management</div></div></div>
          <p className="muted" style={{ marginTop: 18 }}>
            Esta app todavía no tiene configurada la conexión a Supabase. Faltan las variables
            <code> NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    );
  }

  const submit = async () => {
    if (!email || !password) { setMsg({ type: 'error', text: 'Completa correo y contraseña.' }); return; }
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) { setMsg({ type: 'info', text: 'Cuenta creada. Iniciando sesión…' }); }
        else { setMsg({ type: 'info', text: 'Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.' }); }
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
        <p className="muted" style={{ marginBottom: 16 }}>{mode === 'signin' ? 'Usa el mismo correo y contraseña en todos tus dispositivos.' : 'Crea la cuenta una sola vez; luego inicia sesión desde tus otros dispositivos.'}</p>
        <label><span>Correo</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" /></label>
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
