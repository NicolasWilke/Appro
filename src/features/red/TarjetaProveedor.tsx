import { Link } from 'react-router-dom';
import { region, rubro } from '@/domain/catalogos';
import { PLANES } from '@/domain/planes';
import type { Proveedor } from '@/domain/types';
import { Avatar, Chip, Estrellas, Pill } from '@/ui/primitivas';

export const promedio = (p: Proveedor) =>
  p.resenas.length ? p.resenas.reduce((a, r) => a + (r.entrega + r.calidad + r.facturacion) / 3, 0) / p.resenas.length : 0;

export function TarjetaProveedor({ p }: { p: Proveedor }) {
  const prom = promedio(p);
  return (
    <article className="tarjeta">
      <div className="tarjeta__cab">
        <Avatar p={p} />
        <div className="tarjeta__id">
          <h3><Link to={`/red/${p.id}`}>{p.empresa}</Link></h3>
          <p>{p.nombre} {p.apellido} · {p.cargo}</p>
        </div>
        {PLANES[p.plan].destacado && <Pill tono="sello">Destacado</Pill>}
      </div>
      <div className="tarjeta__rubros">{p.rubros.map((r) => <Chip key={r}>{rubro(r).nombre}</Chip>)}</div>
      <div className="tarjeta__pie">
        <span className="tenue">{p.ciudad} · {region(p.region).nombre}</span>
        {prom > 0 ? <span><Estrellas valor={prom} /> <span className="tenue">({p.resenas.length})</span></span> : <span className="tenue">Sin reseñas todavía</span>}
      </div>
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
