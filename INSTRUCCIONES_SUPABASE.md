# Conectar IMPRESA a Supabase (pasos que haces tú)

Ya dejé la app programada para usar Supabase de verdad, con inicio de sesión.
Estos son los pasos que solo tú puedes hacer porque son tus cuentas.

## 1. Corre la migración 002 en Supabase

1. Entra a tu proyecto **impresa** en supabase.com → **SQL Editor**.
2. Abre el archivo `migration/002_app_sync_and_rls_fix.sql` de este zip, copia
   todo su contenido y pégalo en una consulta nueva.
3. Dale **Run**. Debe decir "Success".

Esto agrega las columnas que faltaban (cliente en ventas, abonos,
cotizaciones, etc.) y — muy importante — corrige los permisos de seguridad
(RLS). La migración anterior (001) dejó casi todas las tablas sin ninguna
política de acceso, así que aunque conectáramos la app, Supabase iba a negar
todo por defecto. Ya quedó arreglado en el archivo 002.

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

## 4. Sube el código y vuelve a desplegar

1. Reemplaza el contenido de tu repo de GitHub con el de este zip (como
   siempre haces).
2. Cloudflare debería disparar un nuevo deploy solo. Si no, dispáralo manual
   desde el panel de Cloudflare para que tome las variables de entorno nuevas.

## 5. Crea tu cuenta y pruébala

1. Abre `impresa.vjzuniromero89.workers.dev`. Ahora debe pedirte iniciar
   sesión.
2. Dale **"¿No tienes cuenta? Créala aquí"**, pon tu correo y una contraseña.
3. Por defecto, Supabase pide confirmar el correo antes de dejarte entrar.
   Si no quieres ese paso extra (para una app que solo usas tú), puedes
   desactivarlo: en Supabase → **Authentication** → **Sign In / Providers** →
   **Email** → apaga **"Confirm email"**. Si lo dejas activado, revisa tu
   correo y haz clic en el enlace de confirmación antes de intentar entrar.
4. Ya adentro, registra una venta de prueba desde tu PC.
5. Abre la misma URL desde tu celular, inicia sesión con el **mismo correo y
   contraseña**, y confirma que la venta aparece ahí también.

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
- Se agregó inicio de sesión con correo y contraseña (Supabase Auth). La
  primera vez que alguien inicia sesión, la app le crea su negocio
  automáticamente.
- Se agregaron tablas nuevas: `sale_payments` (historial de abonos),
  `quotes` (cotizaciones), `inventory_month_notes`.
- Se corrigieron las políticas de seguridad (RLS) que faltaban en la
  migración 001.
