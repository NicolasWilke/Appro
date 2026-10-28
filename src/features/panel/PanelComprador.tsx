import { Link } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useResponderSolicitud } from '@/auth/AuthProvider';
import { useQuery } from '@/data/DataProvider';
import type { Comprador, Proveedor, SolicitudContacto } from '@/domain/types';
import { fmt, t } from '@/i18n';
import { Avatar, Chip, Pill, Seccion, Vacio } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';
import { ContactoPersona } from '../red/ContactoPersona';
import { TarjetaProveedor } from '../red/TarjetaProveedor';

export function PanelComprador() {
  const { usuarioId } = useSesion();
  const { data } = useQuery(async (r) => {
    const yo = (await r.obtenerPersona(usuarioId)) as Comprador;
    const [sols, provs, pedidos] = await Promise.all([r.solicitudesRecibidas(usuarioId), r.listarProveedores(), r.listarPedidos({ compradorId: usuarioId })]);
    const cotis = await Promise.all(pedidos.map((p) => r.cotizacionesDe(p.id)));
    return { yo, sols, provs, pedidos: pedidos.map((p, i) => ({ p, n: cotis[i].length })) };
  }, [usuarioId]);
  if (!data) return <div className="envoltura pagina" />;

  const { yo, sols, provs, pedidos } = data;
  const prov = (id: string) => provs.find((p) => p.id === id)!;
  const pendientes = sols.filter((s) => s.estado === 'pendiente');
  const postergadas = sols.filter((s) => s.estado === 'postergada');
  const aceptadas = sols.filter((s) => s.estado === 'aceptada');
  const contactados = new Set(sols.map((s) => s.proveedorId));
  const sugeridos = provs.filter((p) => !contactados.has(p.id) && p.rubros.some((r) => yo.rubros.includes(r))).slice(0, 3);

  return (
    <div className="envoltura pagina panel">
      <header className="panel__cab">
        <div>
          <p className="eyebrow">Panel de comprador · {yo.empresa}</p>
          <h1>Hola, {yo.nombre}</h1>
        </div>
        <div className="filtrado">
          <span className="filtrado__n mono">23</span>
          <span>mensajes filtramos por vos esta semana. Solo te llegan solicitudes con motivo, de proveedores verificados y dentro de su cupo.</span>
        </div>
      </header>

      <div className="panel__grilla">
        <div className="panel__col">
          <Seccion titulo={`Solicitudes de contacto · ${pendientes.length} por responder`}>
            {pendientes.length === 0 && <Vacio titulo="No tenés solicitudes pendientes">Las nuevas llegan en tu resumen del lunes.</Vacio>}
            {pendientes.map((s) => <Solicitud key={s.id} s={s} p={prov(s.proveedorId)} />)}
            {pendientes.length > 0 && <p className="nota">Si elegís “No me interesa”, el proveedor solo ve que la solicitud se cerró.</p>}
          </Seccion>
          {postergadas.length > 0 && (
            <Seccion titulo="Para más adelante">
              {postergadas.map((s) => <Solicitud key={s.id} s={s} p={prov(s.proveedorId)} />)}
            </Seccion>
          )}
          <Seccion titulo="Tus pedidos de cotización" extra={<Link to="/cotizaciones" className="enlace">Ver todos</Link>}>
            {pedidos.map(({ p, n }) => (
              <Link key={p.id} to={`/cotizaciones/${p.id}`} className="fila-pedido">
                <span className="mono tenue">{p.id}</span>
                <span>{p.titulo}</span>
                <span>{p.estado === 'adjudicado' ? <Pill tono="ok">{t.estado.adjudicado}</Pill> : <Pill tono={n ? 'sello' : 'neutro'}>{n} cotizaciones</Pill>}</span>
              </Link>
            ))}
          </Seccion>
        </div>
        <div className="panel__col">
          <Seccion titulo="Canal directo">
            {aceptadas.length === 0 && <p className="tenue">Cuando aceptes una solicitud, acá vas a tener el mail y el teléfono.</p>}
            {aceptadas.map((s) => {
              const p = prov(s.proveedorId);
              return (
                <div key={s.id} className="contacto">
                  <div className="contacto__cab"><Avatar p={p} /><div><Link to={`/red/${p.id}`}><strong>{p.nombre} {p.apellido}</strong></Link><span className="tenue bloque-linea">{p.empresa}</span></div></div>
                  <ContactoPersona p={p} />
                </div>
              );
            })}
          </Seccion>
          <Seccion titulo="Proveedores sugeridos para tus rubros">
            <div className="pila">{sugeridos.map((p) => <TarjetaProveedor key={p.id} p={p} />)}</div>
          </Seccion>
          {yo.circulos.length > 0 && (
            <Seccion titulo="Tus círculos">
              <div className="chips">{yo.circulos.map((c) => <Chip key={c}>{c}</Chip>)}</div>
              <p className="tenue">Esta semana: guía de retenciones y percepciones de IIBB para compras interprovinciales.</p>
            </Seccion>
          )}
        </div>
      </div>
    </div>
  );
}

function Solicitud({ s, p }: { s: SolicitudContacto; p: Proveedor }) {
  const responderSolicitud = useResponderSolicitud();
  const avisar = useToast();
  const responder = async (estado: 'aceptada' | 'postergada' | 'rechazada') => {
    await responderSolicitud(s, estado);
    if (estado === 'aceptada') avisar(`Aceptaste a ${p.nombre} ${p.apellido}. Ya tienen canal directo.`);
    if (estado === 'postergada') avisar('La guardamos para más adelante.', 'info');
    if (estado === 'rechazada') avisar('Listo. El proveedor no ve que la rechazaste.', 'info');
  };
  return (
    <article className="solicitud">
      <div className="solicitud__cab">
        <Avatar p={p} />
        <div>
          <Link to={`/red/${p.id}`}><strong>{p.nombre} {p.apellido}</strong></Link>
          <span className="tenue bloque-linea">{p.cargo} · {p.empresa}</span>
        </div>
        <span className="tenue mono">{fmt.fecha(s.creada)}</span>
      </div>
      <blockquote className="motivo">{s.motivo}</blockquote>
      <div className="acciones-sol">
        <button className="btn btn--pri btn--chico" onClick={() => responder('aceptada')}>{t.acciones.aceptar}</button>
        {s.estado !== 'postergada' && <button className="btn btn--sec btn--chico" onClick={() => responder('postergada')}>{t.acciones.postergar}</button>}
        <button className="btn btn--ter btn--chico" onClick={() => responder('rechazada')}>{t.acciones.rechazar}</button>
      </div>
    </article>
  );
}
