// Textos de la interfaz común. Las pantallas de cada módulo migran acá
// a medida que se estabilizan; agregar un idioma es sumar otro diccionario.
import { MARCA } from '@/config/marca';

export const esAR = {
  marca: MARCA.nombre,
  bajada: MARCA.lema,
  nav: { inicio: 'Cómo funciona', red: 'La red', cotizaciones: 'Cotizaciones', precios: 'Índice de precios', valores: 'Valores de referencia', recientes: 'Compras recientes', planes: 'Planes', panel: 'Mi panel' },
  rol: { comprador: 'Comprador', proveedor: 'Proveedor', verComo: 'Ver como' },
  demo: { aviso: 'Prototipo con personas y empresas ficticias. Nada de lo que hagas acá se envía a nadie.', reiniciar: 'Reiniciar demo' },
  estado: { pendiente: 'Pendiente', aceptada: 'Aceptada', postergada: 'Más adelante', rechazada: 'No le interesa', cerrada: 'Cerrada', abierto: 'Abierto', adjudicado: 'Adjudicado' },
  acciones: { aceptar: 'Aceptar', postergar: 'Más adelante', rechazar: 'No me interesa', pedirContacto: 'Pedir contacto', cotizar: 'Cotizar', copiar: 'Copiar', copiado: 'Copiado', cancelar: 'Cancelar', cerrar: 'Cerrar' },
} as const;

export type Diccionario = typeof esAR;
