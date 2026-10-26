import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ titulo, onCerrar, children, ancho = 560 }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', tecla);
    ref.current?.querySelector<HTMLElement>('textarea, input, select, button')?.focus();
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);
  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal__caja" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: ancho }} ref={ref}>
        <header className="modal__cab">
          <h2>{titulo}</h2>
          <button className="btn btn--icono" onClick={onCerrar} aria-label="Cerrar">×</button>
        </header>
        <div className="modal__cuerpo">{children}</div>
      </div>
    </div>
  );
}
