// Todo lo que cambia al abrir otro país vive acá: idioma, moneda,
// identificación fiscal, organismo fiscal y marco de datos personales.
export interface RegionConfig {
  codigo: 'AR' | 'UY' | 'CL';
  pais: string;
  locale: string;
  moneda: string;
  idFiscal: { nombre: string; ejemplo: string };
  autoridadFiscal: string;
  leyDatos: string;
  autoridadDatos: string;
  dominiosPersonales: string[];
}

export const ARGENTINA: RegionConfig = {
  codigo: 'AR',
  pais: 'Argentina',
  locale: 'es-AR',
  moneda: 'ARS',
  idFiscal: { nombre: 'CUIT', ejemplo: '30-71234567-1' },
  autoridadFiscal: 'ARCA',
  leyDatos: 'Ley 25.326',
  autoridadDatos: 'AAIP',
  dominiosPersonales: ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.ar', 'live.com', 'icloud.com', 'fibertel.com.ar'],
};

export const REGION = ARGENTINA;
