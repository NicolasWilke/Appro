import { Link, useSearchParams } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery } from '@/data/DataProvider';
import { rubro } from '@/domain/catalogos';
import { horaDeCierre, recibeOfertas } from '@/domain/rfq';
import type { PedidoCotizacion, Persona } from '@/domain/types';
import { fmt, t } from '@/i18n';
import { Pill, Vacio } from '@/ui/primitivas';
import { historialCsv } from '@/domain/exportar';
import { descargar } from '@/ui/descargar';

export function Cotizaciones() {
  const { rol, usuarioId } = useSesion();
  const { data } = useQuery(async (r) => {
    const yo = (await r.obtenerPersona(usuarioId)) as Persona;
    const pedidos = await r.listarPedidos(rol === 'comprador' ? { compradorId: usuarioId, visorId: usuarioId } : { rubros: yo.rubros, visorId: usuarioId });
    // El proveedor necesita saber en cuáles ya cotizó; el comprador ve el contador del pedido.
    const mias = rol === 'proveedor' ? await Promise.all(pedidos.map((p) => r.cotizacionesDe(p.id))) : [];
    const compradores = await r.listarCompradores();
    // Para el historial: solo los adjudicados, que ya tienen los precios abiertos.
    const adjudicados = rol === 'comprador' ? pedidos.filter((p) => p.estado === 'adjudicado') : [];
    const [provs, cotisAdj] = adjudicados.length
      ? await Promise.all([r.listarProveedores(), Promise.all(adjudicados.map((p) => r.cotizacionesDe(p.id)))])
      : [[], []];
    return {
      yo,
      provs,
      cotis: Object.fromEntries(adjudicados.map((p, i) => [p.id, cotisAdj[i]])),
      pedidos: pedidos.map((p, i) => ({ p, yaCotice: !!mias[i]?.some((c) => c.proveedorId === usuarioId), comprador: compradores.find((c) => c.id === p.compradorId) })),
    };
  }, [rol, usuarioId]);

  // El proveedor ve tres pestañas: lo que falta cotizar, lo que espera resultado y lo ya resuelto.
  const [params, setParams] = useSearchParams();
  const pestana = (params.get('ver') ?? 'cotizar') as Pestana;
  const grupos = data && rol === 'proveedor' ? agrupar(data.pedidos) : null;
  const visibles = grupos ? grupos[pestana] : data?.pedidos ?? [];

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab pagina__cab--fila">
        <div>
          <p className="eyebrow">Pedidos de cotización</p>
          <h1>{rol === 'comprador' ? 'Tus pedidos y las ofertas que recibiste' : 'Pedidos de tus rubros e invitaciones'}</h1>
        </div>
        {rol === 'comprador' && (
          <div className="acciones-fila">
            {data && visibles.length > 0 && (
              <button className="btn btn--sec" onClick={() => descargar('historial-de-pedidos.csv', historialCsv(
                data.pedidos.map((x) => x.p), data.cotis, (pid) => data.provs.find((p) => p.id === pid)?.empresa ?? pid, (id) => rubro(id).nombre,
              ))}>Descargar historial en Excel</button>
            )}
            <Link className="btn btn--pri" to="/cotizaciones/nuevo">Publicar pedido</Link>
          </div>
        )}
      </header>
      {grupos && (
        <div className="segmento pestanas" role="tablist" aria-label="Pedidos del proveedor">
          {PESTANAS.map(([k, txt]) => (
            <button key={k} type="button" role="tab" aria-selected={pestana === k} className={pestana === k ? 'is-activo' : ''} onClick={() => setParams(k === 'cotizar' ? {} : { ver: k }, { replace: true })}>
              {txt} <span className="mono tenue">{grupos[k].length}</span>
            </button>
          ))}
        </div>
      )}
      {grupos && visibles.length === 0 && data!.pedidos.length > 0 && (
        <Vacio titulo={pestana === 'cotizar' ? 'No te queda nada por cotizar' : pestana === 'cotizados' ? 'No tenés ofertas esperando resultado' : 'Todavía no hay resultados'}>
          {pestana === 'cotizar' ? 'Te avisamos por mail cuando aparezca un pedido nuevo de tu rubro.' : pestana === 'cotizados' ? 'Cuando cotices, acá ves los pedidos hasta que el comprador adjudique.' : 'Acá aparecen los pedidos adjudicados en los que cotizaste, ganados o no.'}
        </Vacio>
      )}
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
              {visibles.map(({ p, yaCotice, comprador }) => (
                <Fila key={p.id} p={p} rol={rol} yaCotice={yaCotice} gane={!!p.adjudicados?.includes(usuarioId)}
                  comprador={!comprador ? '' : comprador.semiAnonimo ? `${comprador.cargo} · ${comprador.empresa}` : `${comprador.nombre} ${comprador.apellido} · ${comprador.empresa}`} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Pestana = 'cotizar' | 'cotizados' | 'resultados';
const PESTANAS: [Pestana, string][] = [['cotizar', 'Para cotizar'], ['cotizados', 'Cotizados'], ['resultados', 'Resultados']];

function agrupar<T extends { p: PedidoCotizacion; yaCotice: boolean }>(pedidos: T[]): Record<Pestana, T[]> {
  const porCierre = (a: T, b: T) => a.p.cierraEn.localeCompare(b.p.cierraEn);
  return {
    cotizar: pedidos.filter((x) => recibeOfertas(x.p) && !x.yaCotice).sort(porCierre),
    cotizados: pedidos.filter((x) => x.yaCotice && x.p.estado !== 'adjudicado').sort(porCierre),
    resultados: pedidos.filter((x) => x.yaCotice && x.p.estado === 'adjudicado').sort((a, b) => -porCierre(a, b)),
  };
}

function Fila({ p, rol, comprador, yaCotice, gane }: { p: PedidoCotizacion; rol: string; comprador: string; yaCotice: boolean; gane: boolean }) {
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
        {p.estado === 'adjudicado' && rol === 'proveedor' && yaCotice ? (gane ? <Pill tono="ok">Ganaste</Pill> : <Pill>No ganado</Pill>)
          : p.estado === 'adjudicado' ? <Pill tono="ok">{t.estado.adjudicado}</Pill>
          : rol === 'proveedor' && yaCotice ? <Pill tono="sello">{abierto ? 'Cotizaste' : 'Cotizaste · en evaluación'}</Pill>
          : rol === 'proveedor' && abierto ? <Link to={`/cotizaciones/${p.id}?cotizar=1`} className="btn btn--pri btn--chico">Cotizar</Link>
          : abierto ? <Pill>{t.estado.abierto}</Pill>
          : <Pill tono="senal">En evaluación</Pill>}
      </td>
    </tr>
  );
}
