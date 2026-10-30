# Proveo · Conectando empresas. Generando negocios. (prototipo)

**Marca:** nombre, lema, colores y logo están en `src/config/marca.ts`. Para cambiar el logo, reemplazá `src/assets/logo.png` (o poné `logo.svg` y cambiá la importación en ese archivo). El ícono de la pestaña es `public/favicon.png`.

Prototipo navegable de la red comprador–proveedor descrita en `../Propuesta-Red-Comprador-Proveedor.pdf`.
Las cuentas, el login y los perfiles pueden funcionar con Firebase de verdad (ver abajo). La red, los pedidos y las cotizaciones todavía son datos de ejemplo guardados en el navegador. Está armado para que este mismo código sea la base de producción.

## Correr

```bash
npm install
npm run dev            # desarrollo en http://localhost:5173
npm test               # reglas de dominio (CUIT, cupos, índice, acceso)
npm run test:reglas    # reglas de Firestore y Storage en el emulador (necesita Java 11+)
npm run build          # bundle de producción en dist/
npm run build:artifact # HTML único para la demo publicada
```

## Avisos por mail de pedidos nuevos

Cuando un comprador publica un pedido, se avisa a los proveedores **verificados** que publican **ese rubro**:

- Cada proveedor elige: un mail por pedido, un resumen diario a las 8:00 o pausar avisos (panel del proveedor y alta).
- El mail muestra el pedido y quién lo publica según su perfil (nombre o, si es semi-anónimo, cargo y empresa). **Nunca** incluye mail ni teléfono del comprador: los proveedores registrados los ven dentro de la plataforma, con sesión iniciada.
- El comprador ve en el pedido a quién le llegó el aviso.

Dónde está:

- `src/domain/notificaciones.ts`: a quién se avisa y el contenido de los mails (HTML y texto, con lo que escribe el usuario escapado). Tiene tests.
- `server/notificarPedido.ts`: lo que corre el backend al guardar un pedido.
- `server/mail/MailSender.ts`: interfaz de envío con dos implementaciones, consola (desarrollo) y Resend (real). Se elige con `MAIL_PROVIDER`.
- En la demo, "Mails enviados" (barra amarilla) muestra lo que se mandaría. No sale ningún mail.

Probar el envío:

```bash
npm run mail:prueba                     # imprime los mails en la terminal
MAIL_PROVIDER=resend RESEND_API_KEY=re_xxx MAIL_FROM="Proveo <avisos@tudominio.com.ar>" \
MAIL_PRUEBA_A=vos@tudominio.com.ar npm run mail:prueba   # los manda de verdad, todos a tu casilla
```

Para mandar a terceros, Resend exige verificar el dominio remitente (registros SPF y DKIM en el DNS). La clave de Resend va solo en el servidor; nunca con prefijo `VITE_`.

## Valores de referencia

Sección propia (`/valores`) que muestra rangos mínimo, mediana y máximo por hora, por unidad o por trabajo, filtrables por rubro, región y tipo, con una calculadora para estimar un requerimiento. El formulario de pedido muestra el valor del rubro mientras el comprador carga la cantidad.

**Los valores los carga el equipo de Proveo en `src/data/valores-referencia.ts`** (instrucciones al inicio del archivo). Un valor en 0 se muestra como "Valor a definir" y la calculadora lo ignora. Con `fecha` cargada, la sección ofrece llevarlo a pesos de hoy por inflación.

### Seguridad privada (valores cargados)

- Salario del vigilador por hora: escala CCT 507/07 de octubre de 2026 (Disp. DNRyRT 897/2026, vigencia julio–diciembre 2026), dividida por 192–200 h mensuales. Fuentes: [iProfesional](https://www.iprofesional.com/economia/466446-sueldo-seguridad-privada-octubre-2026-basicos-adicionales-por-categoria), [Estudio Piccinini](https://www.estudiopiccinini.com.ar/laboral-y-previsional/vigiladores-nuevas-escalas-salariales-y-sumas-adicionales-para-octubre-de-2026/), [Info Vigiladores](https://infovigiladores.com.ar/escala-salarial). Verificar contra la disposición oficial antes de publicar.
- Precio por hora al cliente: **estimado, no verificado**. Reemplazar por cotizaciones reales o por pliegos públicos con precio adjudicado.

## Registro, login y perfiles

Para usar la red hay que registrarse. `/ingresar` tiene tres vistas: **Iniciar sesión**, **Registrarme** (comprador o proveedor) y **Recuperar contraseña**. Sin sesión solo se ven la portada y los planes.

Datos del alta: nombre de la empresa, nombre de contacto, email y teléfono de contacto, categoría (rubro), sector, ubicación, CUIT (con dígito verificador) y contraseña (mínimo 6 caracteres). `/perfil` muestra esos datos, permite editarlos y subir la foto o logo de la empresa (PNG, JPG o WebP; se achica antes de guardarlo). El rol y el CUIT no se cambian desde la app.

**Quién ve los datos de contacto (mail y teléfono):**

| Quien mira ↓ / de quién → | Comprador | Proveedor |
|---|---|---|
| Comprador | No (solo el suyo) | **Sí** |
| Proveedor | **Solo si ese comprador aceptó su solicitud** | No (solo el suyo) |

El proveedor pide contacto con un motivo (cupo mensual según su plan). Cuando el comprador acepta, se crea `users/{comprador}/aceptados/{proveedor}` y desde ese momento las reglas le dejan leer el contacto. Si el comprador borra ese documento, el acceso se corta.

El resto del perfil lo ve cualquier usuario registrado. Sin sesión no se ve nada.

### Dos modos

- **Demo** (por defecto, y la versión publicada): todo vive en el navegador, con datos de ejemplo y dos cuentas (Laura, compradora; Ramiro, proveedor; contraseña `demo1234`). No manda mails ni es segura.
- **Firebase** (`VITE_AUTH=firebase`): cuentas en Firebase Authentication y **todos** los datos en Firestore: red, pedidos, cotizaciones, solicitudes de contacto, aceptaciones, valores de referencia e índice. Funciona con el plan gratuito (Spark).

## Firebase paso a paso (plan Spark)

Necesitás Node 22 o más nuevo. **Las colecciones no se crean a mano:** Firestore crea cada una la primera vez que la app o un script escribe en ella. Una base vacía es el punto de partida correcto.

**En la consola** ([console.firebase.google.com](https://console.firebase.google.com), proyecto Proveo):

1. **Authentication → Comenzar → Método de acceso:** activá *Correo electrónico/contraseña*. En **Plantillas** poné el idioma en español.
2. **Firestore Database:** ya la tenés creada. Si te pregunta, modo producción.
3. **Configuración del proyecto (engranaje) → General → Tus apps → `</>` (Web):** registrá una app llamada Proveo, sin Hosting. Copiá los valores de `firebaseConfig`.
4. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada:** se descarga un JSON. Guardalo en la carpeta del proyecto como `clave-servicio.json` (ya está en `.gitignore`; no lo compartas: da acceso total a la base).

**En la carpeta del proyecto** (terminal de VS Code):

```bash
cp .env.example .env.local
```

En `.env.local` completá:

```
VITE_AUTH=firebase
VITE_FIREBASE_API_KEY=        ← apiKey
VITE_FIREBASE_AUTH_DOMAIN=    ← authDomain
VITE_FIREBASE_PROJECT_ID=     ← projectId
VITE_FIREBASE_STORAGE_BUCKET= ← storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID= ← messagingSenderId
VITE_FIREBASE_APP_ID=         ← appId
VITE_FIREBASE_STORAGE=false
FIREBASE_PROJECT_ID=          ← el mismo projectId
GOOGLE_APPLICATION_CREDENTIALS=./clave-servicio.json
```

Después:

```bash
npm install
npx firebase login                      # abre el navegador para entrar con tu cuenta de Google
npx firebase use --add                  # elegí el proyecto Proveo y poné "default" como alias
npx firebase deploy --only firestore    # publica las reglas y los índices
npm run sembrar                         # carga rubros, catálogos y valores de referencia
npm run dev                             # abrí http://localhost:5173 y registrate
```

`npm run sembrar` no pisa nada que ya exista. `npm run sembrar -- --forzar` lo reescribe y `--ejemplos` agrega un índice de precios ficticio para ver el gráfico (no lo uses en producción).

**Administración** (también desde la terminal, usa la clave de servicio):

```bash
npm run admin -- pendientes                       # pedidos de cambio de plan
npm run admin -- plan mail@proveedor.com pro      # activa un plan (gratis | pro | empresa)
npm run admin -- verificar mail@proveedor.com     # marca CUIT, mail corporativo y cargo como revisados
```

Al registrarse, el CUIT se controla con su dígito verificador y con eso el proveedor ya recibe avisos de su rubro. `verificar` es la revisión manual que suma el sello completo en el perfil.

### Publicar en Netlify

El repositorio ya trae `netlify.toml` (compila con `npm run build` y publica `dist`) y `public/_redirects` (para que recargar una página interna no dé 404). En Netlify, **Site configuration → Environment variables**, cargá exactamente estas, con los mismos valores que `.env.local`:

```
VITE_AUTH=firebase
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_EMULADORES=false
VITE_FIREBASE_STORAGE=false
```

Las variables se leen al compilar: después de cambiarlas, **Deploys → Trigger deploy → Clear cache and deploy site**. En Firebase, **Authentication → Configuración → Dominios autorizados**, agregá el dominio de Netlify (por ejemplo `approsrl.netlify.app`).

Para saber qué versión está publicada, mirá el pie de página: dice `Firebase · <id del proyecto>` o `modo demo`. Si dice `modo demo`, Netlify no está leyendo `VITE_AUTH=firebase`.

### Mails de pedidos nuevos sin Cloud Functions

El plan Spark no tiene Cloud Functions, así que nada corre en Firebase cuando se publica un pedido. El pedido queda guardado con `avisado: false` y `npm run avisos` hace el resto: busca los pedidos sin avisar, manda los mails, deja registro en `pedidos/{id}/avisos` (lo que ve el comprador) y lo marca avisado. `npm run avisos -- --resumen` manda los resúmenes diarios.

Para que corra solo, `.github/workflows/avisos.yml` lo ejecuta cada 30 minutos y el resumen a las 8:00 de Argentina, gratis con GitHub Actions. Viene apagado: primero cargá en GitHub los secretos que lista el archivo (la clave de servicio, el id del proyecto y los datos de Resend) y después borrá los `#` de las líneas `schedule` del archivo. Si los avisos tienen que salir al instante, la alternativa es pasar a Blaze y moverlo a una Cloud Function.

### Valores de referencia editables

Los valores se editan desde la web en `/admin/valores` (botón **Editar valores** en Valores de referencia), solo con una cuenta de administrador. Lo que se guarda va a `valoresReferencia/{id}` y pisa al valor del código con el mismo id; lo que no se tocó sigue saliendo de `src/data/valores-referencia.ts`.

Para hacer administradora a una cuenta: en la consola, Authentication → copiá el **UID** de la cuenta → Firestore → **Iniciar colección** `admins` → ID del documento = ese UID → un campo cualquiera (por ejemplo `email`, string). O desde la terminal: `npm run admin -- hacer-admin mail@empresa.com`. En la demo, cualquiera puede probar el panel.

### Pedidos de cotización (RFQ)

Un pedido se arma en `/cotizaciones/nuevo`:

- **Ítems:** hasta 30, cada uno con cantidad, unidad y detalle. El proveedor cotiza cada ítem con precio unitario, descuento e IVA (0, 10,5, 21 o 27 %), más plazo, vigencia de la oferta, condición de pago y enlaces.
- **Cierre:** día y hora (18:00 por defecto, hora de Argentina). Pasada esa hora, las reglas no aceptan más ofertas.
- **Público o privado:** el privado solo lo ven el comprador y los proveedores invitados (hasta 30), y solo ellos reciben el aviso.
- **Sobre cerrado:** activado por defecto. El comprador ve cuántas ofertas llegaron, pero los precios recién al cierre; lo controlan las reglas, no la pantalla.
- **Documentos y adjuntos:** el comprador pide documentos (lista sugerida u otros) y adjunta enlaces (Drive, Dropbox). Con el plan Spark no hay Storage, por eso son enlaces y no archivos.

Al cerrar, el comparador muestra todas las ofertas lado a lado, con el **menor precio** por ítem y por total, y la **entrega más rápida**. Se adjudica todo a uno o ítem por ítem (hasta 5 ganadores), con una justificación. El **Resumen ejecutivo** (`/cotizaciones/{id}/resumen`) tiene 4 secciones (control, participación, matriz, adjudicación), se imprime o guarda en PDF y se manda por mail; puede mostrar solo los 3 finalistas.

Los pedidos creados antes de esta versión no tienen los campos nuevos y, hasta migrarlos, solo los ve su comprador: `npm run admin -- migrar-pedidos`.

**Consultas:** mientras el pedido recibe ofertas, un proveedor que puede cotizar hace preguntas y el comprador las responde una vez. Todos los que ven el pedido leen preguntas y respuestas; no se guarda quién preguntó, así que nadie (ni el comprador) lo sabe. **Favoritos:** el comprador marca proveedores desde su perfil (`users/{comprador}/favoritos/{proveedor}`, privado) y al armar un pedido privado los invita con un clic.

**Compras recientes:** al adjudicar, el comprador puede listar cada ítem ganado en `antecedentes/{pedido--ítem}` (por defecto sí), en el mismo lote que la adjudicación: rubro, ítem, cantidad, zona, sector del comprador y proveedor, nunca el precio ni la empresa compradora. Solo los ven los compradores, durante 90 días (semáforo amarillo los últimos 15). Otro comprador le pide al proveedor su valor vigente (`solicitudesValor`); el proveedor tiene 3 días hábiles para informar un precio con vigencia o no cotizar, y solo lo ve quien lo pidió.

### Reseñas

Cuando un comprador adjudica, en el pedido aparece **Calificá a…** por cada ganador: entrega, calidad y facturación de 1 a 5 y un comentario de 20 a 500 caracteres. La reseña del ganador principal es `resenas/{pedidoId}` y la de los demás `resenas/{pedidoId}--{proveedor}`; no se edita, y las reglas solo la aceptan del comprador que publicó el pedido y para un proveedor que ganó. Se ve en el perfil del proveedor y como estrellas en su tarjeta.

### Qué cambia con el plan Spark

- **Logos:** sin Storage, el logo se achica a 256 px en WebP y se guarda dentro del perfil (máximo ~150 KB, lo controlan las reglas). Con Blaze, `VITE_FIREBASE_STORAGE=true` y `npx firebase deploy --only storage` los pasa a Storage.
- **Cupos de los planes:** la app los respeta, pero un usuario con conocimientos técnicos podría saltearlos llamando a Firestore directo. Controlarlos en el servidor necesita Cloud Functions (Blaze).
- **Cambio de plan:** el proveedor lo pide desde Planes y queda en `solicitudesPlan`. Lo activás vos con `npm run admin -- plan` después de cobrar.

### Probar sin tocar el proyecto real

```bash
npm run emuladores                       # terminal 1
# terminal 2, con VITE_FIREBASE_EMULADORES=true en .env.local:
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT_ID=demo-appro npm run sembrar
npm run dev
npm run test:reglas                      # prueba las reglas
```

### Dónde está

- `firebase/firestore.rules`: quién lee y escribe qué, comentado en castellano. `firebase/firestore.indexes.json`: índices.
- `tests/reglas/`: 67 tests de las reglas contra el emulador (contacto solo tras aceptar, un proveedor no ve el precio de otro, solo el comprador adjudica, sobre cerrado hasta el cierre, pedidos privados solo para invitados, rol y CUIT fijos, plan y verificación solo desde el servidor, etc.).
- `src/data/firestore/`: el repositorio de datos sobre Firestore. Implementa la misma interfaz que la demo, así que las pantallas no cambian.
- `src/domain/acceso.ts`: la política de contacto, para que la interfaz no muestre lo que las reglas igual bloquean. Si cambia una, cambia la otra.
- `src/auth/`: `DemoAuth` y `firebase/FirebaseAuth`. Firebase se carga aparte, así que la demo no lo incluye.
- `server/`: `sembrar.ts`, `avisos.ts` y `admin.ts`, con el SDK de administrador.

**Modelo de datos:**

| Colección | Qué guarda | Quién lee | Quién escribe |
|---|---|---|---|
| `users/{uid}` | Perfil público | Usuarios registrados | El dueño (sin rol ni CUIT) |
| `users/{uid}/privado/contacto` | Mail y teléfono | Según la tabla de contacto | El dueño |
| `users/{uid}/aceptados/{prov}` | Proveedores aceptados | El comprador y ese proveedor | El comprador |
| `estado/{uid}` | Plan y verificación | Registrados | Solo el servidor |
| `solicitudes/{id}` | Pedidos de contacto | El proveedor y el comprador | Crea el proveedor, responde el comprador |
| `pedidos/{id}` | Pedidos de cotización | Registrados | El comprador |
| `pedidos/{id}/cotizaciones/{prov}` | Cotizaciones | El comprador y quien cotizó | El proveedor |
| `pedidos/{id}/avisos/{prov}` | A quién le llegó el mail | El comprador | Solo el servidor |
| `solicitudesPlan/{uid}` | Pedidos de cambio de plan | El dueño | El dueño |
| `valoresReferencia/{id}` | Valores de referencia | Registrados | Administradores (`/admin/valores`) |
| `indicePrecios`, `config` | Datos de referencia | Registrados | Solo el servidor (`sembrar`) |
| `colaResumen/{prov}` | Avisos para el resumen diario | Nadie | Solo el servidor |
| `admins/{uid}` | Cuentas que editan valores | Cada uno la suya | Solo la consola o `npm run admin` |
| `resenas/{pedidoId}` | Reseña del comprador al proveedor adjudicado | Registrados | El comprador del pedido, una vez |

## Arquitectura

```
src/
  config/region.ts      País: idioma, moneda, CUIT/ARCA, Ley 25.326/AAIP. Abrir Uruguay o Chile = otra config.
  domain/               Tipos y reglas puras, sin React: CUIT, cupos por plan, rechazo anónimo, índice real.
  data/repository.ts    Contrato único entre pantallas y datos.
  data/mock/            Implementación en memoria + localStorage (la demo).
  data/http/            Esqueleto de la implementación contra la API real.
  data/DataProvider.tsx useQuery con refresco por eventos (reemplazable por TanStack Query).
  i18n/                 Textos comunes y formatos (Intl) según la región.
  ui/                   Primitivas: sello, avatar, chips, medidores, modal, toasts.
  auth/                 Sesión, alta, login, recuperación y perfil: DemoAuth o Firebase.
  features/             Una carpeta por módulo: landing, acceso, cuenta, red, panel, cotizaciones, precios, planes.
  styles/               Tokens de diseño (claro/oscuro) y estilos.
```

Decisiones:

- **Las pantallas no conocen la fuente de datos.** `VITE_DATA_SOURCE=api` cambia el mock por la API sin tocar componentes.
- **Las reglas de negocio viven en `domain/`** y se ejecutan igual en el mock y (a futuro) en el servidor: cupo mensual de solicitudes, motivo de 40–300 caracteres, rechazo invisible para el proveedor, límite de respuestas del plan Gratis.
- **Router intercambiable**: `BrowserRouter` en producción, `MemoryRouter` en la demo publicada (que no puede cambiar la URL).

## Qué falta para producción

1. Backend y base (el envío de mails depende de esto: el navegador no puede mandar mails de forma segura) (sugerido: Postgres + API en Node/TypeScript, o Supabase para acelerar el piloto) implementando `Repository`, con una cola de trabajos para los avisos y un cron para el resumen diario.
2. Pasar la red, los pedidos y las cotizaciones a Firestore (hoy solo cuentas y perfiles usan Firebase) y verificar el mail al registrarse.
3. Validación de CUIT contra el padrón de ARCA (hoy solo dígito verificador).
4. Cobro de suscripciones en pesos con ajuste trimestral (Mercado Pago u otro).
5. Resumen semanal por mail, política de privacidad revisada por abogado y registro de la base ante la AAIP.
6. Migrar a Next.js si la landing necesita SEO fuerte; `features/` y `domain/` se mueven tal cual.
