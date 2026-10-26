# APPRO · Conectando empresas. Generando negocios. (prototipo)

**Marca:** nombre, lema, colores y logo están en `src/config/marca.ts`. Para cambiar el logo, reemplazá `src/assets/logo.png` (o poné `logo.svg` y cambiá la importación en ese archivo). El ícono de la pestaña es `public/favicon.png`.

Prototipo navegable de la red comprador–proveedor descrita en `../Propuesta-Red-Comprador-Proveedor.pdf`.
Con `VITE_AUTH=firebase` y `VITE_DATA_SOURCE=firebase`, las cuentas, la red, las solicitudes de contacto, los pedidos y las cotizaciones se guardan en Firebase (ver abajo). En la demo publicada siguen siendo datos de ejemplo guardados en el navegador. Está armado para que este mismo código sea la base de producción.

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
MAIL_PROVIDER=resend RESEND_API_KEY=re_xxx MAIL_FROM="APPRO <avisos@tudominio.com.ar>" \
MAIL_PRUEBA_A=vos@tudominio.com.ar npm run mail:prueba   # los manda de verdad, todos a tu casilla
```

Para mandar a terceros, Resend exige verificar el dominio remitente (registros SPF y DKIM en el DNS). La clave de Resend va solo en el servidor; nunca con prefijo `VITE_`.

## Valores de referencia

Sección propia (`/valores`) que muestra rangos mínimo, mediana y máximo por hora, por unidad o por trabajo, filtrables por rubro, región y tipo, con una calculadora para estimar un requerimiento. El formulario de pedido muestra el valor del rubro mientras el comprador carga la cantidad.

**Los valores los carga el equipo de APPRO en `src/data/valores-referencia.ts`** (instrucciones al inicio del archivo). Un valor en 0 se muestra como "Valor a definir" y la calculadora lo ignora. Con `fecha` cargada, la sección ofrece llevarlo a pesos de hoy por inflación.

### Seguridad privada (valores cargados)

- Salario del vigilador por hora: escala CCT 507/07 de octubre de 2026 (Disp. DNRyRT 897/2026, vigencia julio–diciembre 2026), dividida por 192–200 h mensuales. Fuentes: [iProfesional](https://www.iprofesional.com/economia/466446-sueldo-seguridad-privada-octubre-2026-basicos-adicionales-por-categoria), [Estudio Piccinini](https://www.estudiopiccinini.com.ar/laboral-y-previsional/vigiladores-nuevas-escalas-salariales-y-sumas-adicionales-para-octubre-de-2026/), [Info Vigiladores](https://infovigiladores.com.ar/escala-salarial). Verificar contra la disposición oficial antes de publicar.
- Precio por hora al cliente: **estimado, no verificado**. Reemplazar por cotizaciones reales o por pliegos públicos con precio adjudicado.

## Registro, login y perfiles

Para usar la red hay que registrarse. `/ingresar` tiene tres vistas: **Iniciar sesión**, **Registrarme** (comprador o proveedor) y **Recuperar contraseña**. Sin sesión solo se ven la portada y los planes.

Datos del alta: nombre de la empresa, nombre de contacto, email y teléfono de contacto, categoría (rubro), sector, ubicación, CUIT (con dígito verificador) y contraseña (mínimo 6 caracteres). `/perfil` muestra esos datos, permite editarlos y subir la foto o logo de la empresa (PNG, JPG o WebP; se achica a 512 px antes de subir). El rol y el CUIT no se cambian desde la app.

**Quién ve los datos de contacto (mail y teléfono):**

| Quien mira ↓ / de quién → | Comprador | Proveedor |
|---|---|---|
| Comprador | No (solo el suyo) | **Sí** |
| Proveedor | **Solo si ese comprador aceptó su solicitud** | No (solo el suyo) |

El proveedor pide contacto con un motivo (cupo mensual según su plan). Cuando el comprador acepta, se crea `users/{comprador}/aceptados/{proveedor}` y desde ese momento las reglas le dejan leer el contacto. Si el comprador borra ese documento, el acceso se corta.

El resto del perfil lo ve cualquier usuario registrado. Sin sesión no se ve nada.

### Dos modos

- **Demo** (por defecto, y la versión publicada): cuentas guardadas en el navegador, con dos de ejemplo (Laura, compradora; Ramiro, proveedor; contraseña `demo1234`). No manda mails ni es segura.
- **Firebase** (`VITE_AUTH=firebase`): Firebase Authentication, Firestore y Storage. El mail para recuperar la contraseña llega de verdad.

### Poner Firebase en marcha

1. En [console.firebase.google.com](https://console.firebase.google.com) creá un proyecto (por ejemplo `appro-prod`).
2. **Authentication → Método de acceso:** activá *Correo electrónico/contraseña*. En **Plantillas** cambiá el idioma a español y el nombre del remitente a APPRO. En **Configuración → Dominios autorizados** agregá tu dominio cuando lo tengas.
3. **Firestore Database:** creala en modo producción, región `southamerica-east1` (San Pablo, la más cercana).
4. **Storage:** activalo (pide el plan Blaze, de pago por uso; con pocos logos el costo es prácticamente cero, pero conviene poner una alerta de presupuesto).
5. **Configuración del proyecto → Tus apps → Web:** registrá una app y copiá los valores de `firebaseConfig`.
6. Copiá `.env.example` a `.env.local`, poné `VITE_AUTH=firebase` y completá las variables `VITE_FIREBASE_*`. Esas claves son públicas por diseño: lo que protege los datos son las reglas.
7. Instalá dependencias y publicá las reglas:

```bash
npm install
npx firebase login
cp .firebaserc.example .firebaserc     # y poné el id de tu proyecto
npm run test:reglas                   # opcional: prueba las reglas antes de publicarlas
npx firebase deploy --only firestore:rules,storage
npm run dev
```

Para probar todo sin tocar el proyecto real: `npm run emuladores` en una terminal y, en otra, `npm run dev` con `VITE_FIREBASE_EMULADORES=true` en `.env.local`.

### Dónde está

- `firebase/firestore.rules` y `firebase/storage.rules`: quién lee y escribe qué. Comentadas en castellano.
- `tests/reglas/`: 29 tests de esas reglas contra el emulador (contacto solo tras aceptar, nadie se acepta a sí mismo, rol y CUIT fijos, solo imágenes de hasta 2 MB, etc.).
- `src/domain/acceso.ts`: la misma política de contacto, para que la interfaz no muestre lo que las reglas igual bloquean. Si cambia una, cambia la otra.
- `src/auth/`: contrato `AuthService` con dos implementaciones, `DemoAuth` y `firebase/FirebaseAuth`. Firebase se carga aparte, así que la demo no lo incluye.
- Modelo en Firestore: `users/{uid}` (perfil público), `users/{uid}/privado/contacto` (mail y teléfono) y `users/{uid}/aceptados/{proveedor}` (aceptaciones del comprador). El contacto va aparte porque Firestore no puede ocultar campos dentro de un documento.

### Red, pedidos y cotizaciones en Firestore (`VITE_DATA_SOURCE=firebase`)

`src/data/firebase/FirestoreRepository.ts` implementa el mismo `Repository` que la demo:

- `personas/{uid}`: ficha de la red, sin mail ni teléfono. Se crea sola la primera vez que la cuenta inicia sesión. Verificaciones, reseñas y tasa de respuesta no las puede tocar el usuario.
- `solicitudes/{id}`: las ven solo proveedor y comprador; las crea el proveedor (motivo de 40 a 300 caracteres) y las responde solo el comprador.
- `pedidos/{id}` (código `PC-XXXXXX`): los ve cualquier registrado; los publica un comprador y solo él los adjudica, una vez, a quien cotizó.
- `cotizaciones/{pedido}_{proveedor}`: una por proveedor y pedido; el comprador ve todas las de su pedido, cada proveedor solo la suya. No se editan.

Pendiente:

- **Cupos y plan:** el cupo mensual se cuenta a partir de lo enviado en el mes, pero se valida en el navegador; para que sea inviolable hace falta una Cloud Function. Mientras no haya cobro, el usuario puede cambiar su plan (está marcado en las reglas).
- **Avisos por mail:** no salen hasta publicar el backend (`server/notificarPedido.ts`) como Cloud Function con Resend.
- **Índice de precios y valores de referencia:** siguen saliendo del código (`data/mock/seed.ts`, `data/valores-referencia.ts`).

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
