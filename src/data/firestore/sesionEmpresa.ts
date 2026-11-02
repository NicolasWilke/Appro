/**
 * Por qué cuenta actúa la sesión. Un miembro del equipo de un proveedor Empresa actúa por la empresa: lo fija
 * FirebaseAuth al leer la cuenta y lo usa FirestoreRepository como "yo". Sin miembro, es el propio usuario.
 */
let empresa: string | null = null;
export const fijarEmpresaDeSesion = (id: string | null) => { empresa = id; };
export const empresaDeSesion = () => empresa;
