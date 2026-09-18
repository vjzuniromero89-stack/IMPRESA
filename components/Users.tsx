'use client';
import { useEffect, useState } from 'react';
import { createBusinessUser, listBusinessUsers, listActivity } from '../lib/db';
import type { BusinessUser, ActivityEntry, BusinessUserRole } from '../lib/db';

const ACTION_LABEL: Record<string, string> = {
  created: 'Agregó', updated: 'Editó', deleted: 'Eliminó', payment: 'Abono', closed: 'Cierre'
};

function fmtWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function Users({ businessId, myUserId, myUsername, myRole }: { businessId: string | null; myUserId?: string; myUsername?: string; myRole?: BusinessUserRole }) {
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ username: '', password: '', role: 'empleado' as BusinessUserRole });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const reload = () => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([listBusinessUsers(businessId), listActivity(businessId)])
      .then(([u, a]) => { setUsers(u); setActivity(a); })
      .catch(err => console.error('IMPRESA: no se pudo cargar usuarios/actividad', err))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [businessId]);

  const createUser = async () => {
    if (!businessId) return;
    setBusy(true); setMsg(null);
    try {
      await createBusinessUser(businessId, f.username, f.password, f.role);
      setMsg({ type: 'info', text: `Usuario "${f.username.trim()}" creado. Ya puede iniciar sesión con esa contraseña.` });
      setF({ username: '', password: '', role: 'empleado' });
      reload();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'No se pudo crear el usuario.' });
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="panel">
        <h2>Usuarios del negocio</h2>
        {myUsername && <p className="muted">Conectado como <b>{myUsername}</b>{myRole === 'owner' ? ' · dueño' : ' · empleado'}.</p>}
        <div className="tablewrap">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Alta</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userId}>
                  <td>{u.username}{u.userId === myUserId ? ' (tú)' : ''}</td>
                  <td>{u.role === 'owner' ? 'Dueño' : 'Empleado'}</td>
                  <td>{u.createdAt}</td>
                </tr>
              ))}
              {!loading && !users.length && <tr><td colSpan={3}>No hay usuarios todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {myRole === 'owner' && (
        <div className="panel">
          <h2>Agregar usuario</h2>
          <p className="muted">Crea un usuario y contraseña para un empleado. Va a ver y registrar información en el mismo negocio, y cada cambio que haga queda anotado abajo con su nombre de usuario.</p>
          <div className="form grid">
            <label><span>Usuario nuevo</span><input type="text" autoCapitalize="none" autoCorrect="off" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="ej. maria" /></label>
            <label><span>Contraseña</span><input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="mínimo 6 caracteres" /></label>
            <label><span>Rol</span><select value={f.role} onChange={e => setF({ ...f, role: e.target.value as BusinessUserRole })}><option value="empleado">Empleado</option><option value="owner">Dueño</option></select></label>
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
