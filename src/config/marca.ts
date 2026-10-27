// Identidad de APPRO en un solo lugar.
// Logo: reemplazar src/assets/logo.png. Cuando llegue el vectorial, guardarlo como
// src/assets/logo.svg y cambiar la importación de abajo; nada más depende del archivo.
import logo from '@/assets/logo.png';

export const MARCA = {
  nombre: 'APPRO',
  lema: 'Conectando empresas. Generando negocios.',
  logo,
  // Paleta de la hoja de marca. Texto azul sobre blanco usa `azulTexto` (contraste AA).
  colores: { marino: '#0B2D5B', azul: '#1E88E5', azulTexto: '#1565C0', verde: '#00C853', verdeTexto: '#00873A', claro: '#E8EEF5' },
} as const;
