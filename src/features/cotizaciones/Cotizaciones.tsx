import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery } from '@/data/DataProvider';
import { rubro } from '@/domain/catalogos';
import type { PedidoCotizacion, Persona } from '@/domain/types';
import { fmt, t } from '@/i18n';
import { Pill, Vacio } from '@/ui/primitivas';
import { NuevoPedidoModal } from './modales';

export function Cotizaciones() {
  const { rol, usuarioId } = useSesion();
  const ir = useNavigate();
  const [nuevo, setNuevo] = useState(false);
  const { data } = useQuery(async (r) => {
    const yo = (await r.obtenerPersona(usuarioId)) as Persona;
    const pedidos = await r.listarPedidos(rol === 'comprador' ? { compradorId: usuarioId } : { rubros: yo.rubros });
    const conteos = await Promise.all(pedidos.map((p) => r.cotizacionesDe(p.id)));
    const compradores = await r.listarCompradores();
    return { yo, pedidos: pedidos.map((p, i) => ({ p, cotis: conteos[i], comprador: compradores.find((c) => c.id === p.compradorId)! })) };
  }, [rol, usuarioId]);

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab pagina__cab--fila">
        <div>
          <p className="eyebrow">Pedidos de cotización</p>
          <h1>{rol === 'comprador' ? 'Tus pedidos y las cotizaciones que recibiste' : 'Pedidos abiertos en tus rubros'}</h1>
        </div>
        {rol === 'comprador' && <button className="btn btn--pri" onClick={() => setNuevo(true)}>Publicar pedido</button>}
      </header>
      {data && data.pedidos.length === 0 && (
        <Vacio titulo={rol === 'comprador' ? 'Todavía no publicaste pedidos' : 'No hay pedidos abiertos en tus rubros'}>
          {rol === 'comprador' ? 'Publicá una necesidad y recibí cotizaciones comparables.' : 'Te avisamos en el resumen semanal cuando aparezcan.'}
        </Vacio>
      )}
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead>
            <tr><th>Pedido</th><th>Rubro</th><th className="num">Cantidad</th><th>Cierra</th><th>{rol === 'comprador' ? 'Cotizaciones' : 'Comprador'}</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {data?.pedidos.map(({ p, cotis, comprador }) => <Fila key={p.id} p={p} cotis={cotis.length} rol={rol} yaCotice={cotis.some((c) => c.proveedorId === usuarioId)} comprador={comprador.semiAnonimo ? `${comprador.cargo} · ${comprador.empresa}` : `${comprador.nombre} ${comprador.apellido} · ${comprador.empresa}`} />)}
          </tbody>
        </table>
      </div>
      {nuevo && <NuevoPedidoModal compradorId={usuarioId} onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); ir(`/cotizaciones/${id}`); }} />}
    </div>
  );
}

function Fila({ p, cotis, rol, comprador, yaCotice }: { p: PedidoCotizacion; cotis: number; rol: string; comprador: string; yaCotice: boolean }) {
  const dias = fmt.diasHasta(p.cierre);
  return (
    <tr>
      <td><Link to={`/cotizaciones/${p.id}`} className="tabla__tit"><span className="mono tenue">{p.id}</span> {p.titulo}</Link></td>
      <td>{rubro(p.rubro).nombre}</td>
      <td className="num mono">{fmt.numero(p.cantidad)} <span className="tenue">{p.unidad}</span></td>
      <td>{fmt.fecha(p.cierre)} {p.estado === 'abierto' && dias >= 0 && dias <= 7 && <Pill tono="senal">{dias === 0 ? 'hoy' : `${dias} d`}</Pill>}</td>
      <td>{rol === 'comprador' ? <span className="mono">{cotis}</span> : comprador}</td>
      <td>
        {p.estado === 'adjudicado' ? <Pill tono="ok">{t.estado.adjudicado}</Pill>
          : rol === 'proveedor' && yaCotice ? <Pill tono="sello">Cotizaste</Pill>
          : <Pill>{t.estado.abierto}</Pill>}
      </td>
    </tr>
  );
}
