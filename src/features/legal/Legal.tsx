import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MARCA } from '@/config/marca';
import { REGION } from '@/config/region';

const ACTUALIZADO = 'octubre de 2026';
const N = MARCA.nombre;

/** Cómo escribirnos: el mail si ya está definido; si no, una frase que no promete un canal inexistente. */
function Contacto() {
  return MARCA.contacto
    ? <>escribiéndonos a <a className="enlace" href={`mailto:${MARCA.contacto}`}>{MARCA.contacto}</a></>
    : <>escribiéndonos por los canales de contacto que publicamos en el sitio</>;
}

function Hoja({ titulo, aviso, children }: { titulo: string; aviso: ReactNode; children: ReactNode }) {
  return (
    <div className="envoltura legal">
      <h1>{titulo}</h1>
      <p className="tenue">Última actualización: {ACTUALIZADO}</p>
      <div className="legal__aviso" role="note">{aviso}</div>
      {children}
    </div>
  );
}

const DATOS: [string, string][] = [
  ['Razón social, CUIT, rubros, ciudad y región de tu empresa', 'Al registrarte o editar tu perfil'],
  ['Nombre, apellido, cargo, mail y teléfono de la persona de contacto', 'Al registrarte o editar tu perfil'],
  ['Foto o logo de la empresa', 'Si elegís subir uno'],
  ['Pedidos de cotización: ítems, cantidades, condiciones, moneda y enlaces adjuntos', 'Si sos comprador y publicás un pedido'],
  ['Ofertas: precios, plazos, vigencia, notas y el dólar oficial del momento', 'Si sos proveedor y cotizás'],
  ['Preguntas y respuestas sobre un pedido, solicitudes de contacto y favoritos', 'Cuando usás esas funciones'],
  ['Reseñas sobre entrega, calidad y facturación', 'Si sos comprador y adjudicaste un pedido'],
  ['Preferencias de avisos por mail', 'Cuando las configurás en tu perfil'],
];

export function Privacidad() {
  return (
    <Hoja titulo="Política de privacidad" aviso={<>Este documento es un borrador inicial pensado para que {N} cumpla con lo básico de la {REGION.leyDatos} de Protección de Datos Personales de {REGION.pais}. No reemplaza el asesoramiento de un abogado matriculado: conviene que uno lo revise antes de considerarlo definitivo.</>}>
      <h2>1. Qué datos recopilamos</h2>
      <div className="tabla-envoltura">
        <table className="tabla legal__tabla">
          <thead><tr><th>Dato</th><th>Cuándo lo pedimos</th></tr></thead>
          <tbody>{DATOS.map(([d, c]) => <tr key={d}><td>{d}</td><td>{c}</td></tr>)}</tbody>
        </table>
      </div>
      <p>Tu contraseña la administra Google Firebase Authentication; nosotros nunca la vemos. El navegador guarda tu sesión y algunas preferencias de pantalla (por ejemplo, si ocultaste los primeros pasos).</p>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Mostrar el perfil de tu empresa a las empresas registradas en la red.</li>
        <li>Hacer llegar tus pedidos de cotización a los proveedores del rubro, y tus ofertas al comprador que las pidió.</li>
        <li>Avisarte por mail de pedidos nuevos, ofertas recibidas, preguntas y cierres, con la frecuencia que elijas.</li>
        <li>Armar referencias de precios agregadas y anonimizadas (índice de precios y compras recientes).</li>
      </ul>

      <h2>3. Quién ve qué</h2>
      <ul>
        <li><strong>Tu perfil</strong> (empresa, rubros, ciudad, verificaciones, reseñas) lo ven solo las empresas registradas. No hay un directorio público abierto a cualquiera.</li>
        <li><strong>Tu mail y teléfono</strong> se guardan aparte. El de un proveedor lo ven los compradores registrados; el de un comprador, solo el proveedor cuya solicitud de contacto aceptó.</li>
        <li><strong>Las ofertas</strong> las ven solo el proveedor que la hizo y el comprador del pedido. Con oferta cerrada, el comprador ve los precios recién al cierre. Un proveedor nunca ve la oferta de otro.</li>
        <li><strong>Las preguntas de un pedido</strong> se publican sin el nombre de quien preguntó.</li>
        <li><strong>Las compras recientes y el índice de precios</strong> muestran rubro, ítem, cantidad, zona y sector, sin el nombre del comprador.</li>
      </ul>

      <h2>4. Con quién se comparten</h2>
      <p>{N} no vende ni cede tus datos con fines publicitarios. Para funcionar usamos estos servicios, que pueden procesar datos fuera de {REGION.pais} bajo sus propias condiciones de privacidad:</p>
      <ul>
        <li><strong>Google Firebase</strong> (Authentication y Firestore): guarda las cuentas y los datos de la plataforma.</li>
        <li><strong>Netlify</strong>: publica el sitio.</li>
        <li><strong>Resend</strong>: envía los mails de aviso, para lo cual recibe tu mail y el texto del aviso.</li>
        <li><strong>GitHub</strong>: ejecuta la tarea programada que arma esos avisos.</li>
        <li><strong>DolarApi</strong>: tu navegador le consulta el dólar oficial del día; no recibe datos de tu cuenta.</li>
      </ul>

      <h2>5. Tus derechos</h2>
      <p>Conforme a la {REGION.leyDatos}, tenés derecho a acceder, rectificar, actualizar o pedir la supresión de tus datos. Podés hacerlo editando tu perfil en {N} o <Contacto />. La Agencia de Acceso a la Información Pública ({REGION.autoridadDatos}) es el órgano de control y podés presentar un reclamo ante ella si lo considerás necesario.</p>

      <h2>6. Seguridad</h2>
      <p>Tomamos medidas razonables para proteger tus datos: reglas de acceso en la base que limitan qué puede leer cada cuenta, contraseñas que nunca vemos y conexiones cifradas. Ninguna plataforma puede garantizar una seguridad absoluta, y seguimos reforzando estas protecciones a medida que {N} crece.</p>

      <h2>7. Cuánto tiempo guardamos tus datos</h2>
      <p>Mientras tu cuenta esté activa. Si querés eliminar tu cuenta y tus datos, pedilo <Contacto />. Las referencias de precios ya agregadas y anonimizadas pueden conservarse porque no te identifican.</p>

      <h2>8. Cambios en esta política</h2>
      <p>Podemos actualizar esta política a medida que la plataforma evolucione. Vamos a avisar los cambios relevantes dentro del sitio. Ver también los <Link className="enlace" to="/terminos">Términos y condiciones</Link>.</p>
    </Hoja>
  );
}

export function Terminos() {
  return (
    <Hoja titulo="Términos y condiciones" aviso={<>Este documento es un borrador inicial pensado para que {N} opere con reglas claras. No reemplaza el asesoramiento de un abogado matriculado en {REGION.pais}: conviene que uno lo revise antes de considerarlo definitivo, sobre todo las secciones de responsabilidad y de planes pagos.</>}>
      <h2>1. Quiénes ofrecemos este servicio</h2>
      <p>{N} es una red B2B {MARCA.operador ? <>operada por {MARCA.operador}</> : <>operada desde {REGION.pais}</>} que conecta empresas compradoras con proveedores para pedir, comparar y adjudicar cotizaciones. Al crear una cuenta en {N}, aceptás estos términos y la <Link className="enlace" to="/privacidad">Política de privacidad</Link>.</p>

      <h2>2. Qué es (y qué no es) {N}</h2>
      <p>{N} es una herramienta para que los compradores publiquen pedidos de cotización, los proveedores envíen ofertas y ambos comparen y decidan con referencias de precios del mercado.</p>
      <p>{N} <strong>no es parte</strong> de las operaciones que surjan entre empresas de la red. No garantiza que una oferta se cumpla, ni entregas, pagos o facturación. Adjudicar un pedido en {N} registra la decisión del comprador, pero el acuerdo comercial se celebra directamente entre las partes y bajo su responsabilidad.</p>
      <p>Las verificaciones del perfil (CUIT, mail corporativo, cargo) indican controles puntuales, no una garantía sobre la empresa. Los valores de referencia, índices, escalas de convenio y el tipo de cambio mostrados son orientativos y pueden tener demoras o errores.</p>

      <h2>3. Tu cuenta y lo que publicás</h2>
      <ul>
        <li>Sos responsable de que los datos de tu empresa y de la persona de contacto sean verdaderos y estén actualizados.</li>
        <li>Las ofertas que envíes deben ser serias y respetar la vigencia que indicás. Los pedidos deben corresponder a una necesidad real de compra.</li>
        <li>Las reseñas deben basarse en una operación real y no contener información falsa ni ofensiva.</li>
        <li>No está permitido crear perfiles falsos, suplantar a otra empresa, ni publicar contenido engañoso, difamatorio o que infrinja derechos de terceros.</li>
        <li>{N} puede eliminar contenido o suspender una cuenta que incumpla estas reglas.</li>
      </ul>

      <h2>4. Planes y precios</h2>
      <p>Los compradores usan {N} gratis. Los proveedores tienen un plan gratuito con límites y planes pagos con beneficios adicionales, detallados en <Link className="enlace" to="/planes">Planes</Link>. Los precios publicados son de referencia y pueden cambiar. Mientras el cobro automático no esté disponible, la activación de un plan pago se coordina directamente con el equipo de {N}.</p>

      <h2>5. Límite de responsabilidad</h2>
      <p>{N} se ofrece "tal cual está", sin garantía de disponibilidad ininterrumpida ni de que los avisos por mail lleguen a tiempo. En la máxima medida permitida por la ley, {N} no será responsable por daños indirectos, pérdida de negocios o disputas comerciales entre empresas que se contactaron o cotizaron a través de la plataforma.</p>

      <h2>6. Propiedad intelectual</h2>
      <p>La marca {N}, su diseño y su código pertenecen a sus creadores. Lo que cada empresa publica (textos, logos, pedidos, ofertas) sigue siendo suyo; al publicarlo autorizás que se muestre dentro de la plataforma a quien corresponda y que se use, anonimizado y agregado, para las referencias de precios.</p>

      <h2>7. Cambios en estos términos</h2>
      <p>Podemos actualizar estos términos a medida que la plataforma evolucione. Vamos a avisar los cambios relevantes dentro del sitio.</p>

      <h2>8. Ley aplicable y contacto</h2>
      <p>Estos términos se rigen por las leyes de la República {REGION.pais}. Ante cualquier consulta, podés comunicarte <Contacto />.</p>
    </Hoja>
  );
}
