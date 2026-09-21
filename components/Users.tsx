'use client';
import { useEffect, useState } from 'react';
import { addAppUser, listAppUsers, listActivity, removeAppUser } from '../lib/db';
import type { AppUser, ActivityEntry, BusinessUserRole } from '../lib/db';

const ACTION_LABEL: Record<string, string> = {
  created: 'Agregó', updated: 'Editó', deleted: 'Eliminó', payment: 'Abono', closed: 'Cierre'
};
const ROLE_LABEL: Record<BusinessUserRole, string> = { admin: 'Administrativo', usuario: 'Usuario' };

function fmtWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function Users({ businessId, currentUser }: { businessId: string | null; currentUser: AppUser | null }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ username: '', password: '', confirmPassword: '', role: 'usuario' as BusinessUserRole });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const isAdmin = currentUser?.role === 'admin';

  const reload = () => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([listAppUsers(businessId), listActivity(businessId)])
      .then(([u, a]) => { setUsers(u); setActivity(a); })
      .catch(err => console.error('IMPRESA: no se pudo cargar usuarios/actividad', err))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [businessId]);

  const createUser = async () => {
    if (!businessId) return;
    if (f.password !== f.confirmPassword) { setMsg({ type: 'error', text: 'Las contraseñas no coinciden.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const created = await addAppUser(businessId, f.username, f.password, f.role);
      setMsg({ type: 'info', text: `Usuario "${created.username}" creado.` });
      setF({ username: '', password: '', confirmPassword: '', role: 'usuario' });
      reload();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'No se pudo crear el usuario.' });
    } finally { setBusy(false); }
  };

  const remove = async (u: AppUser) => {
    if (!confirm(`¿Borrar el usuario "${u.username}"? Ya no podrá iniciar sesión.`)) return;
    try { await removeAppUser(u.id); reload(); } catch (err) { console.error(err); alert('No se pudo borrar el usuario.'); }
  };

  return (
    <>
      <div className="panel">
        <h2>Usuarios del negocio</h2>
        {currentUser && <p className="muted">Conectado como <b>{currentUser.username}</b> · {ROLE_LABEL[currentUser.role]}.</p>}
        <div className="tablewrap">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Alta</th>{isAdmin && <th>Acción</th>}</tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.username}{currentUser?.id === u.id ? ' (tú)' : ''}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>{u.createdAt}</td>
                  {isAdmin && <td><button className="dangerSmall" onClick={() => remove(u)}>Borrar</button></td>}
                </tr>
              ))}
              {!loading && !users.length && <tr><td colSpan={isAdmin ? 4 : 3}>No hay usuarios todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && (
        <div className="panel">
          <h2>Crear usuario</h2>
          <p className="muted">Crea un usuario y contraseña para un empleado o para otro Administrativo. Cada cambio que haga queda anotado abajo con su nombre de usuario.</p>
          <div className="form grid">
            <label><span>Usuario nuevo</span><input type="text" autoCapitalize="none" autoCorrect="off" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="ej. maria" /></label>
            <label><span>Contraseña</span><input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="mínimo 6 caracteres" /></label>
            <label><span>Confirmar contraseña</span><input type="password" value={f.confirmPassword} onChange={e => setF({ ...f, confirmPassword: e.target.value })} placeholder="repite la contraseña" /></label>
            <label><span>Rol</span><select value={f.role} onChange={e => setF({ ...f, role: e.target.value as BusinessUserRole })}><option value="usuario">Usuario</option><option value="admin">Administrativo</option></select></label>
            <button className="btn primary" disabled={busy} onClick={createUser}>{busy ? 'Creando…' : '+ Crear usuario'}</button>
          </div>
          {msg && <div className={msg.type === 'error' ? 'authMsg error' : 'authMsg'}>{msg.text}</div>}
        </div>
      )}

      <div className="panel">
        <h2>Actividad reciente</h2>
        <p className="muted">Quién agregó, editó o borró algo, y cuándo. Últimos 200 movimientos.</p>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th></tr></thead>
            <tbody>
              {activity.map(a => (
                <tr key={a.id}>
                  <td>{fmtWhen(a.at)}</td>
                  <td>{a.username || '—'}</td>
                  <td>{a.description || ACTION_LABEL[a.action] || a.action}</td>
                </tr>
              ))}
              {!loading && !activity.length && <tr><td colSpan={3}>Todavía no hay actividad registrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
