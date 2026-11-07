import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { prepararLogo } from '@/auth/imagen';
import { FalloAuth, MENSAJES_FALLO, type CambiosPerfil, type ContactoCuenta } from '@/auth/tipos';
import { REGION } from '@/config/region';
import { REGIONES, RUBROS, region, rubro } from '@/domain/catalogos';
import { DIAS_INVITACION, lugaresEquipo, PLANES } from '@/domain/planes';
import type { Proveedor, RegionId, RubroId } from '@/domain/types';
import { useQuery, useRepo } from '@/data/DataProvider';
import { esMailValido } from '@/domain/validaciones';
import { t } from '@/i18n';
import { Copiable, Pill, Seccion } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';
import { MisDatos } from './MisDatos';

const mensaje = (e: unknown) => (e instanceof FalloAuth ? MENSAJES_FALLO[e.codigo] : e instanceof Error ? e.message : MENSAJES_FALLO.desconocido);

export function MiPerfil() {
  const { auth, cuenta } = useAuth();
  const [params] = useSearchParams();
  const ir = useNavigate();
  const avisar = useToast();
  const c = cuenta!;
  const p = c.perfil;
  // Un miembro del equipo ve el perfil de la empresa, pero lo edita el titular.
  const miembro = c.miembro;
  const [editando, setEditando] = useState(params.get('editar') === '1' && !miembro);

  return (
    <div className="envoltura pagina mi-perfil">
      {params.get('nuevo') === '1' && (
        <p className="nota mi-perfil__bienvenida">Tu cuenta está lista. Sumá el logo de tu empresa para que te reconozcan en la red.</p>
      )}
      <header className="mi-perfil__cab">
        {miembro ? <LogoFijo /> : <Logo />}
        <div>
          <p className="eyebrow">{t.rol[p.rol]} · {rubro(p.categoria).nombre}</p>
          <h1>{p.empresa}</h1>
          <p className="tenue">{p.contactoNombre}{p.sector && ` · ${p.sector}`} · {p.ubicacion}</p>
        </div>
      </header>

      <div className="mi-perfil__cols">
        <div>
          {editando
            ? <Edicion alTerminar={() => setEditando(false)} />
            : (
              <Seccion titulo="Datos de la empresa" extra={miembro ? undefined : <button className="btn btn--sec btn--chico" onClick={() => setEditando(true)}>Editar</button>}>
                <dl className="datos">
                  <div><dt>Empresa</dt><dd>{p.empresa}</dd></div>
                  <div><dt>Nombre de contacto</dt><dd>{p.contactoNombre}</dd></div>
                  <div><dt>Email de contacto</dt><dd className="mono">{c.contacto.email}</dd></div>
                  <div><dt>Teléfono de contacto</dt><dd className="mono">{c.contacto.telefono || '—'}</dd></div>
                  <div><dt>Categoría</dt><dd>{rubro(p.categoria).nombre}</dd></div>
                  <div><dt>Sector</dt><dd>{p.sector || '—'}</dd></div>
                  <div><dt>Ubicación</dt><dd>{p.ubicacion}</dd></div>
                  <div><dt>{REGION.idFiscal.nombre}</dt><dd className="mono">{p.cuit}</dd></div>
                </dl>
              </Seccion>
            )}
        </div>
        <div className="mi-perfil__lateral">
          {miembro && (
            <Seccion titulo="Tu usuario">
              <p>Sos parte del equipo de <strong>{p.empresa}</strong> como {miembro.nombre}. Cotizás y pedís contactos a nombre de la empresa.</p>
              <p className="tenue">Los datos de la empresa, el plan y el equipo los maneja el titular de la cuenta.</p>
            </Seccion>
          )}
          {p.rol === 'proveedor' && !miembro && <Equipo />}
          {p.rol === 'proveedor' && !miembro && <Regiones />}
          <Seccion titulo="Quién ve tu contacto">
            <p>{p.rol === 'comprador'
              ? 'Tu mail y teléfono los ve solo el proveedor cuya solicitud aceptás. Otros compradores, no.'
              : 'Los compradores registrados ven tu mail y teléfono. Otros proveedores, no.'}</p>
            <p className="tenue">El resto de tu perfil lo ve cualquier usuario registrado.</p>
          </Seccion>
          <Seccion titulo="Cuenta">
            <p className="tenue">Ingresás con <span className="mono">{c.email}</span>.</p>
            <div className="acciones-sol">
              <button className="btn btn--sec" onClick={async () => {
                try { await auth.restablecerPassword(c.email); avisar(auth.modo === 'demo' ? 'En la demo no sale ningún mail. Con Firebase te llega el enlace.' : `Te mandamos un enlace a ${c.email} para cambiar la contraseña.`, 'info'); }
                catch (e) { avisar(mensaje(e), 'error'); }
              }}>Cambiar contraseña</button>
              <button className="btn btn--ter" onClick={async () => { await auth.salir(); ir('/'); }}>Cerrar sesión</button>
            </div>
          </Seccion>
          <MisDatos />
          <Link className="enlace" to={`/red/${c.uid}`}>Ver cómo me ven en la red</Link>
          <EnlaceAdmin />
        </div>
      </div>
    </div>
  );
}

/** Equipo del plan Empresa: el titular invita con enlaces de un solo uso y saca a quien ya no corresponde. */
function Equipo() {
  const { cuenta } = useAuth();
  const repo = useRepo();
  const avisar = useToast();
  const uid = cuenta!.uid;
  const { data } = useQuery(async (r) => {
    const yo = (await r.obtenerPersona(uid)) as Proveedor | null;
    return { yo, equipo: yo?.plan === 'empresa' ? await r.equipo(uid) : null };
  }, [uid]);
  const [etiqueta, setEtiqueta] = useState('');
  const [ocupado, setOcupado] = useState(false);
  if (!data?.yo) return null;
  const lugares = lugaresEquipo(data.yo.plan);
  const enlace = (codigo: string) => `${window.location.origin}/unirse?codigo=${codigo}`;
  const hacer = async (fn: () => Promise<unknown>, ok: string) => {
    setOcupado(true);
    try { await fn(); avisar(ok); } catch (e) { avisar(mensaje(e), 'error'); } finally { setOcupado(false); }
  };

  if (!data.equipo) {
    return (
      <Seccion titulo="Tu equipo">
        <p>Hoy entrás solo vos.</p>
        <p className="tenue">Con el plan Empresa sumás hasta {PLANES.empresa.usuarios - 1} personas de tu equipo comercial, cada una con su usuario, y comparten el cupo de la empresa.</p>
        <Link className="enlace" to="/planes">Ver planes</Link>
      </Seccion>
    );
  }
  const { miembros, invitaciones } = data.equipo;
  const libres = lugares - miembros.length - invitaciones.length;
  return (
    <Seccion titulo="Tu equipo" extra={<Pill tono="neutro">{miembros.length + 1} de {lugares + 1}</Pill>}>
      <ul className="lista-equipo">
        <li><strong>{cuenta!.perfil.contactoNombre}</strong> <span className="tenue">· titular</span></li>
        {miembros.map((m) => (
          <li key={m.uid}>
            <span><strong>{m.nombre}</strong> <span className="tenue">· {m.email}</span></span>
            <button className="enlace" disabled={ocupado} onClick={() => window.confirm(`¿Sacar a ${m.nombre} del equipo? Pierde el acceso enseguida.`)
              && hacer(() => repo.quitarDelEquipo(uid, m.uid), `${m.nombre} ya no es parte del equipo.`)}>Quitar</button>
          </li>
        ))}
      </ul>
      {invitaciones.length > 0 && (
        <>
          <h3 className="sub">Enlaces sin usar</h3>
          <ul className="lista-equipo">
            {invitaciones.map((i) => (
              <li key={i.codigo} className="lista-equipo__invitacion">
                <span>{i.etiqueta || 'Sin nombre'} <span className="tenue">· vence el {i.vence.split('-').reverse().join('/')}</span></span>
                <Copiable texto={enlace(i.codigo)} etiqueta="Enlace" />
                <button className="enlace" disabled={ocupado} onClick={() => hacer(() => repo.cancelarInvitacion(i.codigo), 'Enlace cancelado.')}>Cancelar</button>
              </li>
            ))}
          </ul>
        </>
      )}
      {libres > 0 ? (
        <form className="form" onSubmit={(e) => { e.preventDefault(); hacer(async () => { await repo.invitarAlEquipo(uid, etiqueta); setEtiqueta(''); }, 'Enlace creado. Copialo y mandáselo por mail o WhatsApp.'); }}>
          <label className="campo" htmlFor="eq-etiqueta"><span>¿Para quién es? (opcional)</span>
            <input id="eq-etiqueta" placeholder="Ej.: Martina, ventas zona norte" value={etiqueta} maxLength={80} onChange={(e) => setEtiqueta(e.target.value)} />
          </label>
          <button className="btn btn--sec btn--chico" disabled={ocupado}>Crear enlace de invitación</button>
          <p className="tenue">El enlace sirve para una sola persona y vence a los {DIAS_INVITACION} días.</p>
        </form>
      ) : <p className="tenue">El equipo está completo. Para sumar a alguien, quitá a otra persona o cancelá un enlace.</p>}
    </Seccion>
  );
}

/** El logo sin controles: lo cambia el titular. */
function LogoFijo() {
  const { cuenta } = useAuth();
  const p = cuenta!.perfil;
  return (
    <div className="logo-empresa">
      <div className="logo-empresa__marco">
        {p.logoUrl ? <img src={p.logoUrl} alt={`Logo de ${p.empresa}`} /> : <span className="logo-empresa__vacio">Sin logo</span>}
      </div>
    </div>
  );
}

/** Solo para quien figura en admins/{uid}: acceso al panel del equipo. */
function EnlaceAdmin() {
  const { cuenta } = useAuth();
  const { data: admin } = useQuery((r) => r.esAdmin(cuenta!.uid), [cuenta!.uid]);
  return admin ? <Link className="enlace bloque-linea" to="/admin">Administración: cuentas y planes</Link> : null;
}

/** Regiones en las que el proveedor aparece en la red. La principal sale de su ubicación; sumar es del plan Empresa. */
function Regiones() {
  const { cuenta } = useAuth();
  const repo = useRepo();
  const avisar = useToast();
  const { data: yo } = useQuery((r) => r.obtenerPersona(cuenta!.uid) as Promise<Proveedor | null>, [cuenta!.uid]);
  const [guardando, setGuardando] = useState(false);
  if (!yo) return null;
  const cupo = PLANES[yo.plan].regiones;
  const activas = REGIONES.filter((r) => r.id === yo.region || (yo.cobertura[r.id] ?? 0) > 0).map((r) => r.id);
  const alternar = async (id: RegionId, si: boolean) => {
    const extra = (si ? [...activas, id] : activas.filter((x) => x !== id)).filter((x) => x !== yo.region);
    setGuardando(true);
    try { await repo.cambiarRegiones(yo.id, extra); avisar(si ? `Ahora también aparecés en ${region(id).nombre}.` : `Ya no aparecés en ${region(id).nombre}.`); }
    catch (e) { avisar(mensaje(e), 'error'); }
    finally { setGuardando(false); }
  };
  return (
    <Seccion titulo="Regiones donde trabajás">
      {cupo > 1 ? (
        <>
          <p className="tenue">Los compradores que filtran por estas regiones te encuentran en la red.</p>
          <ul className="lista-regiones">
            {REGIONES.map((r) => (
              <li key={r.id}>
                <label className="tarjeta__sel">
                  <input type="checkbox" disabled={guardando || r.id === yo.region} checked={activas.includes(r.id)} onChange={(e) => alternar(r.id, e.target.checked)} />
                  <span>{r.nombre}{r.id === yo.region && <span className="tenue"> · principal</span>}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p>Aparecés en <strong>{region(yo.region).nombre}</strong>, la región de tu ubicación.</p>
          <p className="tenue">Con el plan Empresa sumás las otras regiones y te encuentran compradores de todo el país.</p>
          <Link className="enlace" to="/planes">Ver planes</Link>
        </>
      )}
    </Seccion>
  );
}

function Logo() {
  const { auth, cuenta } = useAuth();
  const avisar = useToast();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const p = cuenta!.perfil;

  const elegir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendo(true);
    try {
      await auth.subirLogo(await prepararLogo(archivo, auth.logoEnPerfil));
      avisar('Logo actualizado.');
    } catch (e) {
      avisar(mensaje(e), 'error');
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = '';
    }
  };

  return (
    <div className="logo-empresa">
      <div className="logo-empresa__marco" aria-busy={subiendo}>
        {p.logoUrl ? <img src={p.logoUrl} alt={`Logo de ${p.empresa}`} /> : <span className="logo-empresa__vacio">Sin logo</span>}
      </div>
      <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => elegir(e.target.files?.[0])} />
      <div className="logo-empresa__acc">
        <button className="btn btn--sec btn--chico" disabled={subiendo} onClick={() => entrada.current?.click()}>{subiendo ? 'Subiendo…' : p.logoUrl ? 'Cambiar foto o logo' : 'Subir foto o logo'}</button>
        {p.logoUrl && !subiendo && <button className="enlace" onClick={() => auth.quitarLogo().catch((e) => avisar(mensaje(e), 'error'))}>Quitar</button>}
      </div>
      <span className="tenue logo-empresa__ayuda">PNG, JPG o WebP. Se ajusta a {auth.logoEnPerfil ? 256 : 512} px.</span>
    </div>
  );
}

function Edicion({ alTerminar }: { alTerminar: () => void }) {
  const { auth, cuenta } = useAuth();
  const avisar = useToast();
  const c = cuenta!;
  const [perfil, setPerfil] = useState<Required<CambiosPerfil>>({
    empresa: c.perfil.empresa, contactoNombre: c.perfil.contactoNombre, categoria: c.perfil.categoria, sector: c.perfil.sector, ubicacion: c.perfil.ubicacion,
  });
  const [contacto, setContacto] = useState<ContactoCuenta>({ ...c.contacto });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setP = <K extends keyof CambiosPerfil>(k: K, v: Required<CambiosPerfil>[K]) => setPerfil((x) => ({ ...x, [k]: v }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (perfil.empresa.trim().length < 2 || perfil.contactoNombre.trim().length < 2 || perfil.ubicacion.trim().length < 2) { setError('Empresa, contacto y ubicación no pueden quedar vacíos.'); return; }
    if (!esMailValido(contacto.email)) { setError('Revisá el email de contacto.'); return; }
    setError(null);
    setGuardando(true);
    try {
      const limpio = Object.fromEntries(Object.entries(perfil).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])) as Required<CambiosPerfil>;
      await auth.actualizarPerfil(limpio, { email: contacto.email.trim(), telefono: contacto.telefono.trim() });
      avisar('Perfil actualizado.');
      alTerminar();
    } catch (err) {
      setError(mensaje(err));
      setGuardando(false);
    }
  };

  return (
    <Seccion titulo="Editar datos" extra={<Pill tono="sello">Editando</Pill>}>
      <form className="form" onSubmit={guardar} noValidate>
        <div className="form__fila">
          <label className="campo" htmlFor="e-empresa"><span>Nombre de la empresa</span><input id="e-empresa" value={perfil.empresa} onChange={(e) => setP('empresa', e.target.value)} /></label>
          <label className="campo" htmlFor="e-contacto"><span>Nombre de contacto</span><input id="e-contacto" value={perfil.contactoNombre} onChange={(e) => setP('contactoNombre', e.target.value)} /></label>
        </div>
        <div className="form__fila">
          <label className="campo" htmlFor="e-email"><span>Email de contacto</span><input id="e-email" type="email" value={contacto.email} onChange={(e) => setContacto({ ...contacto, email: e.target.value })} /></label>
          <label className="campo" htmlFor="e-tel"><span>Teléfono de contacto</span><input id="e-tel" type="tel" value={contacto.telefono} onChange={(e) => setContacto({ ...contacto, telefono: e.target.value })} /></label>
        </div>
        <div className="form__fila">
          <label className="campo" htmlFor="e-cat"><span>Categoría</span>
            <select id="e-cat" value={perfil.categoria} onChange={(e) => setP('categoria', e.target.value as RubroId)}>
              {RUBROS.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </label>
          <label className="campo" htmlFor="e-sector"><span>Sector</span><input id="e-sector" value={perfil.sector} onChange={(e) => setP('sector', e.target.value)} /></label>
        </div>
        <label className="campo" htmlFor="e-ubic"><span>Ubicación</span><input id="e-ubic" value={perfil.ubicacion} onChange={(e) => setP('ubicacion', e.target.value)} /></label>
        <p className="tenue">El {REGION.idFiscal.nombre} y el tipo de cuenta no se cambian desde acá: escribinos si hace falta.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form__acciones">
          <button type="button" className="btn btn--ter" onClick={alTerminar}>{t.acciones.cancelar}</button>
          <button className="btn btn--pri" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
    </Seccion>
  );
}
