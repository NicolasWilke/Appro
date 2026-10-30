import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery, useRepo } from '@/data/DataProvider';
import { atrasado, conPunto, periodoValido, sumarMeses, ultimo, validarPunto } from '@/domain/indicadores';
import type { EscalaConvenio, Indicador } from '@/domain/types';
import { fmt } from '@/i18n';
import { Pill, Seccion, Vacio } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';
import { mesCorto } from '../referencias/LineaSerie';

/** Carga del equipo: un dato nuevo por indicador y las escalas vigentes de cada convenio. */
export function EditarIndices() {
  const { usuarioId } = useSesion();
  const { data, cargando } = useQuery(async (r) => ({ admin: await r.esAdmin(usuarioId), ...(await r.indicadores()) }), [usuarioId]);
  if (cargando || !data) return <div className="envoltura pagina" />;
  if (!data.admin) {
    return <div className="envoltura pagina"><Vacio titulo="Solo para el equipo de Proveo" accion={{ a: '/referencias', texto: 'Ver el centro de referencias' }}>Para cargar índices, tu cuenta tiene que figurar en la colección admins de Firestore.</Vacio></div>;
  }
  return (
    <div className="envoltura pagina">
      <Link to="/referencias" className="enlace">← Centro de referencias</Link>
      <header className="pagina__cab">
        <p className="eyebrow">Administración</p>
        <h1>Cargar índices y escalas</h1>
        <p className="tenue">Cada dato se valida antes de guardarse: período año-mes, sin duplicados, y aviso si la variación mensual salta más de 3 puntos. Un aumento pactado se reemplaza cuando sale el dato oficial.</p>
      </header>
      <Seccion titulo="Índices y salarios">
        <div className="tabla-envoltura">
          <table className="tabla tabla--admin">
            <thead><tr><th>Indicador</th><th>Últimos datos</th><th>Dato nuevo</th></tr></thead>
            <tbody>{data.indicadores.map((i) => <FilaIndicador key={i.id} i={i} />)}</tbody>
          </table>
        </div>
      </Seccion>
      <Seccion titulo="Escalas vigentes">
        <div className="grilla-2">{data.escalas.map((e) => <FormEscala key={e.id} e={e} />)}</div>
      </Seccion>
    </div>
  );
}

function FilaIndicador({ i }: { i: Indicador }) {
  const repo = useRepo();
  const avisar = useToast();
  const u = ultimo(i);
  const [periodo, setPeriodo] = useState(u ? sumarMeses(u.periodo, 1) : '');
  const [valor, setValor] = useState('');
  const [pactado, setPactado] = useState(false);
  const [proxima, setProxima] = useState(i.proximaPublicacion ?? '');
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const guardar = async (confirmado: boolean) => {
    setError('');
    const punto = { periodo, valor: Number(valor), ...(pactado ? { pactado: true } : {}) };
    try {
      const a = validarPunto(i, punto);
      if (a && !confirmado) { setAviso(a); return; }
      await repo.guardarIndicador({ ...i, serie: conPunto(i.serie, punto), proximaPublicacion: proxima || undefined });
      setAviso('');
      setValor('');
      avisar(`Guardado: ${i.nombre}, ${mesCorto(periodo)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };
  return (
    <tr>
      <td>
        <strong>{i.nombre}</strong>{atrasado(i) && <> <Pill tono="mal">Más de 45 días sin cargar</Pill></>}
        <span className="tenue bloque-linea">{i.organismo} · cargado {fmt.fecha(i.actualizado)}</span>
      </td>
      <td className="mono">{i.serie.slice(-3).map((p) => <span key={p.periodo} className="bloque-linea">{mesCorto(p.periodo)}: {fmt.numero(p.valor)}{p.pactado ? ' (pactado)' : ''}</span>)}</td>
      <td>
        <div className="admin-dato">
          <label className="campo campo--chico"><span>Año-mes</span><input value={periodo} onChange={(e) => { setPeriodo(e.target.value); setAviso(''); }} placeholder="2026-10" /></label>
          <label className="campo campo--chico"><span>Valor</span><input inputMode="decimal" value={valor} onChange={(e) => { setValor(e.target.value); setAviso(''); }} /></label>
          <label className="campo campo--chico"><span>Próxima publicación</span><input type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} /></label>
          <label className="tarjeta__sel"><input type="checkbox" checked={pactado} onChange={(e) => setPactado(e.target.checked)} /><span>Pactado</span></label>
          <button className="btn btn--sec btn--chico" disabled={!periodo || !valor} onClick={() => guardar(false)}>Guardar</button>
        </div>
        {aviso && <p className="nota">{aviso} <button className="enlace" onClick={() => guardar(true)}>Guardar igual</button></p>}
        {error && <p className="error" role="alert">{error}</p>}
      </td>
    </tr>
  );
}

function FormEscala({ e }: { e: EscalaConvenio }) {
  const repo = useRepo();
  const avisar = useToast();
  const [b, setB] = useState(e);
  const [error, setError] = useState('');
  const cat = (n: number, k: 'basico' | 'conformado' | 'hora', v: string) =>
    setB({ ...b, categorias: b.categorias.map((c, j) => (j === n ? { ...c, [k]: v === '' ? null : Number(v) } : c)) });
  const guardar = async () => {
    setError('');
    if (!periodoValido(b.periodo)) { setError('El período va como año-mes, por ejemplo 2026-10.'); return; }
    await repo.guardarEscala(b);
    avisar(`Guardada la escala ${b.convenio}.`);
  };
  const porHora = e.categorias.some((c) => c.hora);
  return (
    <article className="tarjeta">
      <h3>{e.convenio}</h3>
      <div className="form__fila">
        <label className="campo campo--chico"><span>Escala de (año-mes)</span><input value={b.periodo} onChange={(x) => setB({ ...b, periodo: x.target.value })} /></label>
        <label className="campo campo--chico"><span>Vigente hasta</span><input type="date" value={b.vigenciaHasta ?? ''} onChange={(x) => setB({ ...b, vigenciaHasta: x.target.value || undefined })} /></label>
      </div>
      {b.categorias.map((c, n) => (
        <div key={c.nombre} className="admin-dato">
          <span className="admin-dato__nombre">{c.nombre}</span>
          {porHora
            ? <label className="campo campo--chico"><span>Por hora</span><input inputMode="decimal" value={c.hora ?? ''} onChange={(x) => cat(n, 'hora', x.target.value)} /></label>
            : <>
              <label className="campo campo--chico"><span>Básico</span><input inputMode="decimal" value={c.basico ?? ''} onChange={(x) => cat(n, 'basico', x.target.value)} /></label>
              <label className="campo campo--chico"><span>Conformado</span><input inputMode="decimal" value={c.conformado ?? ''} onChange={(x) => cat(n, 'conformado', x.target.value)} /></label>
            </>}
        </div>
      ))}
      <label className="campo"><span>Nota</span><textarea rows={2} value={b.nota ?? ''} onChange={(x) => setB({ ...b, nota: x.target.value || undefined })} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form__acciones"><button className="btn btn--sec btn--chico" disabled={JSON.stringify(b) === JSON.stringify(e)} onClick={guardar}>Guardar escala</button></div>
    </article>
  );
}
