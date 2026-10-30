import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery } from '@/data/DataProvider';
import {
  DIVISOR_HORAS, ESCENARIOS, acumuladoAnio, acumuladoProyectado, actualizarMonto, ajustePonderado, atrasado, entre, interanual, mensual, periodos, proyectarSerie, ultimo, valorHora,
} from '@/domain/indicadores';
import { variacionReal } from '@/domain/indice';
import type { EscalaConvenio, GrupoIndicador, Indicador } from '@/domain/types';
import { fmt } from '@/i18n';
import { Pill, Seccion, Vacio } from '@/ui/primitivas';
import { LineaSerie, mesCorto } from './LineaSerie';

const GRUPOS: Record<GrupoIndicador, string> = { precios: 'Índices de precios', construccion: 'Costo de la construcción', salarios: 'Salarios por convenio' };
const pct = (v: number | null) => (v === null ? <span className="tenue">s/d</span> : fmt.pct(v));
const puntos = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monto = (i: Pick<Indicador, 'unidad'>, v: number) => (i.unidad === 'puntos' ? puntos.format(v) : fmt.moneda(Math.round(v)));
const AVISO = 'Los valores son de referencia, se basan en fuentes públicas y pueden diferir del costo real de cada contratación (cargas sociales, antigüedad, adicionales, zona y margen). Verificá siempre con la escala vigente publicada por el organismo.';

/** Centro de referencias (sección 8): índices oficiales, escalas de convenio y calculadoras. Solo compradores. */
export function Referencias() {
  const { rol, usuarioId } = useSesion();
  const { data } = useQuery(async (r) => ({ ...(await r.indicadores()), admin: await r.esAdmin(usuarioId) }), [usuarioId]);
  const [abierto, setAbierto] = useState<string | null>('ipc');
  if (rol !== 'comprador' && data && !data.admin) {
    return <div className="envoltura pagina"><Vacio titulo="El centro de referencias es una herramienta para compradores">Sirve para revisar si una cotización es razonable y proyectar contratos.</Vacio></div>;
  }
  if (!data) return <div className="envoltura pagina" />;
  const { indicadores, escalas, admin } = data;

  return (
    <div className="envoltura pagina referencias">
      <header className="pagina__cab">
        <p className="eyebrow">Centro de referencias</p>
        <h1>Inflación, costos y convenios, para saber si un precio es razonable</h1>
        <p className="nota">{AVISO}</p>
        {admin && <Link to="/admin/indices" className="btn btn--sec btn--chico">Cargar datos nuevos</Link>}
      </header>

      {(['precios', 'construccion', 'salarios'] as GrupoIndicador[]).map((g) => (
        <Seccion key={g} titulo={GRUPOS[g]}>
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead><tr><th>Indicador</th><th>Último dato</th><th className="num">Valor</th><th className="num">Mensual</th><th className="num">Acumulado del año</th><th className="num">Interanual</th><th>Fuente</th></tr></thead>
              <tbody>
                {indicadores.filter((i) => i.grupo === g).map((i) => {
                  const u = ultimo(i);
                  return [
                    <tr key={i.id}>
                      <td><button type="button" className="enlace tabla__tit" aria-expanded={abierto === i.id} onClick={() => setAbierto(abierto === i.id ? null : i.id)}>{i.nombre}</button><span className="tenue bloque-linea">{i.organismo}{i.base ? ` · ${i.base}` : ''}</span></td>
                      <td>{u ? mesCorto(u.periodo) : '—'}{atrasado(i) && <> <Pill tono="mal">Sin actualizar</Pill></>}{i.proximaPublicacion && <span className="tenue bloque-linea">Próximo: {fmt.fecha(i.proximaPublicacion)}</span>}</td>
                      <td className="num mono">{u ? monto(i, u.valor) : '—'}{i.unidad !== 'puntos' && <span className="tenue"> /{i.unidad}</span>}</td>
                      <td className="num mono">{u ? pct(mensual(i, u.periodo)) : '—'}</td>
                      <td className="num mono">{u ? pct(acumuladoAnio(i, u.periodo)) : '—'}</td>
                      <td className="num mono">{u ? pct(interanual(i, u.periodo)) : '—'}</td>
                      <td>{i.fuente.url ? <a href={i.fuente.url} target="_blank" rel="noreferrer">{i.fuente.nombre}</a> : i.fuente.nombre}<span className="tenue bloque-linea">Cargado {fmt.fecha(i.actualizado)}</span></td>
                    </tr>,
                    abierto === i.id && (
                      <tr key={`${i.id}-g`} className="referencias__detalle"><td colSpan={7}>
                        <LineaSerie serie={i.serie} titulo={`${i.nombre}: evolución mensual`} />
                        {i.serie.some((p) => p.pactado) && <p className="tenue">Punteado: aumentos ya pactados en paritarias.</p>}
                        {i.nota && <p className="tenue">{i.nota}</p>}
                      </td></tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </Seccion>
      ))}

      <Seccion titulo="Escalas vigentes y valor hora">
        <p className="tenue">Valor hora = mensual ÷ {DIVISOR_HORAS}. El conformado incluye básico, presentismo, viático y sumas no remunerativas; no incluye antigüedad, nocturnidad, horas extra, cargas sociales, ART, uniformes, supervisión, margen ni IVA, así que no es el precio que factura una empresa.</p>
        <div className="grilla-2">{escalas.map((e) => <Escala key={e.id} e={e} />)}</div>
      </Seccion>

      <div className="grilla-2">
        <Actualizar indicadores={indicadores} />
        <Razonable indicadores={indicadores} />
        <Proyectar indicadores={indicadores} />
        <Clausula indicadores={indicadores} />
      </div>
    </div>
  );
}

function Escala({ e }: { e: EscalaConvenio }) {
  const porHora = e.categorias.some((c) => c.hora);
  return (
    <article className="tarjeta">
      <div>
        <p className="eyebrow">{e.actividad}</p>
        <h3>{e.convenio}</h3>
        <p className="tenue">Escala de {mesCorto(e.periodo)}{e.vigenciaHasta && ` · acuerdo vigente hasta el ${fmt.fecha(e.vigenciaHasta)}`}</p>
      </div>
      <div className="desborde">
      <table className="tabla tabla--compacta">
        <thead><tr><th>Categoría</th>{porHora ? <th className="num">Por hora</th> : <><th className="num">Básico</th><th className="num">Conformado</th><th className="num">Hora (÷{DIVISOR_HORAS})</th></>}</tr></thead>
        <tbody>
          {e.categorias.map((c) => (
            <tr key={c.nombre}>
              <td>{c.nombre}</td>
              {porHora
                ? <td className="num mono">{c.hora ? fmt.moneda(c.hora) : '—'}</td>
                : <>
                  <td className="num mono">{c.basico ? fmt.moneda(c.basico) : '—'}</td>
                  <td className="num mono">{c.conformado ? fmt.moneda(c.conformado) : '—'}</td>
                  <td className="num mono">{fmt.moneda(Math.round(valorHora(c.conformado ?? c.basico) ?? 0))}</td>
                </>}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {e.nota && <p className="tenue">{e.nota}</p>}
      {e.proximaRevision && <p className="tenue">Próxima revisión: {e.proximaRevision}.</p>}
      <p className="tenue">Fuente: {e.fuente.url ? <a href={e.fuente.url} target="_blank" rel="noreferrer">{e.fuente.nombre}</a> : e.fuente.nombre} · cargado {fmt.fecha(e.actualizado)}</p>
    </article>
  );
}

function ElegirIndicador({ id, valor, onCambio, indicadores, etiqueta = 'Indicador' }: { id: string; valor: string; onCambio: (v: string) => void; indicadores: Indicador[]; etiqueta?: string }) {
  return (
    <label className="campo" htmlFor={id}>
      <span>{etiqueta}</span>
      <select id={id} value={valor} onChange={(e) => onCambio(e.target.value)}>
        {(['precios', 'construccion', 'salarios'] as GrupoIndicador[]).map((g) => (
          <optgroup key={g} label={GRUPOS[g]}>{indicadores.filter((i) => i.grupo === g).map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}</optgroup>
        ))}
      </select>
    </label>
  );
}

function ElegirMes({ id, etiqueta, valor, onCambio, opciones }: { id: string; etiqueta: string; valor: string; onCambio: (v: string) => void; opciones: string[] }) {
  return (
    <label className="campo" htmlFor={id}>
      <span>{etiqueta}</span>
      <select id={id} value={valor} onChange={(e) => onCambio(e.target.value)}>{opciones.map((p) => <option key={p} value={p}>{mesCorto(p)}</option>)}</select>
    </label>
  );
}

/** Monto actualizado = monto × (índice final ÷ índice inicial). */
function Actualizar({ indicadores }: { indicadores: Indicador[] }) {
  const [id, setId] = useState('ipc');
  const i = indicadores.find((x) => x.id === id)!;
  const ps = periodos(i).filter((p) => !i.serie.find((x) => x.periodo === p)?.pactado);
  const [desde, setDesde] = useState(ps[0]);
  const [hasta, setHasta] = useState(ps[ps.length - 1]);
  const [monto, setMonto] = useState('1000000');
  const d = ps.includes(desde) ? desde : ps[0];
  const h = ps.includes(hasta) ? hasta : ps[ps.length - 1];
  const r = actualizarMonto(Number(monto) || 0, i, d, h);
  return (
    <Seccion titulo="Actualizar un monto">
      <ElegirIndicador id="act-ind" valor={id} onCambio={setId} indicadores={indicadores} />
      <div className="form__fila">
        <ElegirMes id="act-desde" etiqueta="Desde" valor={d} onCambio={setDesde} opciones={ps} />
        <ElegirMes id="act-hasta" etiqueta="Hasta" valor={h} onCambio={setHasta} opciones={ps} />
      </div>
      <label className="campo" htmlFor="act-monto"><span>Monto original</span><input id="act-monto" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
      {r !== null && <p className="resultado"><strong className="mono">{fmt.moneda(Math.round(r))}</strong> <span className="tenue">({pct(entre(i, d, h))} entre {mesCorto(d)} y {mesCorto(h)})</span></p>}
    </Seccion>
  );
}

/** Brecha: compara el aumento que pide un proveedor con la inflación, los mayoristas y el convenio que aplica. */
function Razonable({ indicadores }: { indicadores: Indicador[] }) {
  const [pedido, setPedido] = useState('40');
  const [conv, setConv] = useState('vigilador-basico');
  const ref = (id: string) => {
    const i = indicadores.find((x) => x.id === id);
    const u = i && ultimo(i);
    if (!i || !u) return null;
    const ia = interanual(i, u.periodo);
    return ia !== null ? { nombre: i.nombre, v: ia, que: 'interanual' } : { nombre: i.nombre, v: acumuladoAnio(i, u.periodo), que: `acumulado ${u.periodo.slice(0, 4)}` };
  };
  const filas = [ref('ipc'), ref('ipim'), ref(conv)].filter((x): x is NonNullable<typeof x> => !!x && x.v !== null);
  const p = Number(pedido) || 0;
  return (
    <Seccion titulo="¿Es razonable el aumento que piden?">
      <label className="campo" htmlFor="raz-pct"><span>Aumento que pide el proveedor (% anual)</span><input id="raz-pct" inputMode="decimal" value={pedido} onChange={(e) => setPedido(e.target.value)} /></label>
      <ElegirIndicador id="raz-conv" etiqueta="Convenio o costo que aplica" valor={conv} onCambio={setConv} indicadores={indicadores.filter((i) => i.grupo !== 'precios')} />
      <ul className="lista-brecha">
        {filas.map((f) => {
          const brecha = p - f.v!;
          return <li key={f.nombre}><span>{f.nombre} <span className="tenue">({f.que})</span></span><span className="mono">{fmt.pct(f.v!)}</span><Pill tono={brecha > 5 ? 'mal' : brecha > 0 ? 'senal' : 'ok'}>{brecha > 0 ? `${fmt.pct(brecha, false)} por encima` : 'En línea o por debajo'}</Pill></li>;
        })}
      </ul>
      {filas[0] && <p className="tenue">En términos reales, {fmt.pct(p)} contra la inflación es {fmt.pct(variacionReal(p, filas[0].v!))}.</p>}
    </Seccion>
  );
}

function Proyectar({ indicadores }: { indicadores: Indicador[] }) {
  const [id, setId] = useState('vigilador-conformado');
  const [esc, setEsc] = useState<keyof typeof ESCENARIOS | 'propia'>('base');
  const [propia, setPropia] = useState('2');
  const [meses, setMeses] = useState(6);
  const i = indicadores.find((x) => x.id === id)!;
  const tasa = esc === 'propia' ? Number(propia) || 0 : ESCENARIOS[esc];
  const proy = proyectarSerie(i, tasa, meses);
  const u = ultimo(i);
  const fin = proy[proy.length - 1];
  return (
    <Seccion titulo="Proyectar un valor">
      <ElegirIndicador id="pro-ind" valor={id} onCambio={setId} indicadores={indicadores} />
      <div className="segmento segmento--apilable" role="group" aria-label="Escenario">
        {(Object.keys(ESCENARIOS) as (keyof typeof ESCENARIOS)[]).map((k) => <button key={k} type="button" className={esc === k ? 'is-activo' : ''} aria-pressed={esc === k} onClick={() => setEsc(k)}>{k[0].toUpperCase() + k.slice(1)} {fmt.pct(ESCENARIOS[k], false)}</button>)}
        <button type="button" className={esc === 'propia' ? 'is-activo' : ''} aria-pressed={esc === 'propia'} onClick={() => setEsc('propia')}>Mi tasa</button>
      </div>
      <div className="form__fila">
        {esc === 'propia' && <label className="campo" htmlFor="pro-tasa"><span>Inflación mensual supuesta (%)</span><input id="pro-tasa" inputMode="decimal" value={propia} onChange={(e) => setPropia(e.target.value)} /></label>}
        <label className="campo" htmlFor="pro-meses"><span>Meses</span>
          <select id="pro-meses" value={meses} onChange={(e) => setMeses(Number(e.target.value))}>{[3, 6, 12].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
      </div>
      {u && fin && (
        <>
          <p className="resultado">{mesCorto(fin.periodo)}: <strong className="mono">{monto(i, fin.valor)}</strong> <span className="tenue">({fmt.pct((fin.valor / u.valor - 1) * 100)} sobre {mesCorto(u.periodo)}; la tasa sola daría {fmt.pct(acumuladoProyectado(tasa, meses))})</span></p>
          {i.unidad === 'mes' && <p className="tenue">Valor hora proyectado (÷{DIVISOR_HORAS}): {fmt.moneda(Math.round(valorHora(fin.valor)!))}</p>}
          <LineaSerie serie={i.serie.filter((p) => !p.pactado)} extra={proy} titulo={`${i.nombre}: proyección a ${meses} meses`} />
          {proy.some((p) => p.pactado) && <p className="tenue">Usa los aumentos ya pactados y aplica la tasa recién después.</p>}
        </>
      )}
      <p className="tenue">Estimación orientativa: no garantiza valores futuros. El escenario base toma la inflación de septiembre 2026; reemplazalo por la expectativa del REM del BCRA cuando la cargues.</p>
    </Seccion>
  );
}

const COMPONENTES_INICIALES = [{ peso: '60', id: 'vigilador-basico', nombre: 'Mano de obra' }, { peso: '25', id: 'ipim', nombre: 'Materiales e insumos' }, { peso: '15', id: 'ipc-ba', nombre: 'Gastos generales' }];

/** Cláusula de ajuste ponderada: cada componente con su peso y su índice. */
function Clausula({ indicadores }: { indicadores: Indicador[] }) {
  const [comps, setComps] = useState(COMPONENTES_INICIALES);
  const [desde, setDesde] = useState('2025-12');
  const [hasta, setHasta] = useState('2026-09');
  const opciones = ['2025-09', '2025-12', '2026-07', '2026-08', '2026-09', '2026-10'];
  const filas = comps.map((c) => ({ ...c, v: entre(indicadores.find((i) => i.id === c.id)!, desde, hasta) }));
  let resultado: number | null = null;
  let error = '';
  if (filas.every((f) => f.v !== null)) {
    try { resultado = ajustePonderado(filas.map((f) => ({ peso: Number(f.peso) || 0, variacion: f.v! }))); } catch (e) { error = (e as Error).message; }
  } else error = 'Algún indicador no tiene dato para esos meses: probá con otro período.';
  return (
    <Seccion titulo="Simular una cláusula de ajuste">
      <div className="form__fila">
        <ElegirMes id="cla-desde" etiqueta="Desde" valor={desde} onCambio={setDesde} opciones={opciones} />
        <ElegirMes id="cla-hasta" etiqueta="Hasta" valor={hasta} onCambio={setHasta} opciones={opciones} />
      </div>
      {filas.map((f, n) => (
        <div key={f.nombre} className="clausula__fila">
          <label className="campo campo--chico" htmlFor={`cla-p${n}`}><span>{f.nombre} (%)</span><input id={`cla-p${n}`} inputMode="decimal" value={f.peso} onChange={(e) => setComps(comps.map((c, j) => (j === n ? { ...c, peso: e.target.value } : c)))} /></label>
          <ElegirIndicador id={`cla-i${n}`} etiqueta="Índice" valor={f.id} onCambio={(v) => setComps(comps.map((c, j) => (j === n ? { ...c, id: v } : c)))} indicadores={indicadores} />
          <span className="mono clausula__var">{pct(f.v)}</span>
        </div>
      ))}
      {resultado !== null && <p className="resultado">Ajuste del período: <strong className="mono">{fmt.pct(resultado)}</strong></p>}
      {error && <p className="error" role="alert">{error}</p>}
    </Seccion>
  );
}
