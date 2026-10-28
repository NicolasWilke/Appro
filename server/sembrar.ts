// npm run sembrar                → carga lo que falta: valores de referencia, catálogos y serie de inflación
// npm run sembrar -- --forzar    → además pisa lo que ya existe (cuidado: borra los valores cargados a mano)
// npm run sembrar -- --ejemplos  → agrega el índice de precios de ejemplo (datos ficticios, solo para probar)
import { REGIONES, RUBROS } from '@/domain/catalogos';
import { valores } from '@/data/valores-referencia';
import { inflacion, meses, mesesIso, series } from '@/data/mock/seed';
import { db, PROYECTO } from './firebaseAdmin';

const forzar = process.argv.includes('--forzar');
const conEjemplos = process.argv.includes('--ejemplos');
let creados = 0;
let salteados = 0;

async function poner(ruta: string, datos: Record<string, unknown>) {
  const ref = db.doc(ruta);
  if (!forzar && (await ref.get()).exists) { salteados++; return; }
  await ref.set(datos);
  creados++;
}

console.log(`Proyecto: ${PROYECTO}${process.env.FIRESTORE_EMULATOR_HOST ? ' (emulador)' : ''}`);

for (const v of valores) {
  const { id, ...resto } = v;
  await poner(`valoresReferencia/${id}`, resto);
}
await poner('config/catalogos', { rubros: RUBROS, regiones: REGIONES });
await poner('config/indice', {
  meses, mesesIso, inflacion,
  nota: 'Inflación mensual (%) usada para llevar valores a pesos de hoy. Reemplazar por la serie del INDEC y agregar un mes cada mes.',
});
if (conEjemplos) {
  for (const s of series) await poner(`indicePrecios/${s.rubro}`, { ...s, ejemplo: true });
}

console.log(`Listo: ${creados} documentos creados, ${salteados} ya existían${salteados && !forzar ? ' (usá --forzar para pisarlos)' : ''}.`);
