import type { Rol, RubroId } from '@/domain/types';

/** Perfil público: lo ve cualquier usuario registrado. En Firestore: users/{uid}. */
export interface PerfilCuenta {
  uid: string;
  rol: Rol;
  empresa: string;
  contactoNombre: string;
  categoria: RubroId;
  sector: string;
  ubicacion: string;
  cuit: string;
  logoUrl: string | null;
}

/** Datos de contacto: solo los ve quien la política habilita. En Firestore: users/{uid}/privado/contacto. */
export interface ContactoCuenta { email: string; telefono: string }

export interface AltaCuenta extends Omit<PerfilCuenta, 'uid' | 'logoUrl'>, ContactoCuenta { password: string }

export type CambiosPerfil = Partial<Pick<PerfilCuenta, 'empresa' | 'contactoNombre' | 'categoria' | 'sector' | 'ubicacion'>>;

/**
 * Usuario con sesión iniciada. `email` es el de ingreso; el de contacto puede ser otro.
 * Si es parte del equipo de un proveedor Empresa, `uid`, `perfil` y `contacto` son los de la empresa
 * (actúa por ella) y `miembro` dice quién es la persona.
 */
export interface Cuenta { uid: string; email: string; perfil: PerfilCuenta; contacto: ContactoCuenta; miembro?: { uid: string; nombre: string } }

/** Lo que ve quien abre un enlace para sumarse a un equipo. */
export interface InvitacionEquipo { codigo: string; empresaId: string; empresa: string; vence: string }
export interface AltaMiembro { nombre: string; email: string; password: string }

export type CodigoFallo = 'mail-en-uso' | 'credenciales' | 'password-debil' | 'demasiados-intentos' | 'red' | 'sin-permiso' | 'sin-equipo' | 'sin-perfil' | 'invitacion-invalida' | 'desconocido';

export class FalloAuth extends Error {
  constructor(public codigo: CodigoFallo) { super(codigo); }
}

export const MENSAJES_FALLO: Record<CodigoFallo, string> = {
  'mail-en-uso': 'Ya hay una cuenta con ese mail. Iniciá sesión o recuperá tu contraseña.',
  credenciales: 'El mail o la contraseña no coinciden.',
  'password-debil': 'La contraseña es muy corta.',
  'demasiados-intentos': 'Demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.',
  red: 'No hay conexión. Revisá internet y probá de nuevo.',
  'sin-permiso': 'No tenés permiso para hacer eso.',
  'sin-equipo': 'Tu empresa ya no tiene el plan Empresa, así que el equipo quedó en pausa. Pedile al titular que lo renueve.',
  'sin-perfil': 'Tu usuario no tiene una empresa asociada. Si eras parte de un equipo, pedile al titular que te vuelva a invitar.',
  'invitacion-invalida': 'Este enlace ya se usó, venció o el equipo está completo. Pedile uno nuevo a quien te invitó.',
  desconocido: 'Algo falló. Probá de nuevo en un momento.',
};

/**
 * Contrato de autenticación y perfil. La demo usa DemoAuth (todo en el navegador);
 * con VITE_AUTH=firebase se usa FirebaseAuth. Las pantallas no saben cuál hay detrás.
 */
export interface AuthService {
  readonly modo: 'demo' | 'firebase';
  /** true: el logo se guarda como imagen chica dentro del perfil (sin Storage). */
  readonly logoEnPerfil: boolean;
  /** Llama a `fn` con la cuenta actual (o null) y cada vez que cambia. Devuelve cómo desuscribirse. */
  observar(fn: (c: Cuenta | null) => void): () => void;
  registrar(alta: AltaCuenta): Promise<Cuenta>;
  ingresar(email: string, password: string): Promise<Cuenta>;
  salir(): Promise<void>;
  /**
   * Pide borrar la cuenta (Ley 25.326, supresión) y cierra la sesión. Con Firebase queda el pedido en bajas/{uid}
   * y el script de avisos borra perfil, pedidos, ofertas, solicitudes y el usuario en la próxima corrida.
   * Un miembro de equipo borra solo su usuario; la empresa sigue.
   */
  pedirBaja(): Promise<void>;
  /** Manda el mail para crear una contraseña nueva. No revela si el mail existe. */
  restablecerPassword(email: string): Promise<void>;
  actualizarPerfil(cambios: CambiosPerfil, contacto?: Partial<ContactoCuenta>): Promise<void>;
  /** Sube la imagen ya preparada (ver prepararLogo) y la deja como logo del perfil. Devuelve la URL. */
  subirLogo(imagen: Blob): Promise<string>;
  quitarLogo(): Promise<void>;
  /** El comprador con sesión acepta a un proveedor: desde ahí ese proveedor ve su contacto. */
  aceptarProveedor(proveedorUid: string): Promise<void>;
  /** Contacto de otro usuario, si las reglas lo permiten. null si no existe o no hay permiso. */
  contactoDe(uid: string): Promise<ContactoCuenta | null>;
  /** Invitación a un equipo, o null si no existe o venció. No hace falta sesión. */
  leerInvitacion(codigo: string): Promise<InvitacionEquipo | null>;
  /** Crea el usuario y lo suma al equipo con la invitación (que se consume). Queda con sesión iniciada. */
  unirseAEquipo(codigo: string, alta: AltaMiembro): Promise<Cuenta>;
}
