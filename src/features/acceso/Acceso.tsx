import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { CUENTAS_EJEMPLO, PASSWORD_DEMO } from '@/auth/DemoAuth';
import { FalloAuth, MENSAJES_FALLO } from '@/auth/tipos';
import { MARCA } from '@/config/marca';
import { REGION } from '@/config/region';
import { mailCorporativo, PASSWORD_MIN, validarAlta, type CampoAlta, type DatosAlta } from '@/domain/acceso';
import { RUBROS } from '@/domain/catalogos';
import { formatearCuit } from '@/domain/cuit';
import type { Rol, RubroId } from '@/domain/types';
import { esMailValido } from '@/domain/validaciones';
import { t } from '@/i18n';

type Modo = 'ingreso' | 'registro' | 'recuperar';

const mensaje = (e: unknown) => (e instanceof FalloAuth ? MENSAJES_FALLO[e.codigo] : MENSAJES_FALLO.desconocido);

export function Acceso() {
  const [params, setParams] = useSearchParams();
  const modo: Modo = params.get('modo') === 'registro' ? 'registro' : params.get('modo') === 'recuperar' ? 'recuperar' : 'ingreso';
  const { cuenta } = useAuth();
  const ir = useNavigate();
  const volver = params.get('volver') ?? '/panel';
  const cambiar = (m: Modo) => {
    const p = new URLSearchParams(params);
    p.set('modo', m);
    setParams(p, { replace: true });
  };

  // Si llegó acá redirigido (por ejemplo, justo después de crear la cuenta), lo devolvemos adonde iba.
  if (cuenta && params.has('volver')) return <Navigate to={volver} replace />;
  if (cuenta) {
    return (
      <div className="envoltura acceso">
        <div className="acceso__tarjeta">
          <h1 className="acceso__titulo">Ya iniciaste sesión</h1>
          <p className="tenue">Estás como {cuenta.perfil.contactoNombre}, de {cuenta.perfil.empresa}.</p>
          <div className="form__acciones">
            <Link className="btn btn--sec" to="/perfil">Mi perfil</Link>
            <button className="btn btn--pri" onClick={() => ir(volver)}>Seguir</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="envoltura acceso">
      <div className="acceso__tarjeta">
        {modo !== 'recuperar' && (
          <div className="segmento segmento--ancho acceso__pestanas" role="tablist" aria-label="Acceso">
            <button type="button" role="tab" aria-selected={modo === 'ingreso'} className={modo === 'ingreso' ? 'is-activo' : ''} onClick={() => cambiar('ingreso')}>Iniciar sesión</button>
            <button type="button" role="tab" aria-selected={modo === 'registro'} className={modo === 'registro' ? 'is-activo' : ''} onClick={() => cambiar('registro')}>Registrarme</button>
          </div>
        )}
        {modo === 'ingreso' && <Ingreso alEntrar={() => ir(volver, { replace: true })} alOlvidar={() => cambiar('recuperar')} />}
        {modo === 'registro' && <Registro rolInicial={params.get('rol') === 'proveedor' ? 'proveedor' : 'comprador'} alCrear={() => ir('/perfil?nuevo=1', { replace: true })} />}
        {modo === 'recuperar' && <Recuperar alVolver={() => cambiar('ingreso')} />}
      </div>
    </div>
  );
}

function Ingreso({ alEntrar, alOlvidar }: { alEntrar: () => void; alOlvidar: () => void }) {
  const { auth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (mail: string, clave: string) => {
    setError(null);
    setEnviando(true);
    try {
      await auth.ingresar(mail, clave);
      alEntrar();
    } catch (e) {
      setError(mensaje(e));
      setEnviando(false);
    }
  };

  return (
    <>
      <h1 className="acceso__titulo">Entrá a {MARCA.nombre}</h1>
      <form className="form" onSubmit={(e) => { e.preventDefault(); entrar(email, password); }}>
        <label className="campo" htmlFor="ing-email"><span>Email</span>
          <input id="ing-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="campo" htmlFor="ing-pass"><span>Contraseña</span>
          <span className="campo__clave">
            <input id="ing-pass" type={ver ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="enlace" onClick={() => setVer(!ver)} aria-pressed={ver}>{ver ? 'Ocultar' : 'Mostrar'}</button>
          </span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn--pri btn--grande" disabled={enviando}>{enviando ? 'Entrando…' : 'Iniciar sesión'}</button>
        <button type="button" className="enlace acceso__olvide" onClick={alOlvidar}>¿Olvidaste tu contraseña?</button>
      </form>
      {auth.modo === 'demo' && (
        <div className="acceso__ejemplos">
          <p className="eyebrow">Demo · cuentas de ejemplo</p>
          <div className="acceso__ejemplos-lista">
            {CUENTAS_EJEMPLO.map((c) => (
              <button key={c.email} type="button" className="btn btn--sec" disabled={enviando} onClick={() => entrar(c.email, PASSWORD_DEMO)}>
                Entrar como {c.nombre} <span className="tenue">· {t.rol[c.rol].toLowerCase()}</span>
              </button>
            ))}
          </div>
          <p className="tenue">Contraseña de ambas: <span className="mono">{PASSWORD_DEMO}</span>. También podés registrarte: la cuenta queda guardada solo en este navegador.</p>
        </div>
      )}
    </>
  );
}

const vacio = (rol: Rol): DatosAlta => ({ rol, empresa: '', contactoNombre: '', email: '', telefono: '', categoria: '', sector: '', ubicacion: '', cuit: '', password: '' });

function Registro({ rolInicial, alCrear }: { rolInicial: Rol; alCrear: () => void }) {
  const { auth } = useAuth();
  const [d, setD] = useState<DatosAlta>(() => vacio(rolInicial));
  const [tocado, setTocado] = useState(false);
  const [consiento, setConsiento] = useState(false);
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = <K extends keyof DatosAlta>(k: K, v: DatosAlta[K]) => setD((x) => ({ ...x, [k]: v }));
  const errores = validarAlta(d);
  const err = (k: CampoAlta) => (tocado && errores[k] ? <span className="error">{errores[k]}</span> : null);
  const esComprador = d.rol === 'comprador';

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    setError(null);
    if (Object.keys(errores).length || !consiento || !d.categoria) {
      if (!consiento && !Object.keys(errores).length) setError('Falta tu consentimiento para crear el perfil.');
      return;
    }
    setEnviando(true);
    try {
      await auth.registrar({ ...d, categoria: d.categoria as RubroId, cuit: formatearCuit(d.cuit), empresa: d.empresa.trim(), contactoNombre: d.contactoNombre.trim(), sector: d.sector.trim(), ubicacion: d.ubicacion.trim() });
      alCrear();
    } catch (e) {
      setError(mensaje(e));
      setEnviando(false);
    }
  };

  return (
    <>
      <h1 className="acceso__titulo">Sumate a {MARCA.nombre}</h1>
      <div className="segmento segmento--ancho" role="group" aria-label="Tipo de cuenta">
        {(['comprador', 'proveedor'] as const).map((r) => (
          <button key={r} type="button" aria-pressed={d.rol === r} className={d.rol === r ? 'is-activo' : ''} onClick={() => set('rol', r)}>
            {r === 'comprador' ? 'Soy una empresa' : 'Soy un proveedor'}
          </button>
        ))}
      </div>
      <p className="tenue acceso__bajada">
        {esComprador
          ? 'Registrá tu empresa para pedir cotizaciones a proveedores verificados de la red.'
          : 'Registrá tu empresa para recibir los pedidos de tu rubro y llegar a quien compra.'}
      </p>
      <form className="form acceso__form" onSubmit={crear} noValidate>
        <div className="form__fila">
          <label className="campo" htmlFor="r-empresa"><span>Nombre de la empresa</span>
            <input id="r-empresa" autoComplete="organization" placeholder="Ej: Servicios del Sur S.A." value={d.empresa} onChange={(e) => set('empresa', e.target.value)} />{err('empresa')}
          </label>
          <label className="campo" htmlFor="r-contacto"><span>Nombre de contacto</span>
            <input id="r-contacto" autoComplete="name" placeholder="Ej: Juan Pérez" value={d.contactoNombre} onChange={(e) => set('contactoNombre', e.target.value)} />{err('contactoNombre')}
          </label>
        </div>
        <div className="form__fila">
          <label className="campo" htmlFor="r-email"><span>Email de contacto</span>
            <input id="r-email" type="email" autoComplete="email" placeholder="nombre@empresa.com.ar" value={d.email} onChange={(e) => set('email', e.target.value)} />
            {err('email') ?? (esComprador && esMailValido(d.email) && !mailCorporativo(d.email, REGION) && <span className="tenue">Con el mail de la empresa tu perfil muestra “Mail corporativo verificado”.</span>)}
          </label>
          <label className="campo" htmlFor="r-tel"><span>Teléfono de contacto</span>
            <input id="r-tel" type="tel" autoComplete="tel" placeholder="Ej: +54 9 11 1234-5678" value={d.telefono} onChange={(e) => set('telefono', e.target.value)} />{err('telefono')}
          </label>
        </div>
        <div className="form__fila">
          <label className="campo" htmlFor="r-cat"><span>Categoría</span>
            <select id="r-cat" value={d.categoria} onChange={(e) => set('categoria', e.target.value as RubroId)}>
              <option value="" disabled>{esComprador ? 'Qué comprás principalmente' : 'Qué vendés principalmente'}</option>
              {RUBROS.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>{err('categoria')}
          </label>
          <label className="campo" htmlFor="r-sector"><span>Sector</span>
            <input id="r-sector" placeholder="Ej: Servicios industriales" value={d.sector} onChange={(e) => set('sector', e.target.value)} />
          </label>
        </div>
        <div className="form__fila">
          <label className="campo" htmlFor="r-ubic"><span>Ubicación</span>
            <input id="r-ubic" autoComplete="address-level2" placeholder="Ej: Neuquén, Argentina" value={d.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} />{err('ubicacion')}
          </label>
          <label className="campo" htmlFor="r-cuit"><span>{REGION.idFiscal.nombre} de la empresa</span>
            <input id="r-cuit" inputMode="numeric" className="mono" placeholder={REGION.idFiscal.ejemplo} value={d.cuit} onChange={(e) => set('cuit', formatearCuit(e.target.value))} />
            {err('cuit') ?? (tocado || d.cuit.length === 13 ? !errores.cuit && <span className="ok">Dígito verificador correcto.</span> : null)}
          </label>
        </div>
        <label className="campo" htmlFor="r-pass"><span>Contraseña</span>
          <span className="campo__clave">
            <input id="r-pass" type={ver ? 'text' : 'password'} autoComplete="new-password" value={d.password} onChange={(e) => set('password', e.target.value)} />
            <button type="button" className="enlace" onClick={() => setVer(!ver)} aria-pressed={ver}>{ver ? 'Ocultar' : 'Mostrar'}</button>
          </span>
          {err('password') ?? <span className="tenue">Mínimo {PASSWORD_MIN} caracteres.</span>}
        </label>
        <label className="opcion opcion--legal">
          <input type="checkbox" checked={consiento} onChange={(e) => setConsiento(e.target.checked)} />
          <span><strong>Doy mi consentimiento</strong>Acepto que {MARCA.nombre} trate mis datos para mostrar el perfil de mi empresa en la red, según la {REGION.leyDatos}. {esComprador ? 'Mi mail y teléfono los ve solo el proveedor cuya solicitud yo acepte.' : 'Los compradores registrados van a ver mi mail y teléfono; los otros proveedores, no.'} Puedo pedir acceso, rectificación o supresión en cualquier momento.</span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn--pri btn--grande" disabled={enviando}>{enviando ? 'Creando la cuenta…' : 'Crear mi cuenta'}</button>
      </form>
    </>
  );
}

function Recuperar({ alVolver }: { alVolver: () => void }) {
  const { auth } = useAuth();
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'editando' | 'enviando' | 'enviado'>('editando');
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esMailValido(email)) { setError('Revisá el mail.'); return; }
    setError(null);
    setEstado('enviando');
    try {
      await auth.restablecerPassword(email);
      setEstado('enviado');
    } catch (err) {
      setError(mensaje(err));
      setEstado('editando');
    }
  };

  return (
    <>
      <h1 className="acceso__titulo">Recuperá tu contraseña</h1>
      {estado === 'enviado' ? (
        <div className="form">
          <p>Si hay una cuenta con <strong>{email}</strong>, te llega un mail con un enlace para crear una contraseña nueva. Revisá también la carpeta de spam.</p>
          {auth.modo === 'demo' && <p className="nota">En la demo no sale ningún mail. Con Firebase activado, el enlace llega de verdad.</p>}
          <button className="btn btn--pri" onClick={alVolver}>Volver a iniciar sesión</button>
        </div>
      ) : (
        <form className="form" onSubmit={enviar} noValidate>
          <p className="tenue">Escribí el mail con el que te registraste y te mandamos un enlace.</p>
          <label className="campo" htmlFor="rec-email"><span>Email</span>
            <input id="rec-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn--pri btn--grande" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviarme el enlace'}</button>
          <button type="button" className="enlace acceso__olvide" onClick={alVolver}>Volver</button>
        </form>
      )}
    </>
  );
}
