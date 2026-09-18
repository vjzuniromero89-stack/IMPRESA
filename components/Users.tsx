'use client';
import { useEffect, useState } from 'react';
import { addAppUser, listAppUsers, listActivity, removeAppUser } from '../lib/db';
import type { AppUser, ActivityEntry, BusinessUserRole } from '../lib/db';

const ACTION_LABEL: Record<string, string> = {
  created: 'Agregó', updated: 'Editó', deleted: 'Eliminó', payment: 'Abono', closed: 'Cierre'
};

function fmtWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function Users({ businessId, currentUser, setCurrentUser }: { businessId: string | null; currentUser: AppUser | null; setCurrentUser: (u: AppUser) => void }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ name: '', role: 'empleado' as BusinessUserRole });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

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
    setBusy(true); setMsg(null);
    try {
      const created = await addAppUser(businessId, f.name, f.role);
      setMsg({ type: 'info', text: `Usuario "${created.name}" creado.` });
      setF({ name: '', role: 'empleado' });
      reload();
      setCurrentUser(created);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'No se pudo crear el usuario.' });
    } finally { setBusy(false); }
  };

  const remove = async (u: AppUser) => {
    if (!confirm(`¿Borrar el usuario "${u.name}"?`)) return;
    try { await removeAppUser(u.id); reload(); } catch (err) { console.error(err); alert('No se pudo borrar el usuario.'); }
  };

  return (
    <>
      <div className="panel">
        <h2>¿Quién eres?</h2>
        <p className="muted">No hace falta contraseña. Elige tu nombre en la lista para que lo que registres quede anotado con tu nombre, o créate uno abajo si todavía no apareces.</p>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Alta</th><th>Acción</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}{currentUser?.id === u.id ? ' (tú)' : ''}</td>
                  <td>{u.role === 'owner' ? 'Dueño' : 'Empleado'}</td>
                  <td>{u.createdAt}</td>
                  <td className="actions">
                    <button className="small" disabled={currentUser?.id === u.id} onClick={() => setCurrentUser(u)}>Usar este</button>
                    <button className="dangerSmall" onClick={() => remove(u)}>Borrar</button>
                  </td>
                </tr>
              ))}
              {!loading && !users.length && <tr><td colSpan={4}>No hay usuarios todavía. Crea el primero abajo.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2>Crear usuario</h2>
        <p className="muted">Solo el nombre y el rol, sin contraseña. Sirve para anotar quién hizo cada cosa en el registro de actividad de abajo.</p>
        <div className="form grid">
          <label><span>Nombre</span><input type="text" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="ej. María" /></label>
          <label><span>Rol</span><select value={f.role} onChange={e => setF({ ...f, role: e.target.value as BusinessUserRole })}><option value="empleado">Empleado</option><option value="owner">Dueño</option></select></label>
          <button className="btn primary" disabled={busy} onClick={createUser}>{busy ? 'Creando…' : '+ Crear usuario'}</button>
        </div>
        {msg && <div className={msg.type === 'error' ? 'authMsg error' : 'authMsg'}>{msg.text}</div>}
      </div>

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
