# APPRO · Conectando empresas. Generando negocios. (prototipo)

**Marca:** nombre, lema, colores y logo están en `src/config/marca.ts`. Para cambiar el logo, reemplazá `src/assets/logo.png` (o poné `logo.svg` y cambiá la importación en ese archivo). El ícono de la pestaña es `public/favicon.png`.

Prototipo navegable de la red comprador–proveedor descrita en `../Propuesta-Red-Comprador-Proveedor.pdf`.
Funciona sin base de datos ni configuración: las cuentas, la red, los pedidos y las cotizaciones se guardan en el navegador de cada persona (localStorage). Cada navegador ve solo sus propios datos, así que sirve para mostrar y probar el producto, no para que varias empresas usen la misma red. Está armado para enchufarle un backend después sin tocar las pantallas.

## Correr

```bash
npm install
npm run dev            # desarrollo en http://localhost:5173
npm test               # reglas de dominio (CUIT, cupos, índice, acceso)
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

Datos del alta: nombre de la empresa, nombre de contacto, email y teléfono de contacto, categoría (rubro), sector, ubicación, CUIT (con dígito verificador) y contraseña (mínimo 6 caracteres). `/perfil` muestra esos datos, permite editarlos y subir la foto o logo de la empresa (PNG, JPG o WebP; se achica antes de guardarlo). El rol y el CUIT no se cambian desde la app.

**Quién ve los datos de contacto (mail y teléfono):**

| Quien mira ↓ / de quién → | Comprador | Proveedor |
|---|---|---|
| Comprador | No (solo el suyo) | **Sí** |
| Proveedor | **Solo si ese comprador aceptó su solicitud** | No (solo el suyo) |

El proveedor pide contacto con un motivo (cupo mensual según su plan). Cuando el comprador acepta, el proveedor pasa a ver su mail y teléfono. La regla está en `src/domain/acceso.ts`.

El resto del perfil lo ve cualquier usuario registrado. Sin sesión no se ve nada.

### Cuentas de ejemplo

Vienen dos cuentas de ejemplo: Laura (compradora) y Ramiro (proveedor), contraseña `demo1234`. Las cuentas nuevas quedan guardadas en ese navegador. No sale ningún mail y no es seguro: es para mostrar el producto.

## Publicar en Netlify

El repositorio trae `netlify.toml` (compila con `npm run build` y publica `dist`) y `public/_redirects` (para que recargar una página interna no dé 404). No hace falta cargar ninguna variable de entorno. Conectá el repositorio de GitHub en Netlify y cada cambio en `main` se publica solo.

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
  auth/                 Sesión, alta, login, recuperación y perfil (DemoAuth, en el navegador).
  features/             Una carpeta por módulo: landing, acceso, cuenta, red, panel, cotizaciones, precios, planes.
  styles/               Tokens de diseño (claro/oscuro) y estilos.
```

Decisiones:

- **Las pantallas no conocen la fuente de datos.** `VITE_DATA_SOURCE=api` cambia el mock por la API sin tocar componentes.
- **Las reglas de negocio viven en `domain/`** y se ejecutan igual en el mock y (a futuro) en el servidor: cupo mensual de solicitudes, motivo de 40–300 caracteres, rechazo invisible para el proveedor, límite de respuestas del plan Gratis.
- **Router intercambiable**: `BrowserRouter` en producción, `MemoryRouter` en la demo publicada (que no puede cambiar la URL).

## Qué falta para producción

1. Backend y base (el envío de mails depende de esto: el navegador no puede mandar mails de forma segura) (sugerido: Postgres + API en Node/TypeScript, o Supabase para acelerar el piloto) implementando `Repository`, con una cola de trabajos para los avisos y un cron para el resumen diario.
2. Cuentas reales con verificación de mail: otra implementación de `AuthService` en `src/auth/`.
3. Validación de CUIT contra el padrón de ARCA (hoy solo dígito verificador).
4. Cobro de suscripciones en pesos con ajuste trimestral (Mercado Pago u otro).
5. Resumen semanal por mail, política de privacidad revisada por abogado y registro de la base ante la AAIP.
6. Migrar a Next.js si la landing necesita SEO fuerte; `features/` y `domain/` se mueven tal cual.
