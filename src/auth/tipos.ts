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

/** Usuario con sesión iniciada. `email` es el de ingreso; el de contacto puede ser otro. */
export interface Cuenta { uid: string; email: string; perfil: PerfilCuenta; contacto: ContactoCuenta }

export type CodigoFallo = 'mail-en-uso' | 'credenciales' | 'password-debil' | 'demasiados-intentos' | 'red' | 'sin-permiso' | 'desconocido';

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
}
