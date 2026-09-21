'use client';
import { useEffect, useState } from 'react';
import { supabaseConfigured } from '../lib/supabaseClient';
import { addAppUser, authenticateUser, hasAnyLoginableUser } from '../lib/db';
import type { AppUser } from '../lib/db';

export default function Auth({ businessId, onLogin }: { businessId: string | null; onLogin: (u: AppUser) => void }) {
  const [checking, setChecking] = useState(true);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!supabaseConfigured || !businessId) { setChecking(false); return; }
    let cancelled = false;
    hasAnyLoginableUser(businessId)
      .then(has => { if (!cancelled) { setIsFirstUser(!has); setChecking(false); } })
      .catch(err => { console.error('IMPRESA: no se pudo revisar los usuarios', err); if (!cancelled) setChecking(false); });
    return () => { cancelled = true };
  }, [businessId]);

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

  if (!businessId || checking) return <div className="loadingScreen">Cargando IMPRESA…</div>;

  const submit = async () => {
    setMsg(null);
    const clean = username.trim();
    if (clean.length < 3 || !password) { setMsg({ type: 'error', text: 'Escribe un usuario (mínimo 3 letras/números) y tu contraseña.' }); return; }
    if (isFirstUser) {
      if (password.length < 6) { setMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' }); return; }
      if (password !== confirmPassword) { setMsg({ type: 'error', text: 'Las contraseñas no coinciden.' }); return; }
    }
    setBusy(true);
    try {
      const u = isFirstUser
        ? await addAppUser(businessId, clean, password, 'admin')
        : await authenticateUser(businessId, clean, password);
      onLogin(u);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Ocurrió un error. Inténtalo de nuevo.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="authWrap">
      <div className="authCard">
        <div className="brandWrap"><div className="brandMark">I</div><div><div className="brand">IMPRESA</div><div className="sub">Business Management</div></div></div>
        <h1 style={{ fontSize: 20, margin: '18px 0 4px' }}>{isFirstUser ? 'Crea tu cuenta de Administrativo' : 'Entrar a IMPRESA'}</h1>
        <p className="muted" style={{ marginBottom: 16 }}>{isFirstUser ? 'Todavía no hay ningún usuario creado. Esta primera cuenta queda como Administrativo.' : 'Escribe tu usuario y contraseña.'}</p>
        <label><span>Usuario</span><input type="text" autoCapitalize="none" autoCorrect="off" value={username} onChange={e => setUsername(e.target.value)} placeholder="ej. victor" /></label>
        <label style={{ marginTop: 11 }}><span>Contraseña</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => { if (e.key === 'Enter' && !isFirstUser) submit(); }} /></label>
        {isFirstUser && <label style={{ marginTop: 11 }}><span>Confirmar contraseña</span><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => { if (e.key === 'Enter') submit(); }} /></label>}
        {msg && <div className={msg.type === 'error' ? 'authMsg error' : 'authMsg'}>{msg.text}</div>}
        <button className="btn primary wide" disabled={busy} onClick={submit}>{busy ? 'Un momento…' : (isFirstUser ? 'Crear cuenta' : 'Entrar')}</button>
      </div>
    </div>
  );
}
