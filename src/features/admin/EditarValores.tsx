import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery, useRepo } from '@/data/DataProvider';
import { region as regionDe, rubro } from '@/domain/catalogos';
import { validarValor } from '@/domain/resenas';
import type { ValorReferencia } from '@/domain/types';
import { Vacio } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';

type Borrador = { min: string; mediana: string; max: string; fecha: string };
const aBorrador = (v: ValorReferencia): Borrador => ({ min: String(v.min), mediana: String(v.mediana), max: String(v.max), fecha: v.fecha ?? '' });

function Fila({ v }: { v: ValorReferencia }) {
  const repo = useRepo();
  const avisar = useToast();
  const [b, setB] = useState(aBorrador(v));
  const [error, setError] = useState('');
  useEffect(() => setB(aBorrador(v)), [v]);
  const cambiado = JSON.stringify(b) !== JSON.stringify(aBorrador(v));

  const guardar = async () => {
    setError('');
    const nuevo: ValorReferencia = { ...v, min: Number(b.min), mediana: Number(b.mediana), max: Number(b.max), fecha: b.fecha || undefined };
    try {
      validarValor(nuevo);
      if (nuevo.fecha && !/^\d{4}-\d{2}$/.test(nuevo.fecha)) throw new Error('La fecha va como año-mes, por ejemplo 2026-10.');
      await repo.guardarValor(nuevo);
      avisar(`Guardado: ${v.concepto}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };

  const num = (k: keyof Borrador, etiqueta: string) => (
    <label className="campo campo--chico">
      <span>{etiqueta}</span>
      <input inputMode="decimal" value={b[k]} onChange={(e) => setB({ ...b, [k]: e.target.value })} />
    </label>
  );

  return (
    <tr>
      <td>
        <strong>{v.concepto}</strong>
        <span className="tenue bloque-linea">{rubro(v.rubro).nombre} · por {v.unidad} · {v.region === 'nacional' ? 'Nacional' : regionDe(v.region).nombre}</span>
        {error && <span className="error bloque-linea" role="alert">{error}</span>}
      </td>
      <td>{num('min', 'Mínimo')}</td>
      <td>{num('mediana', 'Mediana')}</td>
      <td>{num('max', 'Máximo')}</td>
      <td>{num('fecha', 'Año-mes')}</td>
      <td><button className="btn btn--sec btn--chico" disabled={!cambiado} onClick={guardar}>Guardar</button></td>
    </tr>
  );
}

/** Panel para que el equipo cargue los valores de referencia sin tocar el código. */
export function EditarValores() {
  const { usuarioId } = useSesion();
  const { data, cargando } = useQuery(async (r) => ({ admin: await r.esAdmin(usuarioId), ...(await r.valoresReferencia()) }), [usuarioId]);
  if (cargando || !data) return <div className="envoltura pagina" />;
  if (!data.admin) {
    return (
      <div className="envoltura pagina">
        <Vacio titulo="Solo para el equipo de APPRO" accion={{ a: '/valores', texto: 'Ver los valores' }}>
          Para editar valores, tu cuenta tiene que figurar en la colección admins de Firestore.
        </Vacio>
      </div>
    );
  }
  return (
    <div className="envoltura pagina">
      <Link to="/valores" className="enlace">← Valores de referencia</Link>
      <header className="pagina__cab">
        <p className="eyebrow">Administración</p>
        <h1>Editar valores de referencia</h1>
        <p className="tenue">En $0 el valor se muestra como "a definir". Al guardar, el cambio se ve enseguida para todos.</p>
      </header>
      <div className="tabla-envoltura">
        <table className="tabla tabla--admin">
          <thead><tr><th>Concepto</th><th>Mínimo</th><th>Mediana</th><th>Máximo</th><th>Relevado</th><th /></tr></thead>
          <tbody>{data.valores.map((v) => <Fila key={v.id} v={v} />)}</tbody>
        </table>
      </div>
    </div>
  );
}
