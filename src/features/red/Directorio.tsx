import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery } from '@/data/DataProvider';
import { REGIONES, RUBROS, region, rubro } from '@/domain/catalogos';
import { COMPARAR_MAX, ordenar, promedioPonderado, reputacionVisible, type Orden } from '@/domain/directorio';
import type { FiltroRed, Persona, Proveedor, RegionId, RubroId } from '@/domain/types';
import { Chip, Seccion, Vacio } from '@/ui/primitivas';
import { Insignias, Reputacion, TarjetaComprador, TarjetaProveedor } from './TarjetaProveedor';

type Lista = 'todos' | 'favoritos' | 'cotizaron' | 'adjudique';
const LISTAS: Record<Lista, string> = { todos: 'Toda la red', favoritos: 'Solo mis favoritos', cotizaron: 'Ya me cotizaron', adjudique: 'Les adjudiqué' };
const ORDENES: Record<Orden, string> = { relevancia: 'Relevancia', calificacion: 'Mejor calificados', resenas: 'Más reseñas', antiguedad: 'Más trayectoria' };

export function Directorio() {
  const { rol, usuarioId } = useSesion();
  const ir = useNavigate();
  const [pestana, setPestana] = useState<'compradores' | 'proveedores'>(rol === 'proveedor' ? 'compradores' : 'proveedores');
  const [filtro, setFiltro] = useState<FiltroRed>({});
  const [minimo, setMinimo] = useState(0);
  const [conCert, setConCert] = useState(false);
  const [lista, setLista] = useState<Lista>('todos');
  const [orden, setOrden] = useState<Orden>('relevancia');
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [comparando, setComparando] = useState(false);
  const { data } = useQuery<Persona[]>((r) => pestana === 'compradores' ? r.listarCompradores(filtro) : r.listarProveedores(filtro), [pestana, JSON.stringify(filtro)]);
  // Las listas propias del comprador: favoritos, quién le cotizó y a quién le adjudicó. Sin precios.
  const { data: mias } = useQuery(async (r) => {
    if (rol !== 'comprador') return null;
    const [favoritos, pedidos] = await Promise.all([r.favoritos(usuarioId), r.listarPedidos({ compradorId: usuarioId, visorId: usuarioId })]);
    const cotis = await Promise.all(pedidos.map((p) => r.cotizacionesDe(p.id).catch(() => [])));
    return {
      favoritos: new Set(favoritos),
      cotizaron: new Set(cotis.flat().map((c) => c.proveedorId)),
      adjudique: new Set(pedidos.flatMap((p) => p.adjudicados ?? (p.adjudicadaA ? [p.adjudicadaA] : []))),
    };
  }, [rol, usuarioId]);

  const esComprador = rol === 'comprador' && pestana === 'proveedores';
  let resultados = data ?? [];
  if (pestana === 'proveedores') {
    let provs = resultados as Proveedor[];
    if (minimo) provs = provs.filter((p) => reputacionVisible(p) && promedioPonderado(p) >= minimo);
    if (conCert) provs = provs.filter((p) => p.certificaciones.length > 0);
    if (lista !== 'todos' && mias) provs = provs.filter((p) => mias[lista].has(p.id));
    resultados = ordenar(provs, orden, filtro.rubro);
  }
  const elegidos = (data ?? []).filter((p): p is Proveedor => p.rol === 'proveedor' && seleccion.includes(p.id));
  const alternar = (id: string, si: boolean) => setSeleccion(si ? [...seleccion, id] : seleccion.filter((x) => x !== id));

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab">
        <p className="eyebrow">La red</p>
        <h1>Personas con nombre y apellido, empresas verificadas</h1>
      </header>
      <div className="pestanas" role="tablist">
        {(['proveedores', 'compradores'] as const).map((p) => (
          <button key={p} role="tab" aria-selected={pestana === p} className={pestana === p ? 'is-activa' : ''} onClick={() => setPestana(p)}>
            {p === 'proveedores' ? 'Proveedores' : 'Compradores'}
          </button>
        ))}
      </div>
      <div className="filtros">
        <label className="campo campo--inline" htmlFor="buscar">
          <span>Buscar</span>
          <input id="buscar" type="search" placeholder="Nombre, empresa, ciudad o producto" value={filtro.texto ?? ''} onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })} />
        </label>
        <label className="campo campo--inline" htmlFor="f-region">
          <span>Región</span>
          <select id="f-region" value={filtro.region ?? ''} onChange={(e) => setFiltro({ ...filtro, region: (e.target.value || undefined) as RegionId | undefined })}>
            <option value="">Todas</option>
            {REGIONES.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        {pestana === 'proveedores' && (
          <>
            <label className="campo campo--inline" htmlFor="f-min">
              <span>Calificación</span>
              <select id="f-min" value={minimo} onChange={(e) => setMinimo(Number(e.target.value))}>
                <option value={0}>Cualquiera</option>
                <option value={4}>4 o más</option>
                <option value={3}>3 o más</option>
              </select>
            </label>
            <label className="campo campo--inline" htmlFor="f-orden">
              <span>Ordenar por</span>
              <select id="f-orden" value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
                {(Object.keys(ORDENES) as Orden[]).map((o) => <option key={o} value={o}>{ORDENES[o]}</option>)}
              </select>
            </label>
            <label className="opcion opcion--inline">
              <input type="checkbox" checked={conCert} onChange={(e) => setConCert(e.target.checked)} />
              <span>Con certificaciones</span>
            </label>
          </>
        )}
        {pestana === 'compradores' && (
          <label className="opcion opcion--inline">
            <input type="checkbox" checked={!!filtro.soloVentanaAbierta} onChange={(e) => setFiltro({ ...filtro, soloVentanaAbierta: e.target.checked })} />
            <span>Solo con ventana de compra abierta</span>
          </label>
        )}
      </div>
      {esComprador && (
        <div className="segmento" role="group" aria-label="Mis listas">
          {(Object.keys(LISTAS) as Lista[]).map((l) => <button key={l} type="button" aria-pressed={lista === l} className={lista === l ? 'is-activo' : ''} onClick={() => setLista(l)}>{LISTAS[l]}</button>)}
        </div>
      )}
      <div className="chips chips--filtro">
        <Chip activo={!filtro.rubro} onClick={() => setFiltro({ ...filtro, rubro: undefined })}>Todos los rubros</Chip>
        {RUBROS.map((r) => <Chip key={r.id} activo={filtro.rubro === r.id} onClick={() => setFiltro({ ...filtro, rubro: r.id as RubroId })}>{r.nombre}</Chip>)}
      </div>
      {data && resultados.length === 0 && <Vacio titulo="No hay resultados con esos filtros">Probá con otra región, otra calificación o con todos los rubros.</Vacio>}
      <div className="grilla-3">
        {resultados.map((p) => p.rol === 'comprador'
          ? <TarjetaComprador key={p.id} c={p} oculto={p.semiAnonimo} />
          : <TarjetaProveedor key={p.id} p={p} seleccionado={seleccion.includes(p.id)} onSeleccionar={esComprador ? (si) => alternar(p.id, si) : undefined} />)}
      </div>
      {esComprador && seleccion.length > 0 && (
        <div className="barra-seleccion" role="region" aria-label="Proveedores seleccionados">
          <span><strong>{seleccion.length}</strong> {seleccion.length === 1 ? 'seleccionado' : 'seleccionados'}</span>
          <button className="btn btn--sec btn--chico" disabled={seleccion.length < 2 || seleccion.length > COMPARAR_MAX} title={`De 2 a ${COMPARAR_MAX} proveedores`} onClick={() => setComparando(true)}>Comparar</button>
          <button className="btn btn--pri btn--chico" onClick={() => ir(`/cotizaciones/nuevo?invitar=${seleccion.join(',')}`)}>Invitar a un pedido privado</button>
          <button className="btn btn--ter btn--chico" onClick={() => setSeleccion([])}>Limpiar</button>
        </div>
      )}
      {comparando && elegidos.length >= 2 && <Comparar provs={elegidos} onCerrar={() => setComparando(false)} />}
    </div>
  );
}

/** Lado a lado, hasta 4: solo datos públicos del perfil y reputación. Nunca precios de otras cotizaciones. */
function Comparar({ provs, onCerrar }: { provs: Proveedor[]; onCerrar: () => void }) {
  const filas: [string, (p: Proveedor) => React.ReactNode][] = [
    ['Calificación', (p) => <Reputacion p={p} />],
    ['Insignias', (p) => <Insignias p={p} />],
    ['Rubros', (p) => p.rubros.map((r) => rubro(r).nombre).join(', ')],
    ['Ubicación', (p) => `${p.ciudad} · ${region(p.region).nombre}`],
    ['Cobertura', (p) => REGIONES.filter((r) => (p.cobertura[r.id] ?? 0) > 0).map((r) => `${r.nombre} ${p.cobertura[r.id]}%`).join(', ') || '—'],
    ['En actividad desde', (p) => p.desde],
    ['Empleados', (p) => p.empleados || '—'],
    ['Certificaciones', (p) => p.certificaciones.join(', ') || '—'],
  ];
  return (
    <Seccion titulo={`Comparación · ${provs.length} proveedores`} extra={<button className="btn btn--ter btn--chico" onClick={onCerrar}>Cerrar</button>}>
      <div className="tabla-envoltura">
        <table className="tabla tabla--comparar">
          <thead><tr><th scope="col" />{provs.map((p) => <th key={p.id} scope="col"><Link className="tabla__tit" to={`/red/${p.id}`}>{p.empresa}</Link></th>)}</tr></thead>
          <tbody>{filas.map(([k, f]) => <tr key={k}><th scope="row">{k}</th>{provs.map((p) => <td key={p.id}>{f(p)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Seccion>
  );
}
