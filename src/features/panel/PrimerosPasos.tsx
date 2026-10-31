import { useState } from 'react';
import { Link } from 'react-router-dom';

export interface Paso { hecho: boolean; texto: string; a: string; accion: string }

const clave = (id: string) => `proveo:primeros-pasos-oculto:${id}`;
const leerOculto = (id: string) => { try { return localStorage.getItem(clave(id)) === '1'; } catch { return false; } };

/** Tarjeta de primeros pasos para cuentas nuevas. Desaparece sola cuando están todos hechos, o si la ocultan. */
export function PrimerosPasos({ usuarioId, pasos }: { usuarioId: string; pasos: Paso[] }) {
  const [oculto, setOculto] = useState(() => leerOculto(usuarioId));
  const hechos = pasos.filter((p) => p.hecho).length;
  if (oculto || hechos === pasos.length) return null;
  const ocultar = () => { try { localStorage.setItem(clave(usuarioId), '1'); } catch { /* sin almacenamiento: se oculta hasta recargar */ } setOculto(true); };
  return (
    <section className="seccion primeros-pasos" aria-labelledby="pp-tit">
      <header className="primeros-pasos__cab">
        <h2 id="pp-tit">Primeros pasos · {hechos} de {pasos.length}</h2>
        <button type="button" className="enlace" onClick={ocultar}>Ocultar</button>
      </header>
      <ol className="primeros-pasos__lista">
        {pasos.map((p) => (
          <li key={p.texto} className={p.hecho ? 'is-hecho' : ''}>
            <span className="primeros-pasos__marca" aria-hidden="true">{p.hecho ? '✓' : ''}</span>
            <span className="primeros-pasos__txt">{p.texto}{p.hecho && <span className="sr-solo"> (hecho)</span>}</span>
            {!p.hecho && <Link to={p.a} className="btn btn--sec btn--chico">{p.accion}</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}
