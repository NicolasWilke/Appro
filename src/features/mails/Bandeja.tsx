import { useState } from 'react';
import { useQuery, useRepo } from '@/data/DataProvider';
import { HORA_RESUMEN } from '@/domain/notificaciones';
import { Pill, Vacio } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';

/** Solo demo: muestra lo que el servidor mandaría por mail. En producción esto lo registra el proveedor de mail. */
export function Bandeja() {
  const repo = useRepo();
  const avisar = useToast();
  const { data } = useQuery((r) => r.bandejaSalida(), []);
  const [sel, setSel] = useState<string | null>(null);
  if (!data) return <div className="envoltura pagina" />;
  const actual = data.find((m) => m.id === sel) ?? data[0];
  const enCola = data.filter((m) => m.estado === 'en-cola').length;

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab pagina__cab--fila">
        <div>
          <p className="eyebrow">Demo · mails a proveedores</p>
          <h1>Lo que reciben los proveedores cuando se publica un pedido</h1>
          <p className="tenue">En la demo no sale ningún mail. Cada pedido nuevo genera un aviso para los proveedores verificados de ese rubro, según cómo eligió recibirlos.</p>
        </div>
        {enCola > 0 && (
          <button className="btn btn--sec" onClick={async () => { const n = await repo.enviarResumenesAhora(); avisar(`Se enviaron ${n} ${n === 1 ? 'resumen' : 'resúmenes'} diarios.`); }}>
            Enviar los resúmenes de las {HORA_RESUMEN} ahora
          </button>
        )}
      </header>
      {data.length === 0 && <Vacio titulo="Todavía no hay mails" accion={{ a: '/cotizaciones', texto: 'Publicar un pedido como comprador' }}>Publicá un pedido desde el rol comprador y volvé acá.</Vacio>}
      {actual && (
        <div className="bandeja">
          <ul className="bandeja__lista" aria-label="Mails">
            {data.map((m) => (
              <li key={m.id}>
                <button type="button" className={m.id === actual.id ? 'is-sel' : ''} onClick={() => setSel(m.id)}>
                  <span className="bandeja__para">{m.para.nombre}</span>
                  <span className="bandeja__asunto">{m.asunto}</span>
                  <span className="bandeja__meta">
                    <Pill tono={m.estado === 'enviado' ? 'ok' : 'senal'}>{m.estado === 'enviado' ? 'Enviado' : `Sale a las ${HORA_RESUMEN}`}</Pill>
                    <span className="tenue">{m.tipo === 'resumen' ? 'Resumen diario' : 'Mail por pedido'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <article className="bandeja__vista">
            <dl className="bandeja__cab">
              <div><dt>Para</dt><dd>{actual.para.nombre} <span className="mono tenue">&lt;{actual.para.email}&gt;</span></dd></div>
              <div><dt>Asunto</dt><dd><strong>{actual.asunto}</strong></dd></div>
            </dl>
            {/* HTML generado por el propio sistema con todo el texto del usuario escapado (domain/notificaciones.ts) */}
            <div className="bandeja__html" dangerouslySetInnerHTML={{ __html: actual.html }} />
          </article>
        </div>
      )}
    </div>
  );
}
