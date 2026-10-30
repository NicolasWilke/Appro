import { Link } from 'react-router-dom';
import { region, rubro } from '@/domain/catalogos';
import { PLANES } from '@/domain/planes';
import { insignias, promedioPonderado, reputacionVisible, type Insignia } from '@/domain/directorio';
import type { Proveedor } from '@/domain/types';
import { Avatar, Chip, Estrellas, Pill } from '@/ui/primitivas';

export const promedio = (p: Proveedor) =>
  p.resenas.length ? p.resenas.reduce((a, r) => a + (r.entrega + r.calidad + r.facturacion) / 3, 0) / p.resenas.length : 0;

export const NOMBRE_INSIGNIA: Record<Insignia, string> = { verificado: 'Verificado', top: 'Top Rated', certificado: 'Certificado' };

export function Insignias({ p }: { p: Proveedor }) {
  const lista = insignias(p);
  if (!lista.length) return null;
  return <div className="chips">{lista.map((i) => <Pill key={i} tono={i === 'top' ? 'ok' : 'sello'}>{NOMBRE_INSIGNIA[i]}</Pill>)}</div>;
}

export function Reputacion({ p }: { p: Proveedor }) {
  if (!reputacionVisible(p)) return <span className="tenue">Proveedor nuevo en la red{p.resenas.length ? ` (${p.resenas.length} ${p.resenas.length === 1 ? 'reseña' : 'reseñas'})` : ''}</span>;
  const prom = promedioPonderado(p);
  return <span><Estrellas valor={prom} /> <span className="mono">{prom.toFixed(1)}</span> <span className="tenue">({p.resenas.length})</span></span>;
}

export function TarjetaProveedor({ p, seleccionado, onSeleccionar }: { p: Proveedor; seleccionado?: boolean; onSeleccionar?: (si: boolean) => void }) {
  return (
    <article className={`tarjeta ${seleccionado ? 'is-seleccionada' : ''}`}>
      <div className="tarjeta__cab">
        <Avatar p={p} />
        <div className="tarjeta__id">
          <h3><Link to={`/red/${p.id}`}>{p.empresa}</Link></h3>
          <p>{p.nombre} {p.apellido} · {p.cargo}</p>
        </div>
        {PLANES[p.plan].destacado && <span title="Visibilidad paga: no es una insignia de mérito"><Pill tono="neutro">Destacado · publicidad</Pill></span>}
      </div>
      <Insignias p={p} />
      <div className="tarjeta__rubros">{p.rubros.map((r) => <Chip key={r}>{rubro(r).nombre}</Chip>)}</div>
      <div className="tarjeta__pie">
        <span className="tenue">{p.ciudad} · {region(p.region).nombre}</span>
        <Reputacion p={p} />
      </div>
      {onSeleccionar && (
        <label className="tarjeta__sel">
          <input type="checkbox" checked={!!seleccionado} onChange={(e) => onSeleccionar(e.target.checked)} />
          <span>Seleccionar para comparar o invitar</span>
        </label>
      )}
    </article>
  );
}

export function TarjetaComprador({ c, oculto }: { c: import('@/domain/types').Comprador; oculto?: boolean }) {
  return (
    <article className="tarjeta">
      <div className="tarjeta__cab">
        <Avatar p={c} oculto={oculto} />
        <div className="tarjeta__id">
          <h3><Link to={`/red/${c.id}`}>{oculto ? 'Nombre visible al aceptar' : `${c.nombre} ${c.apellido}`}</Link></h3>
          <p>{c.cargo} · {c.empresa}</p>
        </div>
      </div>
      <div className="tarjeta__rubros">{c.rubros.map((r) => <Chip key={r}>{rubro(r).nombre}</Chip>)}</div>
      <div className="tarjeta__pie">
        <span className="tenue">{c.ciudad}</span>
        {c.ventanaHasta ? <Pill tono="senal">Compra hasta {c.ventanaHasta.slice(8, 10)}/{c.ventanaHasta.slice(5, 7)}</Pill> : <span className="tenue">Sin ventana abierta</span>}
      </div>
    </article>
  );
}
