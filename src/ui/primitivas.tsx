import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import type { Persona } from '@/domain/types';

export function Sello({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`sello ${className}`} aria-hidden="true">{children}</span>;
}

export function Avatar({ p, oculto = false, grande = false }: { p: Pick<Persona, 'nombre' | 'apellido' | 'rol' | 'logo'>; oculto?: boolean; grande?: boolean }) {
  if (p.logo && !oculto) return <img className={`avatar avatar--img ${grande ? 'avatar--grande' : ''}`} src={p.logo} alt="" />;
  const ini = oculto ? '··' : `${p.nombre[0] ?? ''}${p.apellido[0] ?? ''}`;
  return <span className={`avatar avatar--${p.rol} ${grande ? 'avatar--grande' : ''}`} aria-hidden="true">{ini}</span>;
}

export function Chip({ children, activo, onClick }: { children: ReactNode; activo?: boolean; onClick?: () => void }) {
  if (!onClick) return <span className="chip">{children}</span>;
  return <button type="button" className={`chip chip--boton ${activo ? 'chip--activo' : ''}`} aria-pressed={activo} onClick={onClick}>{children}</button>;
}

export type TonoPill = 'ok' | 'senal' | 'neutro' | 'mal' | 'sello';
export function Pill({ tono = 'neutro', children }: { tono?: TonoPill; children: ReactNode }) {
  return <span className={`pill pill--${tono}`}>{children}</span>;
}

export function Medidor({ usado, total, etiqueta }: { usado: number; total: number | null; etiqueta: string }) {
  const pct = total === null ? 100 : Math.min(100, (usado / total) * 100);
  const critico = total !== null && usado >= total;
  return (
    <div className="medidor">
      <div className="medidor__fila">
        <span>{etiqueta}</span>
        <span className="mono">{total === null ? `${usado} · sin límite` : `${usado} de ${total}`}</span>
      </div>
      <div className={`medidor__barra ${total === null ? 'medidor__barra--libre' : ''}`}>
        <span style={{ width: `${pct}%` }} className={critico ? 'is-critico' : ''} />
      </div>
    </div>
  );
}

export function Copiable({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [ok, setOk] = useState(false);
  const copiar = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true);
      setTimeout(() => setOk(false), 1600);
    } catch {
      const sel = window.getSelection();
      const nodo = e.currentTarget.previousElementSibling;
      if (sel && nodo) { const r = document.createRange(); r.selectNodeContents(nodo); sel.removeAllRanges(); sel.addRange(r); }
    }
  };
  return (
    <div className="copiable">
      <span className="copiable__etq">{etiqueta}</span>
      <span className="copiable__val mono">{texto}</span>
      <button className="btn btn--mini" type="button" onClick={copiar}>{ok ? t.acciones.copiado : t.acciones.copiar}</button>
    </div>
  );
}

export function Vacio({ titulo, children, accion }: { titulo: string; children?: ReactNode; accion?: { a: string; texto: string } }) {
  return (
    <div className="vacio">
      <p className="vacio__tit">{titulo}</p>
      {children && <p>{children}</p>}
      {accion && <Link className="btn btn--sec" to={accion.a}>{accion.texto}</Link>}
    </div>
  );
}

export function Estrellas({ valor }: { valor: number }) {
  return <span className="estrellas" aria-label={`${valor} de 5`}>{'★★★★★'.slice(0, Math.round(valor))}<span>{'★★★★★'.slice(Math.round(valor))}</span></span>;
}

export function Seccion({ titulo, extra, children, id }: { titulo: string; extra?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="seccion" id={id}>
      <header className="seccion__cab"><h2>{titulo}</h2>{extra}</header>
      {children}
    </section>
  );
}
