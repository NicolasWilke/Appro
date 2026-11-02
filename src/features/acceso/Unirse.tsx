import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { FalloAuth, MENSAJES_FALLO } from '@/auth/tipos';
import { MARCA } from '@/config/marca';
import { PASSWORD_MIN } from '@/domain/acceso';
import { useQuery } from '@/data/DataProvider';
import { esMailValido } from '@/domain/validaciones';

const mensaje = (e: unknown) => (e instanceof FalloAuth ? MENSAJES_FALLO[e.codigo] : e instanceof Error ? e.message : MENSAJES_FALLO.desconocido);
const fecha = (iso: string) => iso.split('-').reverse().join('/');

/**
 * /unirse?codigo=…: quien recibe el enlace del titular crea su usuario y queda en el equipo de la empresa.
 * No tiene perfil propio: entra a la red como la empresa (pedidos, ofertas, solicitudes).
 */
export function Unirse() {
  const [params] = useSearchParams();
  const codigo = params.get('codigo') ?? '';
  const { auth, cuenta } = useAuth();
  const ir = useNavigate();
  const { data: inv, cargando } = useQuery(() => (codigo ? auth.leerInvitacion(codigo) : Promise.resolve(null)), [codigo]);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (cargando) return <div className="envoltura acceso" aria-busy="true" />;

  if (!inv) {
    return (
      <div className="envoltura acceso">
        <div className="acceso__tarjeta">
          <h1 className="acceso__titulo">Este enlace no sirve</h1>
          <p>{MENSAJES_FALLO['invitacion-invalida']}</p>
          <div className="form__acciones"><Link className="btn btn--sec" to="/">Ir al inicio</Link></div>
        </div>
      </div>
    );
  }

  if (cuenta) {
    return (
      <div className="envoltura acceso">
        <div className="acceso__tarjeta">
          <h1 className="acceso__titulo">Ya tenés sesión iniciada</h1>
          <p>Para sumarte al equipo de <strong>{inv.empresa}</strong> necesitás un usuario nuevo. Cerrá la sesión de {cuenta.perfil.empresa} y volvé a abrir el enlace.</p>
          <p className="tenue">Una cuenta que ya tiene su propia empresa en {MARCA.nombre} no puede ser parte de otro equipo.</p>
          <div className="form__acciones">
            <button className="btn btn--sec" onClick={() => auth.salir()}>Cerrar sesión</button>
          </div>
        </div>
      </div>
    );
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 2) { setError('Escribí tu nombre y apellido.'); return; }
    if (!esMailValido(email)) { setError('Revisá el mail.'); return; }
    if (password.length < PASSWORD_MIN) { setError(`La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`); return; }
    setError(null);
    setEnviando(true);
    try {
      await auth.unirseAEquipo(codigo, { nombre, email, password });
      ir('/panel', { replace: true });
    } catch (err) {
      setError(mensaje(err));
      setEnviando(false);
    }
  };

  return (
    <div className="envoltura acceso">
      <div className="acceso__tarjeta">
        <p className="eyebrow">Invitación al equipo</p>
        <h1 className="acceso__titulo">Sumate a {inv.empresa}</h1>
        <p className="tenue">Vas a ver los pedidos, cotizar y pedir contactos a nombre de {inv.empresa}, con tu propio usuario. El enlace sirve una sola vez, hasta el {fecha(inv.vence)}.</p>
        <form className="form" onSubmit={enviar} noValidate>
          <label className="campo" htmlFor="u-nombre"><span>Tu nombre y apellido</span>
            <input id="u-nombre" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="campo" htmlFor="u-email"><span>Tu mail</span>
            <input id="u-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="campo" htmlFor="u-pass"><span>Contraseña</span>
            <input id="u-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="form__acciones">
            <button className="btn btn--pri" disabled={enviando}>{enviando ? 'Creando tu usuario…' : 'Crear usuario y sumarme'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
