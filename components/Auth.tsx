'use client';

// Ya no hay inicio de sesión: este componente solo se muestra cuando
// todavía falta configurar la conexión a Supabase (sin eso, la app no
// tiene dónde guardar nada). Si Supabase ya está configurado, esta
// pantalla nunca aparece — se entra directo al Dashboard.
export default function Auth() {
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
