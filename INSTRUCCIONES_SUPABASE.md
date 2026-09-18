# Conectar IMPRESA a Supabase (pasos que haces tú)

Ya dejé la app programada para usar Supabase de verdad, con inicio de sesión
por **usuario y contraseña** (no correo) y una pestaña de **Usuarios** donde
puedes crear cuentas para tus empleados. Estos son los pasos que solo tú
puedes hacer porque son tus cuentas.

## 1. Corre las migraciones 002 y 003 en Supabase

1. Entra a tu proyecto **impresa** en supabase.com → **SQL Editor**.
2. Abre el archivo `migration/002_app_sync_and_rls_fix.sql` de este zip, copia
   todo su contenido, pégalo en una consulta nueva y dale **Run**. Debe decir
   "Success". (Si ya la corriste antes, puedes correrla otra vez sin
   problema — está hecha para no duplicar nada.)
3. Haz lo mismo con `migration/003_username_login_and_activity_log.sql`
   (nueva): ábrela, copia todo, pégala en otra consulta nueva y **Run**.

La 002 agrega las columnas que faltaban (cliente en ventas, abonos,
cotizaciones, etc.) y corrige los permisos de seguridad (RLS) — la
migración 001 había dejado casi todas las tablas sin ninguna política de
acceso. La 003 agrega el nombre de usuario, el permiso para que el dueño
cree otros usuarios, y la tabla donde se guarda el registro de actividad.

## 1.1 Muy importante: desactiva "Confirm email"

Como ahora se usa usuario/contraseña, por dentro cada usuario se guarda con
un correo inventado (por ejemplo `victor@impresa.local`) que nunca va a
poder recibir un correo real. Si Supabase pide "confirmar el correo" antes
de dejar entrar a alguien, esa cuenta se quedaría trabada para siempre.

Para evitarlo: en Supabase → **Authentication** → **Sign In / Providers** →
**Email** → apaga **"Confirm email"**. Este paso es obligatorio (no
opcional) para que crear cuentas funcione, tanto la tuya como las que crees
para tus empleados desde la pestaña Usuarios.

## 2. Saca tus llaves de conexión y ponlas en Cloudflare

Si Cloudflare te está guiando con su propio asistente de "Connect to
Supabase" (el que te muestra un paso con `.env.local` y nombres como
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), sigue
ese asistente tal cual — la app ya quedó lista para aceptar ese nombre
nuevo. Estos son los valores que importan y dónde van:

1. **Project URL**: la ves en el mismo asistente (algo como
   `https://xxxxx.supabase.co`) o en Supabase → **Project Settings** → **API**.
   Va en la variable **`NEXT_PUBLIC_SUPABASE_URL`**.
2. **Llave pública**: en el asistente aparece como `sb_publishable_...`. Va
   en la variable **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** (o
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, cualquiera de los dos nombres funciona —
   no hace falta poner los dos).
3. Si usaste el botón "Connect to Supabase" de Cloudflare, no tienes que
   tocar nada más: él mismo las agrega, una como "Variable" y la otra puede
   quedar marcada como "Secret" (encriptada) — Cloudflare igual la pone a
   disposición del proceso de compilación, así que funciona igual. Si en
   cambio las agregas tú a mano, lo más simple y seguro es agregarlas como
   "Variable" (texto normal) para no depender de eso.
4. Si en el panel de Cloudflare ya ves un `SUPABASE_URL` y un
   `SUPABASE_SECRET_KEY` (sin el prefijo `NEXT_PUBLIC_`) agregados como
   parte de otra integración de Cloudflare: no los borres, pero tampoco son
   los que la app usa. Puedes dejarlos ahí sin problema.
5. Guarda los cambios.

Si en algún punto el asistente no te deja elegir dónde pegar el valor y solo
te lo genera, también puedes hacerlo a mano: **Workers & Pages** → tu
proyecto **impresa** → **Settings** → **Variables and Secrets** → **Add
variable**, y ahí agregas `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `..._ANON_KEY`) como texto normal
(no "Encrypt").

Estas variables se necesitan al momento de compilar la app (no solo en
tiempo de ejecución), así que después de agregarlas vas a necesitar volver a
desplegar (el siguiente paso ya lo hace).

## 3. Sube el código y vuelve a desplegar

1. Reemplaza el contenido de tu repo de GitHub con el de este zip (como
   siempre haces).
2. Cloudflare debería disparar un nuevo deploy solo. Si no, dispáralo manual
   desde el panel de Cloudflare para que tome las variables de entorno nuevas.

## 4. Crea tu cuenta y pruébala

1. Antes de este paso, confirma que ya desactivaste "Confirm email" (paso
   1.1) — si no, la cuenta se crea pero se queda trabada sin poder entrar.
2. Abre `impresa.vjzuniromero89.workers.dev`. Ahora debe pedirte iniciar
   sesión.
3. Dale **"¿No tienes cuenta? Créala aquí"**, elige un usuario (por ejemplo
   `victor`) y una contraseña. Esta primera cuenta que creas queda como
   **dueño** del negocio.
4. Ya adentro, registra una venta de prueba desde tu PC.
5. Abre la misma URL desde tu celular, inicia sesión con el **mismo usuario y
   contraseña**, y confirma que la venta aparece ahí también.
6. Si quieres que un empleado también use la app con su propio usuario, ve a
   la pestaña **Usuarios** dentro de la app (no en Supabase) y créalo ahí:
   usuario, contraseña y rol. No necesita correo ni pasar por Supabase.
   Cada cosa que ese usuario agregue, edite o borre va a quedar anotada en
   esa misma pestaña, con su nombre y la hora.

## Importante: tus datos actuales no se mueven solos

Todo lo que tenías guardado antes vivía solo en el `localStorage` de tu PC
(nunca llegó a Supabase, por eso no se veía en el celular). Al conectar la
app de verdad, vas a empezar con el negocio en ceros en la nube. Si tienes
ventas, gastos, inventario o cuentas reales que no quieres volver a
escribir a mano, dímelo antes de seguir usando la versión nueva y te ayudo a
exportarlos desde el navegador donde están y subirlos a Supabase.

## Qué cambió por dentro (por si te sirve saber)

- Cada pantalla (Ventas, Gastos, Inventario, Banco y Efectivo, Cierre de
  mes, Cotizaciones) ahora lee y guarda directamente en Supabase en vez de
  en el navegador.
- Se agregó inicio de sesión con usuario y contraseña (Supabase Auth por
  dentro, con un correo interno inventado que la persona nunca ve). La
  primera vez que alguien crea la primera cuenta, la app le crea su negocio
  automáticamente y queda como dueño.
- Nueva pestaña **Usuarios**: el dueño puede crear más usuarios (por
  ejemplo empleados) dentro del mismo negocio, sin tocar Supabase.
- Nuevo registro de actividad (tabla `activity_log`): cada vez que alguien
  agrega, edita o borra algo, queda anotado quién fue y qué hizo, visible
  en la pestaña Usuarios.
- Se agregaron tablas nuevas: `sale_payments` (historial de abonos),
  `quotes` (cotizaciones), `inventory_month_notes`, `activity_log`.
- Se corrigieron/ampliaron las políticas de seguridad (RLS) que faltaban en
  la migración 001, y se agregó la que permite al dueño crear usuarios
  dentro de su negocio (migración 003).
