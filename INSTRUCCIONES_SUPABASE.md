# Conectar IMPRESA a Supabase (pasos que haces tú)

La app vuelve a pedir **usuario y contraseña** para entrar, con dos roles:
**Administrativo** y **Usuario**. Estos son los pasos que solo tú puedes
hacer porque son tus cuentas (Supabase y Cloudflare).

## ⚠️ Qué tan protegido queda esto

La contraseña nunca se guarda en texto plano: el navegador la convierte en
un "hash" (una huella que no se puede revertir) antes de mandarla a
Supabase. Pero las tablas de la base de datos siguen abiertas por dentro
(sin sesión de Supabase) — la pantalla de usuario/contraseña vive en la
app, no en la base de datos. En la práctica eso significa: alguien que
solo tiene el link de la app no puede entrar sin la contraseña correcta;
pero alguien técnico que consiga la llave pública de tu proyecto de
Supabase podría, en teoría, leer directamente esas tablas sin pasar por el
login. Es un nivel de protección razonable para el día a día, no una
bóveda bancaria. Si más adelante quieres una protección más fuerte
(sesión real del lado de Supabase), dímelo y lo ajustamos.

## 1. Corre las migraciones en Supabase

1. Entra a tu proyecto **impresa** en supabase.com → **SQL Editor**.
2. Corre en orden, cada una en una consulta nueva con **Run** (ábrela, copia
   todo su contenido, pégalo, Run): `migration/002_app_sync_and_rls_fix.sql`,
   `migration/003_username_login_and_activity_log.sql`,
   `migration/004_debts.sql` y `migration/005_open_access.sql`. Todas están
   hechas para no duplicar nada si ya las habías corrido antes — correrlas
   de nuevo no hace daño.
3. Ahora corre la nueva **`migration/006_user_login.sql`**: ábrela, copia
   todo su contenido, pégalo en una consulta nueva y dale **Run**. Debe
   decir "Success" al final. Esta es la que agrega usuario/contraseña de
   verdad a la pestaña Usuarios.

   **Importante:** si ya habías creado algún usuario en la versión anterior
   (la que solo pedía nombre, sin contraseña), esta migración lo borra —
   esas cuentas no tienen contraseña y no sirven para entrar. Vas a tener
   que crear tu usuario de nuevo (esta vez con su contraseña) la primera
   vez que abras la app.

Ya no hace falta tocar nada de **Authentication** en Supabase (ni
"Confirm email" ni nada parecido) — esto no usa Supabase Auth.

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
   "Variable" (texto normal).
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

1. Abre `impresa.vjzuniromero89.workers.dev`. Como todavía no hay ningún
   usuario, te va a pedir crear tu cuenta (usuario, contraseña y
   confirmar contraseña) — esa primera cuenta queda como **Administrativo**.
2. Ya adentro, registra una venta de prueba. Abre la misma URL desde tu
   celular, entra con el mismo usuario y contraseña, y confirma que la
   venta aparece ahí también.
3. Si quieres que un empleado use la app, ve a la pestaña **Usuarios**
   (solo lo puede hacer un Administrativo) y créale su usuario y
   contraseña ahí, eligiendo el rol **Usuario**. Cada cosa que esa persona
   agregue, edite o borre queda anotada con su nombre en "Actividad
   reciente", en esa misma pestaña.
4. Para tus deudas (máquinas, préstamos, liquidaciones, etc.), ve a la
   pestaña **Deudas** y agrégalas ahí, con el total y, si ya habías pagado
   algo antes, ponlo en "Ya pagado antes". Desde ese momento, cuando
   registres un pago en **Cierre de mes** vas a poder elegir a cuál de esas
   deudas pertenece, y el "Pagado"/"Restante"/"% Pagado" de esa deuda se
   actualiza solo.

## 5. Nuevo: Historial de saldos en "Banco y Efectivo"

1. En el SQL Editor, corre también **`migration/007_account_balance_history.sql`**
   (ábrela, copia todo su contenido, pégalo en una consulta nueva, Run).
2. Listo. Desde ahora, cada vez que uses "Actualizar saldo" en una cuenta
   (BAC Dólares, BAC Córdobas, Efectivo, etc.), la app guarda el saldo que
   tenía antes. Para verlo, entra a **Banco y Efectivo** y presiona
   **Historial** en la tarjeta de esa cuenta.

## Importante: tus datos actuales no se mueven solos

Todo lo que tenías guardado antes de conectar Supabase vivía solo en el
`localStorage` de tu PC (nunca llegó a la nube). Si tienes ventas, gastos,
inventario o cuentas reales de esa época que no quieres volver a escribir a
mano, dímelo y te ayudo a exportarlos desde el navegador donde están y
subirlos a Supabase.

## Qué cambió por dentro (por si te sirve saber)

- La pestaña **Usuarios** ahora pide usuario, contraseña y rol
  (Administrativo o Usuario) en la tabla `app_users`. La contraseña se
  guarda como un hash PBKDF2 con sal, calculado en el navegador — no en
  texto plano — pero no hay sesión de Supabase detrás (ver el aviso de
  arriba).
- Solo un Administrativo puede crear o borrar usuarios desde la pestaña
  Usuarios. Cualquiera que entre puede ver la lista de usuarios y la
  Actividad reciente.
- El navegador recuerda quién entró (no hay que escribir la contraseña
  cada vez) hasta que se presiona **Cerrar sesión**.
- Sigue sin usarse Supabase Auth. La tabla vieja `business_users` (de
  antes de quitar el login por completo) queda sin usarse.
- El registro de actividad (`activity_log`) sigue igual: cada acción queda
  anotada con el usuario que inició sesión.
