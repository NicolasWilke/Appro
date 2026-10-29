import { useState } from 'react';
import { useRepo } from '@/data/DataProvider';
import { RESENA_TEXTO, type DatosResena } from '@/domain/resenas';
import type { Resena } from '@/domain/types';
import { fmt } from '@/i18n';
import { Estrellas, Seccion } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';

const CRITERIOS = [['entrega', 'Entrega'], ['calidad', 'Calidad'], ['facturacion', 'Facturación']] as const;

function Puntaje({ etiqueta, valor, onCambio }: { etiqueta: string; valor: number; onCambio: (n: number) => void }) {
  return (
    <div className="puntaje" role="radiogroup" aria-label={etiqueta}>
      <span>{etiqueta}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n} de 5`}
          className={`puntaje__estrella ${n <= valor ? 'is-on' : ''}`} onClick={() => onCambio(n)}>★</button>
      ))}
    </div>
  );
}

/** El comprador califica a cada proveedor que ganó su pedido. Una reseña por proveedor, sin edición posterior. */
export function Resenar({ pedidoId, proveedorId, empresa, resena }: { pedidoId: string; proveedorId: string; empresa: string; resena: Resena | null }) {
  const repo = useRepo();
  const avisar = useToast();
  const [d, setD] = useState<DatosResena>({ entrega: 0, calidad: 0, facturacion: 0, texto: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (resena) {
    return (
      <Seccion titulo={`Tu reseña de ${empresa}`}>
        <figure className="resena">
          <Estrellas valor={(resena.entrega + resena.calidad + resena.facturacion) / 3} />
          <blockquote>{resena.texto}</blockquote>
          <figcaption className="tenue">Entrega {resena.entrega} · Calidad {resena.calidad} · Facturación {resena.facturacion} · {fmt.fecha(resena.fecha)}</figcaption>
        </figure>
      </Seccion>
    );
  }

  const enviar = async () => {
    setError('');
    setEnviando(true);
    try {
      await repo.resenar(pedidoId, proveedorId, d);
      avisar(`Gracias. Tu reseña ya aparece en el perfil de ${empresa.replace(/\.$/, '')}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la reseña.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Seccion titulo={`Calificá a ${empresa}`}>
      <p className="tenue">Se publica en su perfil con tu nombre y empresa. Es una sola por pedido y proveedor, y no se puede editar.</p>
      <div className="puntajes">
        {CRITERIOS.map(([k, txt]) => <Puntaje key={k} etiqueta={txt} valor={d[k]} onCambio={(n) => setD({ ...d, [k]: n })} />)}
      </div>
      <label className="campo" htmlFor="resena-texto">
        <span>Comentario ({d.texto.trim().length}/{RESENA_TEXTO.max})</span>
        <textarea id="resena-texto" rows={3} maxLength={RESENA_TEXTO.max} value={d.texto} onChange={(e) => setD({ ...d, texto: e.target.value })}
          placeholder="Cómo fue la entrega, la calidad y la facturación." />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn--pri" disabled={enviando} onClick={enviar}>Publicar reseña</button>
    </Seccion>
  );
}
