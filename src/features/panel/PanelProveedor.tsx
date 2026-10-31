import { recibeOfertas } from '@/domain/rfq';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useAuth } from '@/auth/AuthProvider';
import { useQuery, useRepo } from '@/data/DataProvider';
import { useToast } from '@/ui/Toast';
import type { FrecuenciaAvisos } from '@/domain/types';
import { PLANES } from '@/domain/planes';
import { estadoVisibleParaProveedor } from '@/domain/reglas';
import type { Comprador, Proveedor } from '@/domain/types';
import { fmt, t } from '@/i18n';
import { Avatar, Medidor, Pill, Seccion, Vacio, type TonoPill } from '@/ui/primitivas';
import { ventanaAbierta } from '../red/FichaComprador';
import { PedirContacto } from '../red/PedirContacto';
import { TarjetaComprador } from '../red/TarjetaProveedor';
import { ContactoPersona } from '../red/ContactoPersona';
import { PedidosDeValor } from '../recientes/PedidosDeValor';
import { PrimerosPasos } from './PrimerosPasos';

const TONO: Record<string, TonoPill> = { pendiente: 'senal', aceptada: 'ok', postergada: 'neutro', cerrada: 'neutro' };

export function PanelProveedor() {
  const { usuarioId } = useSesion();
  const { cuenta } = useAuth();
  const [contactar, setContactar] = useState<Comprador | null>(null);
  const repo = useRepo();
  const avisar = useToast();
  const { data } = useQuery(async (r) => {
    const yo = (await r.obtenerPersona(usuarioId)) as Proveedor;
    const [uso, embudo, enviadas, compradores, pedidos] = await Promise.all([
      r.uso(usuarioId), r.embudo(usuarioId), r.solicitudesEnviadas(usuarioId), r.listarCompradores(), r.listarPedidos({ rubros: yo.rubros, visorId: usuarioId }),
    ]);
    // En cuáles ya cotizó: cada proveedor solo puede leer su propia oferta.
    const mias = await Promise.all(pedidos.filter((p) => recibeOfertas(p)).map(async (p) => ((await r.cotizacionesDe(p.id)).some((c) => c.proveedorId === usuarioId) ? p.id : null)));
    return { yo, uso, embudo, enviadas, compradores, pedidos, cotizados: new Set(mias.filter(Boolean) as string[]) };
  }, [usuarioId]);
  if (!data) return <div className="envoltura pagina" />;

  const { yo, uso, embudo, enviadas, compradores, pedidos, cotizados } = data;
  // Lo que le da trabajo al proveedor va primero: abiertos sin cotizar, el que cierra antes arriba.
  const abiertos = pedidos.filter((p) => recibeOfertas(p)).sort((a, b) => a.cierraEn.localeCompare(b.cierraEn));
  const paraCotizar = abiertos.filter((p) => !cotizados.has(p.id));
  const yaCotizados = abiertos.length - paraCotizar.length;
  const plan = PLANES[yo.plan];
  const comp = (id: string) => compradores.find((c) => c.id === id)!;
  const contactados = new Set(enviadas.filter((s) => s.estado !== 'rechazada').map((s) => s.compradorId));
  const oportunidades = compradores.filter((c) => ventanaAbierta(c) && !contactados.has(c.id) && c.rubros.some((r) => yo.rubros.includes(r)));
  const etapas = [
    { k: 'Vistas de perfil', v: embudo.vistas },
    { k: 'Solicitudes enviadas', v: embudo.solicitudes },
    { k: 'Aceptadas', v: embudo.aceptadas },
    { k: 'Reuniones', v: embudo.reuniones },
    { k: 'Cotizaciones ganadas', v: embudo.ganadas },
  ];
  const tasa = embudo.solicitudes ? Math.round((embudo.aceptadas / embudo.solicitudes) * 100) : 0;

  return (
    <div className="envoltura pagina panel">
      <header className="panel__cab">
        <div>
          <p className="eyebrow">Panel de proveedor · {yo.empresa}</p>
          <h1>Hola, {yo.nombre}</h1>
        </div>
        <div className="plan-actual">
          <span>Plan <strong>{plan.nombre}</strong></span>
          <Medidor etiqueta="Solicitudes de contacto este mes" usado={uso.solicitudesUsadas} total={plan.solicitudesMes} />
          <Medidor etiqueta="Respuestas a pedidos" usado={uso.respuestasUsadas} total={plan.respuestasMes} />
          <Link to="/planes" className="enlace">Cambiar de plan</Link>
        </div>
      </header>

      <PrimerosPasos usuarioId={usuarioId} pasos={[
        { hecho: !!yo.logo, texto: 'Subí el logo de tu empresa: es lo primero que ve el comprador.', a: '/perfil', accion: 'Ir a mi perfil' },
        { hecho: cotizados.size > 0 || uso.respuestasUsadas > 0, texto: 'Cotizá tu primer pedido.', a: '/cotizaciones', accion: 'Ver pedidos' },
        { hecho: enviadas.length > 0, texto: 'Pedile contacto a un comprador con ventana de compra abierta.', a: '/red', accion: 'Ver compradores' },
      ]} />

      <Seccion titulo={`Para cotizar · ${paraCotizar.length}`} extra={<Link to="/cotizaciones" className="enlace">{yaCotizados > 0 ? `Ver todos (ya cotizaste ${yaCotizados})` : 'Ver todos'}</Link>}>
        {paraCotizar.length === 0 && (
          <Vacio titulo={abiertos.length ? 'Cotizaste todos los pedidos abiertos de tus rubros' : 'No hay pedidos abiertos en tus rubros'}>
            Te avisamos por mail cuando se publique uno nuevo o cuando un comprador te invite.
          </Vacio>
        )}
        {paraCotizar.map((p) => {
          const dias = fmt.diasHasta(p.cierre);
          return (
            <div key={p.id} className="fila-cotizar">
              <Link to={`/cotizaciones/${p.id}`} className="fila-cotizar__txt">
                <span className="mono tenue">{p.id}</span> <strong>{p.titulo}</strong>
                <span className="tenue bloque-linea">
                  {p.items.length > 1 ? `${p.items.length} ítems` : `${fmt.numero(p.cantidad)} ${p.unidad}`} · {p.zona || 'Sin zona'}{p.moneda === 'USD' && ' · en dólares'}{p.privado && ' · invitación'}
                </span>
              </Link>
              <Pill tono={dias <= 2 ? 'senal' : 'neutro'}>{dias <= 0 ? 'Cierra hoy' : dias === 1 ? 'Cierra mañana' : `Cierra en ${dias} días`}</Pill>
              <Link to={`/cotizaciones/${p.id}?cotizar=1`} className="btn btn--pri btn--chico">Cotizar</Link>
            </div>
          );
        })}
      </Seccion>

      <div className="panel__grilla">
        <div className="panel__col">
          <Seccion titulo="Compradores con ventana abierta en tus rubros">
            {oportunidades.length === 0 && <Vacio titulo="Ya contactaste a todos los compradores activos de tus rubros" />}
            <div className="pila">
              {oportunidades.map((c) => (
                <div key={c.id} className="oportunidad">
                  <TarjetaComprador c={c} oculto={c.semiAnonimo} />
                  <button className="btn btn--pri btn--chico" onClick={() => setContactar(c)}>{t.acciones.pedirContacto}</button>
                </div>
              ))}
            </div>
          </Seccion>
        </div>
        <div className="panel__col">
          <PedidosDeValor />
          <Seccion titulo="Avisos de pedidos nuevos">
            <p className="tenue">Te llegan a {cuenta?.contacto.email} los pedidos de tus rubros.</p>
            <div className="segmento segmento--ancho segmento--apilable" role="group" aria-label="Frecuencia de avisos">
              {([['inmediato', 'Un mail por pedido'], ['diario', 'Resumen diario'], ['pausado', 'Pausar']] as [FrecuenciaAvisos, string][]).map(([f, txt]) => (
                <button key={f} type="button" aria-pressed={yo.avisos === f} className={yo.avisos === f ? 'is-activo' : ''}
                  onClick={async () => { await repo.cambiarAvisos(usuarioId, f); avisar(f === 'pausado' ? 'Pausaste los avisos. Los pedidos siguen visibles en Cotizaciones.' : f === 'diario' ? 'Listo. Vas a recibir un resumen por día a las 8:00.' : 'Listo. Te escribimos apenas se publique un pedido de tu rubro.', 'info'); }}>
                  {txt}
                </button>
              ))}
            </div>
          </Seccion>
          <Seccion titulo="Tus solicitudes">
            {enviadas.length === 0 && <p className="tenue">Todavía no pediste contacto a ningún comprador. Cuando lo hagas, acá ves si te aceptó y sus datos.</p>}
            {enviadas.map((s) => {
              const c = comp(s.compradorId);
              const est = estadoVisibleParaProveedor(s.estado);
              const visible = !c.semiAnonimo || s.estado === 'aceptada';
              return (
                <article key={s.id} className="solicitud solicitud--enviada">
                  <div className="solicitud__cab">
                    <Avatar p={c} oculto={!visible} />
                    <div>
                      <Link to={`/red/${c.id}`}><strong>{visible ? `${c.nombre} ${c.apellido}` : c.cargo}</strong></Link>
                      <span className="tenue bloque-linea">{c.empresa}</span>
                    </div>
                    <Pill tono={TONO[est]}>{t.estado[est]}</Pill>
                  </div>
                  {s.estado === 'aceptada' && (
                    <div className="contacto contacto--plano">
                      <ContactoPersona p={c} aceptado />
                    </div>
                  )}
                  {est === 'cerrada' && <p className="tenue">Se cerró sin respuesta. Podés volver a intentar con otra propuesta.</p>}
                </article>
              );
            })}
          </Seccion>
        </div>
      </div>
      <Seccion titulo="Tu embudo · últimos 90 días" extra={plan.analitica ? <Pill tono={tasa >= 60 ? 'ok' : 'senal'}>{tasa}% de aceptación</Pill> : undefined}>
        <div className={`embudo ${plan.analitica ? '' : 'is-bloqueado'}`}>
          {etapas.map((e) => (
            <div key={e.k} className="embudo__etapa">
              <span className="embudo__v mono">{fmt.numero(e.v)}</span>
              <span className="embudo__barra"><span style={{ width: `${Math.max(4, (e.v / etapas[0].v) * 100)}%` }} /></span>
              <span className="embudo__k">{e.k}</span>
            </div>
          ))}
          {!plan.analitica && (
            <div className="embudo__candado">
              <p><strong>La analítica del embudo está en Pro y Empresa.</strong> Medí cuántas solicitudes se convierten en reuniones y en ventas.</p>
              <Link to="/planes" className="btn btn--pri btn--chico">Ver planes</Link>
            </div>
          )}
        </div>
      </Seccion>

      {contactar && <PedirContacto comprador={contactar} proveedorId={usuarioId} onCerrar={() => setContactar(null)} />}
    </div>
  );
}
