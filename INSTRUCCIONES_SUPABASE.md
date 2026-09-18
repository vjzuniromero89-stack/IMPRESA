# Conectar IMPRESA a Supabase (pasos que haces tú)

Por tu pedido, la app **ya no pide usuario ni contraseña para entrar**. Se
abre directo en el Dashboard. Estos son los pasos que solo tú puedes hacer
porque son tus cuentas (Supabase y Cloudflare).

## ⚠️ Muy importante: qué significa "sin inicio de sesión"

Al quitar el login, **cualquier persona que tenga el link de la app**
(`impresa.vjzuniromero89.workers.dev`) puede entrar, ver y modificar tus
ventas, gastos, cuentas bancarias, deudas y todo lo demás — sin que se le
pida ninguna contraseña. Ya no hay forma de saber, desde la app, quién
entró si no elige su nombre en la pestaña Usuarios (y nada le obliga a
elegir el correcto).

Si más adelante cambias de opinión y quieres recuperar la protección con
contraseña, dímelo y lo regreso.

## 1. Corre las migraciones en Supabase

1. Entra a tu proyecto **impresa** en supabase.com → **SQL Editor**.
2. Si todavía no las has corrido de una sesión anterior, corre en orden
   `migration/002_app_sync_and_rls_fix.sql`, `migration/003_username_login_and_activity_log.sql`
   y `migration/004_debts.sql` (cada una: ábrela, copia todo su contenido,
   pégalo en una consulta nueva y dale **Run**. Están hechas para no
   duplicar nada si ya las habías corrido).
3. Ahora corre la nueva **`migration/005_open_access.sql`**: ábrela, copia
   todo su contenido, pégalo en una consulta nueva y dale **Run**. Debe
   decir "Success". Esta es la migración que quita el requisito de haber
   iniciado sesión para leer/escribir los datos, y crea la nueva lista de
   "Usuarios" (sin contraseña) que usa la pestaña Usuarios.

Ya **no hace falta** desactivar "Confirm email" ni nada relacionado a
Authentication — la app dejó de usar Supabase Auth por completo.

## 2. Saca tus llaves de conexión y ponlas en Cloudflare

Si ya las configuraste en una sesión anterior y no las vas a cambiar,
puedes saltar este paso.

Si Cloudflare te está guiando con su propio asistente de "Connect to
Supabase" (el que te muestra un paso con `.env.local` y nombres como
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), sigue
ese asistente tal cual. Estos son los valores que importan y dónde van:

1. **Project URL**: la ves en el mismo asistente (algo como
   `https://xxxxx.supabase.co`) o en Supabase → **Project Settings** → **API**.
   Va en la variable **`NEXT_PUBLIC_SUPABASE_URL`**.
2. **Llave pública**: en el asistente aparece como `sb_publishable_...`. Va
   en la variable **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** (o
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, cualquiera de los dos nombres funciona —
   no hace falta poner los dos).
3. Si usaste el botón "Connect to Supabase" de Cloudflare, no tienes que
   tocar nada más. Si en cambio las agregas tú a mano, agrégalas como
   "Variable" (texto normal), no como "Secret" — de todas formas, con el
   login quitado, esta llave ya no protege nada por sí sola.
4. Guarda los cambios.

Si en algún punto el asistente no te deja elegir dónde pegar el valor y solo
te lo genera, también puedes hacerlo a mano: **Workers & Pages** → tu
proyecto **impresa** → **Settings** → **Variables and Secrets** → **Add
variable**.

Estas variables se necesitan al momento de compilar la app (no solo en
tiempo de ejecución), así que después de agregarlas vas a necesitar volver a
desplegar (el siguiente paso ya lo hace).

## 3. Sube el código y vuelve a desplegar

1. Reemplaza el contenido de tu repo de GitHub con el de este zip (como
   siempre haces).
2. Cloudflare debería disparar un nuevo deploy solo. Si no, dispáralo manual
   desde el panel de Cloudflare.

## 4. Pruébala

1. Abre `impresa.vjzuniromero89.workers.dev`. Ya no pide usuario ni
   contraseña — entra directo al Dashboard.
2. Ve a la pestaña **Usuarios** y crea tu nombre (solo nombre y rol, sin
   contraseña) con "Crear usuario", y luego elige "Usar este". Desde ese
   momento, lo que registres queda anotado con tu nombre en la Actividad
   reciente.
3. Registra una venta de prueba. Abre la misma URL desde tu celular:
   entra directo (sin pedir nada) y la venta debe aparecer ahí también.
4. Si un empleado va a usar la app, que entre a la pestaña **Usuarios** y
   se cree su propio nombre — no necesita contraseña ni pasar por Supabase.
5. Para tus deudas (máquinas, préstamos, liquidaciones, etc.), ve a la
   pestaña **Deudas** y agrégalas ahí, con el total y, si ya habías pagado
   algo antes, ponlo en "Ya pagado antes". Desde ese momento, cuando
   registres un pago en **Cierre de mes** vas a poder elegir a cuál de esas
   deudas pertenece, y el "Pagado"/"Restante"/"% Pagado" de esa deuda se
   actualiza solo.

## Importante: tus datos actuales no se mueven solos

Todo lo que tenías guardado antes de conectar Supabase vivía solo en el
`localStorage` de tu PC (nunca llegó a la nube). Si tienes ventas, gastos,
inventario o cuentas reales de esa época que no quieres volver a escribir a
mano, dímelo y te ayudo a exportarlos desde el navegador donde están y
subirlos a Supabase.

## Qué cambió por dentro (por si te sirve saber)

- Se quitó Supabase Auth por completo: ya no hay usuario, contraseña,
  sesión ni "Cerrar sesión". La app lee y escribe usando la llave
  pública/anon de tu proyecto, sin pedir credenciales.
- Las políticas de seguridad (RLS) de todas las tablas del negocio ahora
  son abiertas (`migration/005_open_access.sql`) — cualquiera con el link o
  la llave anon puede leer y escribir.
- La pestaña **Usuarios** ahora usa una tabla nueva, `app_users`: solo
  nombre y rol, sin contraseña, sin relación con Supabase Auth. La tabla
  vieja `business_users` (con usuario/contraseña) queda sin usarse.
- El registro de actividad (`activity_log`) sigue igual: cada acción queda
  anotada con el nombre que la persona eligió en Usuarios.
