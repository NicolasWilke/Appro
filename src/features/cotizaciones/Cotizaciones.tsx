import { Link } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery } from '@/data/DataProvider';
import { rubro } from '@/domain/catalogos';
import { horaDeCierre, recibeOfertas } from '@/domain/rfq';
import type { PedidoCotizacion, Persona } from '@/domain/types';
import { fmt, t } from '@/i18n';
import { Pill, Vacio } from '@/ui/primitivas';

export function Cotizaciones() {
  const { rol, usuarioId } = useSesion();
  const { data } = useQuery(async (r) => {
    const yo = (await r.obtenerPersona(usuarioId)) as Persona;
    const pedidos = await r.listarPedidos(rol === 'comprador' ? { compradorId: usuarioId, visorId: usuarioId } : { rubros: yo.rubros, visorId: usuarioId });
    // El proveedor necesita saber en cuáles ya cotizó; el comprador ve el contador del pedido.
    const mias = rol === 'proveedor' ? await Promise.all(pedidos.map((p) => r.cotizacionesDe(p.id))) : [];
    const compradores = await r.listarCompradores();
    return {
      yo,
      pedidos: pedidos.map((p, i) => ({ p, yaCotice: !!mias[i]?.some((c) => c.proveedorId === usuarioId), comprador: compradores.find((c) => c.id === p.compradorId) })),
    };
  }, [rol, usuarioId]);

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab pagina__cab--fila">
        <div>
          <p className="eyebrow">Pedidos de cotización</p>
          <h1>{rol === 'comprador' ? 'Tus pedidos y las ofertas que recibiste' : 'Pedidos abiertos en tus rubros e invitaciones'}</h1>
        </div>
        {rol === 'comprador' && <Link className="btn btn--pri" to="/cotizaciones/nuevo">Publicar pedido</Link>}
      </header>
      {data && data.pedidos.length === 0 && (
        <Vacio titulo={rol === 'comprador' ? 'Todavía no publicaste pedidos' : 'No hay pedidos abiertos en tus rubros'}>
          {rol === 'comprador' ? 'Publicá una necesidad y recibí ofertas comparables ítem por ítem.' : 'Te avisamos por mail cuando aparezcan o cuando un comprador te invite.'}
        </Vacio>
      )}
      {data && data.pedidos.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr><th>Pedido</th><th>Rubro</th><th className="num">Cantidad</th><th>Cierra</th><th>{rol === 'comprador' ? 'Ofertas' : 'Comprador'}</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {data.pedidos.map(({ p, yaCotice, comprador }) => (
                <Fila key={p.id} p={p} rol={rol} yaCotice={yaCotice}
                  comprador={!comprador ? '' : comprador.semiAnonimo ? `${comprador.cargo} · ${comprador.empresa}` : `${comprador.nombre} ${comprador.apellido} · ${comprador.empresa}`} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Fila({ p, rol, comprador, yaCotice }: { p: PedidoCotizacion; rol: string; comprador: string; yaCotice: boolean }) {
  const dias = fmt.diasHasta(p.cierre);
  const abierto = recibeOfertas(p);
  return (
    <tr>
      <td>
        <Link to={`/cotizaciones/${p.id}`} className="tabla__tit"><span className="mono tenue">{p.id}</span> {p.titulo}</Link>
        {p.privado && <> <Pill tono="sello">{rol === 'proveedor' ? 'Invitación' : 'Privado'}</Pill></>}
      </td>
      <td>{rubro(p.rubro).nombre}</td>
      <td className="num mono">{p.items.length > 1 ? `${p.items.length} ítems` : <>{fmt.numero(p.cantidad)} <span className="tenue">{p.unidad}</span></>}</td>
      <td>{fmt.fecha(p.cierre)} <span className="tenue mono">{horaDeCierre(p.cierraEn)}</span> {abierto && dias >= 0 && dias <= 7 && <Pill tono="senal">{dias === 0 ? 'hoy' : `${dias} d`}</Pill>}</td>
      <td>{rol === 'comprador' ? <span className="mono">{p.ofertas}</span> : comprador}</td>
      <td>
        {p.estado === 'adjudicado' ? <Pill tono="ok">{t.estado.adjudicado}</Pill>
          : rol === 'proveedor' && yaCotice ? <Pill tono="sello">Cotizaste</Pill>
          : abierto ? <Pill>{t.estado.abierto}</Pill>
          : <Pill tono="senal">En evaluación</Pill>}
      </td>
    </tr>
  );
}
