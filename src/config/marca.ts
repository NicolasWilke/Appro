// Identidad de Proveo en un solo lugar.
// logo.png es el símbolo (la P) y wordmark.png el nombre con su tipografía, ambos con fondo transparente.
// Cuando llegue el vectorial, guardarlos como .svg y cambiar las importaciones; nada más depende de los archivos.
import logo from '@/assets/logo.png';
import wordmark from '@/assets/wordmark.png';

export const MARCA = {
  nombre: 'Proveo',
  lema: 'Conectando empresas. Generando negocios.',
  /** El lema en dos renglones, como va debajo del nombre en la cabecera. */
  lemaRenglones: ['Conectando empresas.', 'Generando negocios.'],
  logo,
  wordmark,
  // Paleta de la hoja de marca. Texto azul sobre blanco usa `azulTexto` (contraste AA).
  colores: { marino: '#0B2D5B', azul: '#1E88E5', azulTexto: '#1565C0', verde: '#00C853', verdeTexto: '#00873A', claro: '#E8EEF5' },
} as const;
