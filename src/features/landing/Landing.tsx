import { Link } from 'react-router-dom';
import { REGION } from '@/config/region';
import { useQuery } from '@/data/DataProvider';
import { acumulada, variacionReal } from '@/domain/indice';
import { rubro } from '@/domain/catalogos';
import { fmt } from '@/i18n';
import { FichaComprador, ventanaAbierta } from '../red/FichaComprador';
import { TarjetaComprador } from '../red/TarjetaProveedor';
import { GraficoIndice } from '../precios/GraficoIndice';

const PASOS = [
  { t: 'Perfil público', d: 'Nombre, apellido, cargo, empresa y rubros. El comprador lo autoriza al registrarse.' },
  { t: 'Solicitud con motivo', d: 'El proveedor explica la oferta en 300 caracteres. Cada plan tiene un cupo mensual.' },
  { t: 'Respuesta en un toque', d: 'Acepto, más adelante o no me interesa. El rechazo es anónimo.' },
  { t: 'Canal directo', d: 'Se liberan mail, teléfono y agenda. Queda registro para reseñas.' },
];

export function Landing() {
  const { data } = useQuery(async (r) => ({
    compradores: await r.listarCompradores(),
    indice: await r.indicePrecios(),
  }), []);
  const laura = data?.compradores.find((c) => c.id === 'laura-gimenez');
  const abiertos = data?.compradores.filter((c) => ventanaAbierta(c) && !c.semiAnonimo).slice(0, 3) ?? [];
  const serie = data?.indice.series[0];

  return (
    <>
      <section className="hero">
        <div className="envoltura hero__in">
          <div className="hero__txt">
            <p className="eyebrow">Red de compras corporativas · {REGION.pais}</p>
            <h1>El comprador corporativo tiene <em>nombre, apellido</em> y ganas de atender.</h1>
            <p className="hero__bajada">Compradores verificados que publican qué necesitan y deciden quién les escribe. Proveedores que llegan a la persona que decide, en el momento en que está comprando.</p>
            <div className="hero__cta">
              <Link className="btn btn--pri btn--grande" to="/ingresar?modo=registro&rol=comprador">Soy comprador · gratis</Link>
              <Link className="btn btn--sec btn--grande" to="/ingresar?modo=registro&rol=proveedor">Soy proveedor</Link>
            </div>
            <p className="tenue">Alta en menos de 3 minutos con {REGION.idFiscal.nombre} y mail corporativo.</p>
          </div>
          <div className="hero__ficha">
            {laura && <FichaComprador c={laura} conSello enlace={false} accion={<Link to="/red/laura-gimenez" className="btn btn--pri">Pedir contacto</Link>} />}
            <p className="pie-ficha tenue">Ejemplo con una persona ficticia</p>
          </div>
        </div>
      </section>

      <section className="banda">
        <div className="envoltura">
          <header className="banda__cab">
            <p className="eyebrow">Cómo llega un proveedor al comprador</p>
            <h2>Identidad visible, canal directo con permiso</h2>
          </header>
          <ol className="pasos">
            {PASOS.map((p, i) => (
              <li key={p.t} className="paso">
                <span className="paso__n mono">Paso {i + 1}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="envoltura dos-lados">
        <div className="lado">
          <p className="eyebrow">Para compradores</p>
          <h2>Proveedores confiables en días, sin que te llenen la bandeja</h2>
          <ul className="lista-check">
            <li>Publicás una necesidad una vez y recibís cotizaciones comparables, no 30 PDF distintos.</li>
            <li>Ves {REGION.idFiscal.nombre} verificado, reseñas de otros compradores y certificaciones.</li>
            <li>Sabés si una cotización está cara en términos reales con el índice de precios por rubro.</li>
            <li>Recibís un resumen semanal. Nada de notificaciones sueltas.</li>
          </ul>
          <Link to="/ingresar?modo=registro&rol=comprador" className="btn btn--sec">Registrarme como comprador</Link>
        </div>
        <div className="lado">
          <p className="eyebrow">Para proveedores</p>
          <h2>Hablás con quien decide, cuando está comprando</h2>
          <ul className="lista-check">
            <li>Compradores reales con nombre, empresa, rubros y ventana de compra abierta.</li>
            <li>Pedidos de cotización filtrados por tu rubro, zona y capacidad.</li>
            <li>Reputación construida con reseñas de compradores verificados.</li>
            <li>Tu embudo medido: vistas, solicitudes aceptadas, reuniones y cotizaciones ganadas.</li>
          </ul>
          <Link to="/planes" className="btn btn--sec">Ver planes para proveedores</Link>
        </div>
      </section>

      {abiertos.length > 0 && (
        <section className="envoltura bloque">
          <header className="bloque__cab">
            <div>
              <p className="eyebrow">Esta semana en la red</p>
              <h2>Compradores con ventana de compra abierta</h2>
            </div>
            <Link to="/red" className="enlace">Ver la red completa</Link>
          </header>
          <div className="grilla-3">{abiertos.map((c) => <TarjetaComprador key={c.id} c={c} />)}</div>
        </section>
      )}

      {serie && data && (
        <section className="envoltura bloque bloque--indice">
          <div className="indice-teaser">
            <div>
              <p className="eyebrow">Índice de precios por rubro</p>
              <h2>¿Esa cotización está cara en términos reales?</h2>
              <p>Rangos anonimizados a partir de las cotizaciones de la red, comparados contra la inflación. En los últimos 12 meses, {rubro(serie.rubro).nombre.toLowerCase()} subió {fmt.pct(acumulada(serie.variaciones), false)} nominal, {fmt.pct(variacionReal(acumulada(serie.variaciones), acumulada(data.indice.inflacion)))} real.</p>
              <Link to="/precios" className="btn btn--sec">Abrir el índice</Link>
            </div>
            <GraficoIndice serie={serie} inflacion={data.indice.inflacion} meses={data.indice.meses} compacto />
          </div>
        </section>
      )}
    </>
  );
}
