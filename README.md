# IMPRESA v3.0 PRO
Rediseño profesional sobre la base v2.8, preservando los registros y claves localStorage.
- Dashboard ejecutivo con KPIs, evolución, gastos, liquidez y control del período.
- Contabilidad gerencial con Estado de Situación Financiera, activos, liquidez, inventario, variación patrimonial, composición de activos, gráficos, ejercicio contable y libro de cierres.
- US$4,100 se mantiene solo como capital inicial histórico informativo.
- C$ / US$ y tipo de cambio se mantienen.
- Ventas continúan como registro informativo según la regla definida.
- Se preservan Ventas, Gastos, Inventario, Cierre del mes, Bancos/Caja, Cotizaciones, Producción, Clientes, Reportes, Configuración y opciones de borrar.

## v3.0.1 — corrección de inventario
Se corrigió el guardado persistente de localStorage, la recarga del inventario por mes y la lectura inmediata del inventario guardado desde Dashboard y Contabilidad.

## v3.0.2 — Dashboard doble moneda
Todos los valores monetarios del Dashboard muestran C$ y US$: patrimonio, bancos/caja, inventario, ventas, gastos, evolución, distribución de gastos y saldos por cuenta.

## v3.1 — Regla financiera definitiva
Valor del negocio = Inventario + Bancos + Efectivo.
Ganancia/Pérdida = Valor actual - capital inicial histórico US$4,100.
Ventas y gastos son exclusivamente registros informativos y no afectan el valor ni la ganancia/pérdida.
Contabilidad muestra valores en C$ y US$.


## v3.4 - Sistema de cobros
Ventas con pago inicial, saldo pendiente, abonos, historial y cambio automatico a Pagada al llegar saldo a cero. Conserva las claves localStorage existentes.

## v3.9 — Cierre definitivo con pagos por cuenta
- El cierre del mes es ahora el último paso del período.
- Antes de cerrar se pueden registrar múltiples pagos de deuda.
- Cada pago exige seleccionar la cuenta de origen (BAC Dólares, BAC Córdobas, Efectivo u otra cuenta creada).
- El sistema valida el saldo disponible de la cuenta y evita sobregiros.
- Al confirmar el cierre, descuenta automáticamente cada pago de su cuenta real.
- Guarda valor antes de pagos, pagos detallados, saldos finales por cuenta y cierre definitivo.
- El cierre definitivo se convierte en la apertura del siguiente mes.
- El primer período parte de C$0 / US$0 y no muestra una pérdida inicial artificial.

## v3.10 — Capital histórico US$4,100 sin pérdida prematura
- Mantiene US$4,100 como capital histórico/base inicial.
- Durante la carga de Inventario + Bancos + Efectivo no muestra pérdida automática.
- Contabilidad incorpora “Confirmar situación inicial”. Solo después de confirmar compara los activos registrados contra US$4,100.
- Después del primer cierre, cada período usa como apertura el cierre definitivo trasladado del mes anterior.
- Se conserva la lógica v3.9 de pagos de deuda por cuenta antes del cierre definitivo.

## v3.12 — Tema oscuro y moneda integrada en cada casilla
- Toda la interfaz pasa a fondo negro con texto blanco; cada panel/tarjeta queda con sombra propia.
- Las casillas de dinero (Ventas, Gastos, Inventario, Cotizaciones) integran el selector C$/US$ al final del mismo cuadro, por defecto en C$.

## v3.13 — Conexión real a Supabase con inicio de sesión
- La app deja de guardar solo en `localStorage` y pasa a leer/escribir en Supabase, para que los datos se vean iguales en cualquier dispositivo.
- Se agrega inicio de sesión (correo y contraseña). La primera vez que alguien entra, la app crea su negocio automáticamente.
- Ver `INSTRUCCIONES_SUPABASE.md` para los pasos de configuración (migración 002, llaves de Supabase, variables de entorno en Cloudflare).

## v3.13.1 — Compatibilidad con el asistente de Cloudflare/Supabase
- La app ahora acepta también el nombre `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (el que usa el asistente nuevo de Cloudflare), además de `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `INSTRUCCIONES_SUPABASE.md` se actualizó explicando dónde pegar exactamente las llaves que muestra ese asistente.

## v3.14 — Usuario y contraseña (sin correo) + pestaña Usuarios
- Iniciar sesión y crear cuenta ahora piden **usuario y contraseña**, no correo. Por dentro se sigue usando Supabase Auth (que exige un "correo"), pero es un correo interno inventado a partir del usuario y la persona nunca lo ve ni lo escribe.
- Nueva pestaña **Usuarios**: el dueño puede crear más usuarios (por ejemplo, para sus empleados) directamente desde la app, sin volver a entrar a Supabase.
- Toda acción de agregar, editar o borrar (ventas, gastos, cuentas, inventario, cotizaciones, cierres de mes) ahora queda anotada en un registro de actividad, visible en la pestaña Usuarios, con quién la hizo y cuándo.
- Requiere correr `migration/003_username_login_and_activity_log.sql` y, muy importante, **desactivar "Confirm email"** en Supabase (Authentication → Sign In / Providers → Email) — ver `INSTRUCCIONES_SUPABASE.md`.

## v3.15 — Pestaña Deudas
- Nueva pestaña **Deudas**: lista cada deuda (descripción, total, pagado, restante, % pagado con barra de progreso, y si "Afecta %" con Sí/No).
- Se puede registrar cuánto se había pagado antes de usar esta pestaña ("Ya pagado antes").
- En **Cierre de mes**, el formulario "Pagos y ajustes antes del cierre" ahora deja elegir a cuál deuda pertenece cada pago. Al cerrar el mes, ese pago se descuenta automáticamente del restante de la deuda y aparece en su historial.
- Requiere correr `migration/004_debts.sql`.

## v3.15.1 — Un solo botón para entrar (sin pantalla de "Crear cuenta")
- Se quitó la pantalla/enlace separado de "Crear cuenta". Ahora solo hay un campo de usuario, uno de contraseña y un botón **Entrar**.
- Si ese usuario no existe todavía, la cuenta se crea sola al primer intento (queda como dueño). Si ya existe, simplemente inicia sesión.
- La pestaña Usuarios sigue siendo el lugar para crear cuentas adicionales (por ejemplo empleados) una vez que ya estás adentro.

## v3.16.0 — Se quitó el inicio de sesión por completo
- Ya no se pide usuario ni contraseña para entrar: la app abre directo en el Dashboard. Cualquier persona con el link puede ver y modificar los datos del negocio.
- Se quitó Supabase Auth por dentro (ya no crea cuentas ni sesiones); las tablas ahora se leen/escriben con la llave pública/anon, así que hace falta correr `migration/005_open_access.sql` para abrir los permisos (RLS).
- La pestaña **Usuarios** cambió: ya no se crean cuentas con contraseña. Ahora es una lista simple de nombres (sin contraseña) — cada quien elige "Usar este" para que lo que registre quede anotado con su nombre en el historial de actividad, o crea uno nuevo con solo su nombre y su rol.
- Ver `INSTRUCCIONES_SUPABASE.md` para el paso de la migración 005 y el aviso de seguridad importante que trae este cambio.

## v3.17.0 — Vuelve el inicio de sesión, ahora con Administrativo/Usuario
- Regresa la pantalla de entrada con **usuario y contraseña**. La primera vez que alguien entra (todavía no hay ningún usuario creado), esa cuenta se crea sola y queda como **Administrativo**.
- Los roles ahora son **Administrativo** y **Usuario** (antes eran Dueño/Empleado). Solo un Administrativo puede crear usuarios nuevos y borrarlos desde la pestaña Usuarios; ahí se pide usuario, contraseña, confirmar contraseña y el rol.
- Ya no se usa Supabase Auth (eso seguía quitado): la contraseña se guarda como un hash (PBKDF2 con sal), calculado en el propio navegador, en la tabla `app_users` — no en texto plano. Ver el aviso de seguridad en `INSTRUCCIONES_SUPABASE.md`: como las tablas siguen abiertas (sin sesión de Supabase), esto protege de un visitante casual, no de alguien técnico con la llave del proyecto.
- El navegador recuerda la sesión hasta que se presiona "Cerrar sesión" (ya no hay que escribir la contraseña cada vez).
- Requiere correr `migration/006_user_login.sql`. Esa migración borra las cuentas que se habían creado en la v3.16.0 (solo nombre, sin contraseña) porque ya no sirven para entrar — hay que volver a crearlas con su contraseña.

## v3.17.1 — Corrección: datos que "se borraban" al refrescar
- `ensureBusiness()` ahora desempata de forma 100% determinística (por fecha y, si hay empate, por id) al elegir el negocio, sin depender del navegador ni del dispositivo — sigue siendo Supabase (la nube) la única fuente de verdad, igual en la PC, el celular o donde sea. Antes, si por cualquier motivo llegaba a haber más de una fila en la tabla `businesses` (por ejemplo de pruebas de sesiones anteriores), cada carga de página podía terminar usando un negocio distinto — dando la impresión de que algo recién guardado (como una deuda) desaparecía al refrescar, cuando en realidad quedó guardado, pero bajo otro negocio.

## v3.18.0 — Historial de saldos en Banco y Efectivo
- Cada vez que se actualiza el saldo de una cuenta (BAC Dólares, BAC Córdobas, Efectivo o cualquier otra que hayas creado), la app guarda el saldo anterior y el saldo nuevo, con fecha/hora y quién lo hizo.
- Nuevo botón **Historial** en cada tarjeta de cuenta, en la pestaña "Banco y Efectivo", para ver todos los cambios de saldo de esa cuenta.
- Ese historial queda guardado en la nube (Supabase), no en el navegador, y nadie puede editarlo ni borrarlo desde la app — solo se puede consultar.
- Requiere correr `migration/007_account_balance_history.sql`.

## v3.18.1 — Historial de pagos en Deudas + cierre de mes más completo
- Nueva pestaña **Deudas**: cada deuda tiene ahora un botón **Historial** que muestra todos los pagos que se le han hecho (fecha, cuenta de origen, monto y nota), además de lo pagado y lo restante.
- Aclaración de cómo ya funcionaba el cierre de mes (por si no quedaba claro): en "Cierre de mes", cada pago que registras en "Pagos y ajustes antes del cierre" ya elige la cuenta de origen y la deuda a pagar; al presionar "Cerrar definitivamente", ese monto se descuenta automáticamente de esa cuenta y queda anotado en el historial de esa deuda — no hace falta ningún paso manual aparte.
- Ahora, además, cada vez que un cierre de mes descuenta dinero de una cuenta para pagar deudas, ese cambio de saldo también queda anotado en el **Historial** de "Banco y Efectivo" de esa cuenta (igual que cuando usas "Actualizar saldo" a mano) — así el historial de saldos queda completo, sin importar si el cambio fue manual o automático por un cierre.
