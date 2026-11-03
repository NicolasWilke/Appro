import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useQuery, useRepo } from '@/data/DataProvider';
import { PLANES } from '@/domain/planes';
import type { CuentaAdmin, PlanId } from '@/domain/types';
import { Pill, Seccion, Vacio } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';

const fechaCorta = (iso: string) => iso.split('-').reverse().join('/');
const errorDe = (e: unknown) => (e instanceof Error ? e.message : 'No se pudo guardar.');

/**
 * Panel del equipo: pedidos de plan, plan vigente y verificación de cada cuenta. Reemplaza a
 * `npm run admin -- plan|verificar|pendientes`. El cobro sigue por fuera: se activa el plan después de cobrar.
 */
export function Cuentas() {
  const { cuenta } = useAuth();
  const [texto, setTexto] = useState('');
  const [rol, setRol] = useState<'proveedor' | 'comprador' | ''>('proveedor');
  const { data, cargando, error } = useQuery(async (r) => {
    const admin = await r.esAdmin(cuenta!.uid);
    return { admin, cuentas: admin ? await r.cuentasAdmin() : [] };
  }, [cuenta?.uid]);

  if (error) {
    return (
      <div className="envoltura pagina">
        <Vacio titulo="No se pudieron leer las cuentas" accion={{ a: '/panel', texto: 'Volver al panel' }}>
          Tu usuario figura en admins, pero Firestore rechazó la lectura. Lo más común: esta cuenta no tiene perfil en la red
          (users/{cuenta?.uid}) o las reglas publicadas son viejas. Detalle: {error.message}
        </Vacio>
      </div>
    );
  }
  if (cargando || !data) return <div className="envoltura pagina" />;
  if (!data.admin) {
    return (
      <div className="envoltura pagina">
        <Vacio titulo="Solo para el equipo de Proveo" accion={{ a: '/panel', texto: 'Volver al panel' }}>
          Para administrar cuentas, tu usuario tiene que figurar en la colección admins de Firestore.
        </Vacio>
      </div>
    );
  }

  const pendientes = data.cuentas.filter((c) => c.pedido);
  const q = texto.trim().toLowerCase();
  const lista = data.cuentas.filter((c) => (!rol || c.rol === rol)
    && (!q || `${c.empresa} ${c.contactoNombre} ${c.email} ${c.cuit}`.toLowerCase().includes(q)));

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab">
        <p className="eyebrow">Administración</p>
        <h1>Cuentas y planes</h1>
        <p className="tenue">Activá el plan después de confirmar el cobro. El cambio se aplica enseguida, sin que el usuario tenga que hacer nada.</p>
      </header>
      <nav className="acciones-sol">
        <Link className="btn btn--ter btn--chico" to="/admin/valores">Valores de referencia</Link>
        <Link className="btn btn--ter btn--chico" to="/admin/indices">Índices y convenios</Link>
      </nav>

      <Seccion titulo={`Pedidos de plan${pendientes.length ? ` · ${pendientes.length}` : ''}`}>
        {pendientes.length === 0
          ? <p className="tenue">No hay pedidos sin atender.</p>
          : <ul className="admin-cuentas">{pendientes.map((c) => <Pendiente key={c.id} c={c} />)}</ul>}
      </Seccion>

      <Seccion titulo="Todas las cuentas">
        <div className="form__fila">
          <label className="campo campo--inline" htmlFor="ad-buscar"><span>Buscar</span>
            <input id="ad-buscar" placeholder="Empresa, contacto, mail o CUIT" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
          <label className="campo campo--inline" htmlFor="ad-rol"><span>Tipo</span>
            <select id="ad-rol" value={rol} onChange={(e) => setRol(e.target.value as typeof rol)}>
              <option value="proveedor">Proveedores</option>
              <option value="comprador">Compradores</option>
              <option value="">Todas</option>
            </select>
          </label>
        </div>
        {lista.length === 0
          ? <p className="tenue">No hay cuentas con ese filtro.</p>
          : <ul className="admin-cuentas">{lista.map((c) => <Fila key={c.id} c={c} />)}</ul>}
      </Seccion>
    </div>
  );
}

function Datos({ c }: { c: CuentaAdmin }) {
  return (
    <div className="admin-cuentas__datos">
      <strong>{c.empresa}</strong>
      <span className="tenue">{c.contactoNombre}{c.email && <> · <a href={`mailto:${c.email}`}>{c.email}</a></>}</span>
      <span className="tenue mono">{c.cuit}</span>
    </div>
  );
}

function Pendiente({ c }: { c: CuentaAdmin }) {
  const repo = useRepo();
  const avisar = useToast();
  const [ocupado, setOcupado] = useState(false);
  const pedido = c.pedido!;
  const hacer = async (fn: () => Promise<void>, ok: string) => {
    setOcupado(true);
    try { await fn(); avisar(ok); } catch (e) { avisar(errorDe(e), 'error'); setOcupado(false); }
  };
  return (
    <li className="admin-cuentas__fila admin-cuentas__fila--pedido">
      <Datos c={c} />
      <p>Pidió <strong>{PLANES[pedido.plan].nombre}</strong> el {fechaCorta(pedido.fecha)} · hoy tiene {PLANES[c.plan].nombre}</p>
      <div className="acciones-sol">
        <button className="btn btn--pri btn--chico" disabled={ocupado} onClick={() => hacer(() => repo.activarPlan(c.id, pedido.plan), `Plan ${PLANES[pedido.plan].nombre} activo para ${c.empresa}.`)}>
          Activar {PLANES[pedido.plan].nombre}
        </button>
        <button className="btn btn--ter btn--chico" disabled={ocupado} onClick={() => hacer(() => repo.descartarPedidoPlan(c.id), 'Pedido descartado.')}>Descartar</button>
      </div>
    </li>
  );
}

function Fila({ c }: { c: CuentaAdmin }) {
  const repo = useRepo();
  const avisar = useToast();
  const [ocupado, setOcupado] = useState(false);
  const hacer = async (fn: () => Promise<void>, ok: string) => {
    setOcupado(true);
    try { await fn(); avisar(ok); } catch (e) { avisar(errorDe(e), 'error'); } finally { setOcupado(false); }
  };
  return (
    <li className="admin-cuentas__fila">
      <Datos c={c} />
      <div className="acciones-sol">
        {c.verificado ? <Pill tono="ok">Verificada</Pill> : <Pill tono="senal">Sin verificar</Pill>}
        <button className="btn btn--ter btn--chico" disabled={ocupado} onClick={() => hacer(() => repo.verificarCuenta(c.id, !c.verificado), c.verificado ? `${c.empresa} quedó sin verificar.` : `${c.empresa} verificada.`)}>
          {c.verificado ? 'Quitar verificación' : 'Verificar'}
        </button>
        {c.rol === 'proveedor' && (
          <label className="campo campo--inline" htmlFor={`plan-${c.id}`}><span>Plan</span>
            <select id={`plan-${c.id}`} value={c.plan} disabled={ocupado}
              onChange={(e) => { const plan = e.target.value as PlanId; hacer(() => repo.activarPlan(c.id, plan), `${c.empresa} pasó al plan ${PLANES[plan].nombre}.`); }}>
              {(Object.keys(PLANES) as PlanId[]).map((id) => <option key={id} value={id}>{PLANES[id].nombre}</option>)}
            </select>
          </label>
        )}
      </div>
    </li>
  );
}
