import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery, useRepo } from '@/data/DataProvider';
import { useToast } from '@/ui/Toast';
import type { FrecuenciaAvisos } from '@/domain/types';
import { PLANES } from '@/domain/planes';
import { estadoVisibleParaProveedor } from '@/domain/reglas';
import type { Comprador, Proveedor } from '@/domain/types';
import { fmt, t } from '@/i18n';
import { Avatar, Copiable, Medidor, Pill, Seccion, Vacio, type TonoPill } from '@/ui/primitivas';
import { ventanaAbierta } from '../red/FichaComprador';
import { PedirContacto } from '../red/PedirContacto';
import { TarjetaComprador } from '../red/TarjetaProveedor';

const TONO: Record<string, TonoPill> = { pendiente: 'senal', aceptada: 'ok', postergada: 'neutro', cerrada: 'neutro' };

export function PanelProveedor() {
  const { usuarioId } = useSesion();
  const [contactar, setContactar] = useState<Comprador | null>(null);
  const repo = useRepo();
  const avisar = useToast();
  const { data } = useQuery(async (r) => {
    const yo = (await r.obtenerPersona(usuarioId)) as Proveedor;
    const [uso, embudo, enviadas, compradores, pedidos] = await Promise.all([
      r.uso(usuarioId), r.embudo(usuarioId), r.solicitudesEnviadas(usuarioId), r.listarCompradores(), r.listarPedidos({ rubros: yo.rubros }),
    ]);
    return { yo, uso, embudo, enviadas, compradores, pedidos };
  }, [usuarioId]);
  if (!data) return <div className="envoltura pagina" />;

  const { yo, uso, embudo, enviadas, compradores, pedidos } = data;
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
          <Seccion titulo="Pedidos de cotización de tus rubros" extra={<Link to="/cotizaciones" className="enlace">Ver todos</Link>}>
            {pedidos.filter((p) => p.estado === 'abierto').map((p) => (
              <Link key={p.id} to={`/cotizaciones/${p.id}`} className="fila-pedido">
                <span className="mono tenue">{p.id}</span>
                <span>{p.titulo}</span>
                <span className="tenue">Cierra {fmt.fecha(p.cierre)}</span>
              </Link>
            ))}
          </Seccion>
        </div>
        <div className="panel__col">
          <Seccion titulo="Avisos de pedidos nuevos">
            <p className="tenue">Te llegan a {yo.contacto.email} los pedidos de tus rubros.</p>
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
                      <Copiable etiqueta="Mail" texto={c.contacto.email} />
                      <Copiable etiqueta="Teléfono" texto={c.contacto.telefono} />
                    </div>
                  )}
                  {est === 'cerrada' && <p className="tenue">Se cerró sin respuesta. Podés volver a intentar con otra propuesta.</p>}
                </article>
              );
            })}
          </Seccion>
        </div>
      </div>
      {contactar && <PedirContacto comprador={contactar} proveedorId={usuarioId} onCerrar={() => setContactar(null)} />}
    </div>
  );
}
