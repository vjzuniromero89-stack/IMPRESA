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

## v3.19.0 — Los pagos de deudas se registran directo en Deudas, ya no en el Cierre de mes
- Se quitó por completo la sección "Pagos y ajustes antes del cierre" de la pestaña **Cierre de mes**.
- En su lugar, la pestaña **Deudas** tiene una nueva sección **"Registrar pago a una deuda"**: eliges la deuda, la cuenta de donde va a salir el dinero y el monto. Al presionar "Registrar pago", el dinero se resta al momento de esa cuenta (ya no hay que esperar al cierre de mes) y el pago queda anotado en el historial de esa deuda.
- Ese cambio de saldo también queda anotado automáticamente en el **Historial** de esa cuenta, en "Banco y Efectivo" — igual que cualquier otro cambio de saldo.
- La pestaña **Cierre de mes** ahora solo muestra, de forma informativa, los pagos de deudas que ya registraste ese mes (porque ya se descontaron solos de su cuenta) y se enfoca en guardar el resultado final del mes.
- No requiere ninguna migración nueva — usa las mismas tablas `debts`, `debt_payments` y `account_balance_history` que ya tenías.

## v3.19.1 — "Registrar pago" al lado de cada deuda
- Se quitó el cuadro fijo de "Registrar pago a una deuda" de abajo de la lista.
- Ahora cada deuda tiene, junto a "Borrar", un botón **Registrar pago**. Al presionarlo se abre justo debajo de la lista un panel con el formulario (cuenta de origen, monto, nota) para esa deuda, y debajo del formulario su **Historial de pagos** completo (fecha, cuenta, monto y nota) — todo en un solo lugar.
- El botón "Historial" aparte se quitó porque ahora el historial siempre aparece junto al formulario de pago.

## v3.19.2 — El Historial de saldo también se muestra abajo, no en una ventana emergente
- En "Banco y Efectivo", el botón **Historial** de cada cuenta ya no abre una ventana emergente del navegador: ahora abre, justo debajo de las tarjetas de cuentas, una tabla con el historial de saldo de esa cuenta (fecha, saldo anterior, saldo nuevo y quién lo hizo).

## v3.20.0 — Borrar pagos de deudas
- En **Deudas**, el Historial de pagos de cada deuda tiene ahora un botón **Borrar** en cada pago.
- Al borrar un pago, el dinero se le devuelve automáticamente a la cuenta de donde había salido (como si el pago nunca hubiera pasado), y esa devolución también queda anotada en el Historial de saldo de esa cuenta. Si el pago no estaba ligado a ninguna cuenta (por ejemplo, un "pago inicial" registrado al crear la deuda), solo se borra el registro, sin tocar ninguna cuenta — la app te avisa cuál de los dos casos es antes de confirmar.
- No requiere ninguna migración nueva.

## v3.21.0 — Dashboard: tarjeta "Valor del Negocio Actual" más grande
- Se quitó el cuadro duplicado "Meta inicial" (mostraba lo mismo que "Progreso del valor del negocio").
- El cuadro que quedó se renombró a **"Valor del Negocio Actual"** y ahora ocupa todo el ancho de la pantalla, más grande, con el círculo de progreso y los datos (base inicial, falta/sobre la base, escala) acomodados uno al lado del otro para que se vea todo dentro del cuadro sin sentirse apretado.
- "Evolución del valor del negocio" y "Distribución de gastos" quedaron juntos en la fila de abajo.

## v3.22.0 — Borrar líneas del Historial de saldo
- En "Banco y Efectivo", el Historial de saldo de cada cuenta tiene ahora un botón **Borrar** en cada línea.
- Borrar una línea solo quita ese registro del historial — no cambia el saldo actual de la cuenta (a diferencia de borrar un pago de deuda, aquí no hay dinero que devolver: es solo un registro de lo que pasó).
- Requiere correr `migration/008_account_balance_history_delete.sql` — la migración 007 había dejado ese historial a propósito sin permiso de borrar (para que fuera a prueba de manipulación), y esta lo habilita porque ahora se pidió poder corregir líneas mal registradas.

## v3.25.0 — Separación visual "futurista" y colores por método de pago
Esta actualización parte del ZIP `impresa-main 2.zip` (v3.24.0, con tema claro, edición de ventas/gastos y la pestaña "Ventas Transferencia Efectivo").

- **Ventas Transferencia Efectivo**: se eliminaron las tablas "Pagos recibidos · Transferencia" y "Pagos recibidos · Efectivo" (y también la de "Sin clasificar") que aparecían vacías o con detalle repetido. Ahora cada grupo solo muestra su tabla de ventas ("Transferencia · X ventas", "Efectivo · X ventas", "Sin clasificar · X ventas"), cada una en su propio cuadro con un borde de color distinto (azul para Transferencia, verde para Efectivo, gris para Sin clasificar) para que se vea claramente separada del resto. Las tarjetas resumen de arriba (totales) no se tocaron.
- **Ventas**: la columna "Método" ahora muestra una etiqueta de color en vez de texto plano — azul para Transferencia, verde para Efectivo, gris para Sin clasificar — igual que los estados "Pagada/Pendiente/Pago parcial".
- **Todas las pestañas**: los cuadros (paneles) de toda la aplicación —Dashboard incluido— ahora tienen más separación entre sí: sombra más marcada, un borde de color en la parte de arriba y más espacio entre cuadros, para que cada sección se distinga claramente en vez de verse todo junto sobre fondo blanco. Esto no cambia ningún dato ni cálculo, solo la apariencia.

No requiere ninguna migración nueva — son cambios de interfaz (componentes y estilos), no de base de datos.

## v3.26.0 — Categorías y métodos de pago "+", ventas pendientes en rojo, orden de pestañas, e inventario tipo Excel (Detalle/Talla/Color) con importación
Requiere correr en Supabase, en este orden: `migration/009_custom_categories_and_payment_methods.sql` y `migration/010_inventory_talla_color.sql`.

- **Inventario, Categoría**: junto a la palabra "Categoría" hay un botón **+** para agregar una categoría nueva (te la pide con una ventanita, la guarda en la nube y la deja seleccionada). Las categorías que agregues se ven igual desde cualquier dispositivo.
- **Ventas, Método de pago**: junto a "Método de pago" también hay un botón **+** para agregar un método nuevo (por ejemplo "Tarjeta"), tanto al registrar/editar una venta como al registrar un abono. Ya no está limitado a solo Transferencia/Efectivo — se guarda igual que las categorías, y aparece también como grupo nuevo en "Ventas Transferencia Efectivo".
- **Ventas**: una venta con estado "Pendiente" (nada pagado) ahora sombrea toda la fila en **rojo**. Una venta con "Pago parcial" se sigue viendo en amarillo, como antes.
- **Orden de pestañas**: "Deudas" ahora aparece arriba de "Cierre de mes" en el menú, para registrar pagos de deudas antes de llegar al cierre.
- **Inventario, estilo Excel**: se agregaron los campos **Talla** y **Color** al formulario y a la tabla (junto a Detalle, Categoría, Cantidad y Precio), para que puedas llevar tu inventario igual que en tu hoja de Excel.
- **Inventario, importar desde Excel**: nueva sección "Importar inventario desde Excel" en la pestaña Inventario. Subes tu archivo `.xlsx` o `.csv` con columnas Detalle, Talla, Color, Cantidad y Precio (el orden de las columnas no importa, se reconocen por el nombre), eliges en qué moneda vienen los precios del archivo, revisas una vista previa y confirmas para guardar todos los productos de una sola vez en el inventario del mes seleccionado. La categoría de todo el archivo importado es la que tengas elegida en el formulario de arriba.

No se perdió ningún dato existente: los productos de inventario que ya tenías se quedan igual, solo con Talla y Color vacíos hasta que los edites o los vuelvas a registrar.

## v3.26.1 — Corrección: importar Excel con título arriba de la tabla
Se corrigió el error "No se encontraron filas válidas" al importar un inventario cuyo Excel tiene un título (por ejemplo "INVENTARIO") en la primera fila, antes de la fila con los nombres de columna (Detalle, Talla, Color, Cantidad, Precio) — como en tu archivo. Ahora la app busca automáticamente cuál fila es la de encabezados entre las primeras filas de cada hoja, en vez de asumir que siempre es la primera. También revisa todas las hojas del archivo (por si el inventario no está en la primera) y usa la que tenga más productos válidos. Si tu archivo tiene una columna "Cantidad" repetida (como una de cantidad esperada y otra de cantidad contada), se usa la primera que aparece de izquierda a derecha.

No requiere ninguna migración nueva.


## v3.27.0 — Editar productos del inventario y notas de Fecha/Faltante al importar
Requiere correr `migration/011_inventory_note.sql` (además de las migraciones 009 y 010, si todavía no las has corrido — ver más abajo).

- **Inventario**: cada producto ya registrado tiene ahora un botón **Editar** junto a "Borrar". Al presionar Editar, el formulario de arriba se llena con los datos de ese producto (Detalle, Categoría, Talla, Color, Cantidad, Precio) y el botón cambia a "Guardar cambios" — así corriges un dato mal puesto sin tener que borrar y volver a registrar el producto. Hay un botón "Cancelar edición" para salir sin guardar.
- **Importar desde Excel**: si tu archivo tiene columnas extra que la app no usa para calcular nada — por ejemplo "Fecha" (de cuándo se contó) o "Faltante" (diferencia entre lo esperado y lo contado) — ahora se reconocen y se guardan como una nota del producto, en vez de perderse. La vista previa antes de confirmar la importación muestra esa nota en su propia columna, y una vez importado el producto se ve en la tabla del inventario con un pequeño ícono "ⓘ" junto al nombre — pasa el mouse (o tócalo en el celular) para ver el texto completo. Esto no agrega columnas nuevas a la tabla del inventario, como pediste.

**Importante — si "no se guardó en la nube" al agregar un producto**: si te sale ese error al agregar o editar un producto del inventario, es casi seguro que todavía falta correr en Supabase las migraciones `migration/009_custom_categories_and_payment_methods.sql` y `migration/010_inventory_talla_color.sql` (las de la actualización v3.26.0) — esta versión también depende de las columnas Talla/Color que esas migraciones agregan. Corre las tres migraciones en orden (009, 010 y 011) en el SQL Editor de Supabase si no lo has hecho.


## v3.28.0 — Nueva pestaña "Detalle de Inventario": cantidades por producto durante todo el año, y alerta de faltantes
- Nueva pestaña **Detalle de Inventario** (junto a Inventario en el menú). Muestra una tabla con cada producto (Detalle, Talla, Color) en filas y los 12 meses del año en columnas, con la cantidad contada de ese producto en cada mes — así puedes ver, mes a mes y de un vistazo, cómo se movió cada producto durante todo el año. Hay un selector de año arriba.
- Si la cantidad de un producto **bajó** respecto al último mes en que se contó (por ejemplo tenías 20 y ahora hay 18), esa casilla se marca en **rojo** con la diferencia (por ejemplo "−2"), para que sepas exactamente a cuál producto le faltó algo al actualizar el inventario.
- Debajo de la tabla hay un panel **"Posibles faltantes detectados"** con la lista completa de esas bajadas del año: producto, talla, color, de qué mes a qué mes, cantidad antes, cantidad ahora y cuánto faltó — para revisarlos todos juntos sin tener que recorrer la tabla completa.
- Esta comparación se arma automáticamente con los conteos de inventario que ya vienes registrando cada mes en la pestaña Inventario — no requiere capturar nada aparte ni ninguna migración nueva. Los productos se identifican por su combinación de Detalle + Talla + Color, así que para que la comparación funcione bien, usa el mismo nombre/talla/color cada mes para el mismo producto.


## v3.29.0 — Talla de una lista guardada (sin errores de escritura), y faltantes reales al cerrar el mes
Requiere correr `migration/012_inventory_sizes.sql` (además de las migraciones 009, 010 y 011, si todavía no las has corrido).

- **Inventario, Talla**: ya no se escribe a mano — ahora es una lista guardada, igual que Categoría y Método de pago. Junto a "Talla" hay un botón **+** para agregar tallas nuevas a tu lista (se guardan en la nube y quedan disponibles en cualquier dispositivo). Al elegir de una lista, ya no hay forma de escribirla mal por accidente.
- **Importar desde Excel**: si tu archivo trae una talla que no está en tu lista guardada, la app la importa igual (para no perder el dato), pero te avisa con un mensaje y marca esas filas para que las revises — con un botón para agregar esas tallas nuevas a tu lista de una sola vez si están bien escritas.
- **Detalle de Inventario, faltantes reales**: se corrigió cómo se detectan los faltantes para que respondan a tu forma de trabajar (recuento completo del inventario al cerrar el mes). Antes, si un producto simplemente no aparecía en el nuevo conteo, la app no sabía si te faltó contarlo o si ya no quedaba — y no avisaba nada. Ahora: mientras el mes sigue **abierto**, un producto no contado todavía se ve en blanco (sin suponer nada, por si no has terminado el reconteo). En cuanto le das **"Cierre de mes"**, cualquier producto que tenías registrado antes y no aparezca en el conteo definitivo de ese mes se toma como que quedó en **0**, y si antes tenías más cantidad, aparece marcado en rojo en la tabla y en la lista de "Posibles faltantes detectados" — así sabrás con certeza cuáles productos faltaron por completo, no solo los que bajaron de cantidad.

No se perdió ningún dato existente.


## v3.30.0 — "Ventas Transferencia Efectivo" y "Detalle de Inventario" ahora son parte de Ventas e Inventario, e Inventario Inicial vs. Inventario Actual
Requiere correr `migration/013_inventory_baseline.sql` (además de las migraciones 009, 010, 011 y 012, si todavía no las has corrido).

- **Menú más corto**: "Ventas Transferencia Efectivo" y "Detalle de Inventario" ya no aparecen como pestañas aparte en el menú de la izquierda. Ahora, al entrar a **Ventas** o a **Inventario**, aparece un pequeño selector junto al título (entre el nombre de la página y el mes) para cambiar de vista sin salir de esa sección — por ejemplo, en Ventas puedes alternar entre "Ventas" y "Ventas Transferencia Efectivo" con un clic.
- **Inventario Inicial**: en Inventario → Historial de inventarios, puedes marcar un mes como tu **Inventario Inicial** (tu punto de partida) con el botón "Marcar como inicial". Solo puede haber uno a la vez; se guarda en la nube.
- **Detalle de Inventario → "Inventario Inicial vs. Inventario Actual"**: nuevo panel, arriba de todo, con la tabla que pediste: Producto, Talla, Color, Inventario Inicial, Inventario Actual y Total (diferencia). Eliges con cuál mes comparar como "Inventario Actual" (se marcan los meses ya cerrados con "— cerrado" para que elijas uno confiable). Si un producto bajó respecto al inicial, sale marcado en rojo con la diferencia.
- **Importante sobre las ventas y el faltante real**: como comentaste, esta diferencia no resta automáticamente lo que vendiste, porque tus ventas se registran por categoría general (por ejemplo "Camisas"), no por producto/talla/color específico del inventario — la app no tiene forma de saber que "Camisa 12Y Fucsia, cantidad 2" fue exactamente lo que bajó por esa venta. Por eso el número que ves aquí es el **movimiento total** de ese producto desde tu inventario inicial (ventas normales + cualquier faltante real, todo junto). Tienes que compararlo con lo que tú sabes que vendiste de ese producto específico para decidir si de verdad falta algo o si es solo lo ya vendido. Si más adelante quieres que el sistema reste las ventas automáticamente, se puede hacer, pero implicaría cambiar cómo registras una venta para que elijas el producto/talla/color exacto del inventario en cada venta (en vez de solo la categoría) — es un cambio más grande, avísame si quieres que lo hagamos.

No se perdió ningún dato existente.


## v3.31.0 — Borrar categorías, tallas y métodos de pago de la lista (botón × en rojo)
No requiere ninguna migración nueva (usa las mismas columnas de las versiones anteriores).

- **Inventario, Categoría y Talla**: junto al botón **+** ahora hay un botón **×** en rojo. Al elegir una categoría o talla de la lista y presionar el ×, se borra de la lista (con una confirmación antes de hacerlo). Los productos que ya tenías registrados con esa categoría o talla no cambian — el dato se conserva igual, solo deja de aparecer como opción para productos nuevos.
- **Ventas, Método de pago**: mismo botón × junto al +, tanto al registrar/editar una venta como al registrar un abono. Igual que arriba, las ventas ya registradas con ese método conservan su dato.
- Así puedes borrar la lista de tallas que trae la app por defecto y dejar solo las que realmente usas.

No se perdió ningún dato existente.


## v3.32.0 — Borrar desde adentro de la lista (la flechita abre la lista con su × en cada opción)
No requiere ninguna migración nueva.

- Se rediseñó cómo funcionan Categoría y Talla (Inventario) y Método de pago (Ventas): ya no es un select común. Ahora, al darle clic a la flechita de abajo, se abre la lista completa de lo que tienes guardado, y **cada opción de la lista trae su propia × roja** para borrarla ahí mismo — con una confirmación antes de borrar. Ya no hace falta elegir un valor primero para poder borrarlo.
- Se quitó la × que había quedado por fuera del campo (al lado del +); ahora borrar se hace desde adentro de la lista, como pediste.
- El botón **+** para agregar uno nuevo se queda igual que antes, al lado de la etiqueta del campo.

No se perdió ningún dato existente.


## v3.32.1 — Diagnóstico: "No se pudieron guardar todas las tallas nuevas"
No requiere ninguna migración nueva (esta versión es un diagnóstico + mensaje más claro, no una función nueva).

**Sobre el error que te salió al importar tu Excel de septiembre**: al presionar "Agregar estas tallas a mi lista" salía "No se pudieron guardar todas las tallas nuevas. Inténtalo de nuevo." Revisé el código y la causa casi segura es que en tu proyecto de Supabase todavía no se ha corrido `migration/012_inventory_sizes.sql` — esa es la migración que agrega la columna donde se guarda tu lista de tallas, de la actualización v3.29.0. Sin esa columna, elegir tallas funciona (usa una lista temporal), pero guardar una talla nueva en la nube falla, que es exactamente lo que viste.

Con esta versión, si te vuelve a faltar una migración, la app ahora te dice **cuál archivo correr** en vez de un error genérico (por ejemplo: "Falta correr una migración en Supabase para esta función. Ejecuta el SQL de migration/012_inventory_sizes.sql..."). Esto aplica a las listas de Categoría/Talla/Método de pago, al Inventario Inicial, y a guardar Talla/Color/Nota en un producto.

**Lo que necesitas hacer**: entra al SQL Editor de tu proyecto en Supabase y corre, en este orden (si no lo has hecho ya), todos los archivos de la carpeta `migration/` que todavía no hayas corrido: 009, 010, 011, 012 y 013. Puedes correr cada uno aunque no estés seguro si ya lo corriste antes — están escritos para no dar error si ya existe lo que agregan (verás un aviso tipo "already exists, skipping", que es normal).


## v3.33.0 — Gastos, Categoría: ahora se puede agregar y borrar (igual que en Ventas y en Inventario)
Requiere correr `migration/014_expense_categories.sql` (además de las anteriores, si todavía no las has corrido).

- **Gastos, Categoría**: hasta ahora era una lista fija que no se podía tocar. Ahora funciona exactamente igual que Método de pago en Ventas y Categoría/Talla en Inventario: junto a "Categoría" hay un botón **+** para agregar categorías nuevas, y al darle clic a la flechita de abajo se abre la lista completa con una **×** roja en cada categoría para borrarla (con confirmación antes de borrar). Los gastos que ya tenías registrados con una categoría conservan su dato igual, aunque la borres de la lista.
- **Revisión de toda la página**: como pediste, revisé cada lugar de la app donde hay una lista con flechita para elegir un valor. Categoría de Gastos era el único que le faltaba este botón de agregar/borrar. El resto de los selectores (Moneda C$/US$, el mes y el año en Detalle de Inventario, el período del historial en "Ventas Transferencia Efectivo", y el Rol en Usuarios) son opciones fijas del sistema, no listas que tú administras, así que se quedan como están — no aplica agregar/borrar ahí.

**Lo que necesitas hacer**: entra al SQL Editor de tu proyecto en Supabase y corre `migration/014_expense_categories.sql`. Es seguro correrlo aunque ya hayas corrido las anteriores — si algo ya existe, solo avisa "already exists, skipping", que es normal.

No se perdió ningún dato existente.


## v3.33.1 — Corrección: los productos con 0 en existencia se ignoraban al importar
No requiere ninguna migración nueva.

**El problema que reportaste**: al importar tu Excel de inventario, los productos que ya no tienen existencia (cantidad 0) no se estaban guardando — la app los descartaba en silencio durante la importación, como si esa fila no existiera. Por eso no aparecían después en "Detalle de Inventario" ni se detectaban como faltantes: para el sistema, ese producto simplemente nunca se contó ese mes.

**La corrección**: ahora una fila con cantidad **0** en el Excel sí se importa (se guarda con 0 en existencia). Solo se sigue ignorando una fila si le falta el nombre del producto o si la celda de cantidad viene vacía/no es un número — eso no cambió. Lo mismo se corrigió al agregar un producto a mano en Inventario: ahora puedes guardar un producto con cantidad 0.

Con este cambio, un producto que baja a 0 sí queda registrado ese mes, y "Detalle de Inventario" lo va a marcar correctamente en rojo como faltante si antes tenía existencia.

No se perdió ningún dato existente.
