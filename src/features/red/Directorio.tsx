import { useState } from 'react';
import { useSesion } from '@/app/session';
import { useQuery } from '@/data/DataProvider';
import { REGIONES, RUBROS } from '@/domain/catalogos';
import type { FiltroRed, Persona, RegionId, RubroId } from '@/domain/types';
import { Chip, Vacio } from '@/ui/primitivas';
import { TarjetaComprador, TarjetaProveedor } from './TarjetaProveedor';

export function Directorio() {
  const { rol } = useSesion();
  const [pestana, setPestana] = useState<'compradores' | 'proveedores'>(rol === 'proveedor' ? 'compradores' : 'proveedores');
  const [filtro, setFiltro] = useState<FiltroRed>({});
  const { data } = useQuery<Persona[]>((r) => pestana === 'compradores' ? r.listarCompradores(filtro) : r.listarProveedores(filtro), [pestana, JSON.stringify(filtro)]);

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
          <input id="buscar" type="search" placeholder="Nombre, empresa o ciudad" value={filtro.texto ?? ''} onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })} />
        </label>
        <label className="campo campo--inline" htmlFor="f-region">
          <span>Región</span>
          <select id="f-region" value={filtro.region ?? ''} onChange={(e) => setFiltro({ ...filtro, region: (e.target.value || undefined) as RegionId | undefined })}>
            <option value="">Todas</option>
            {REGIONES.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        {pestana === 'compradores' && (
          <label className="opcion opcion--inline">
            <input type="checkbox" checked={!!filtro.soloVentanaAbierta} onChange={(e) => setFiltro({ ...filtro, soloVentanaAbierta: e.target.checked })} />
            <span>Solo con ventana de compra abierta</span>
          </label>
        )}
      </div>
      <div className="chips chips--filtro">
        <Chip activo={!filtro.rubro} onClick={() => setFiltro({ ...filtro, rubro: undefined })}>Todos los rubros</Chip>
        {RUBROS.map((r) => <Chip key={r.id} activo={filtro.rubro === r.id} onClick={() => setFiltro({ ...filtro, rubro: r.id as RubroId })}>{r.nombre}</Chip>)}
      </div>
      {data && data.length === 0 && <Vacio titulo="No hay resultados con esos filtros">Probá con otra región o con todos los rubros.</Vacio>}
      <div className="grilla-3">
        {data?.map((p) => p.rol === 'comprador' ? <TarjetaComprador key={p.id} c={p} oculto={p.semiAnonimo} /> : <TarjetaProveedor key={p.id} p={p} />)}
      </div>
    </div>
  );
}
