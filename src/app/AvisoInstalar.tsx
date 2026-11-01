import { MARCA } from '@/config/marca';
import { cerrarAviso, instalar, useInstalacion } from './instalar';

/** Tarjeta abajo de la pantalla que ofrece instalar Proveo como app. Se cierra y no vuelve por 30 días. */
export function AvisoInstalar() {
  const { modo, cerrado } = useInstalacion();
  if (!modo || cerrado) return null;
  return (
    <aside className="instalar" aria-label="Instalar la app">
      <img className="instalar__ico" src="/icono-192.png" alt="" width={44} height={44} />
      <div className="instalar__txt">
        <strong>Instalá {MARCA.nombre} en tu {modo === 'ios' ? 'celular' : 'equipo'}</strong>
        {modo === 'nativo'
          ? <span>Se abre como una app, en su propia ventana y con ícono en el inicio.</span>
          : <span>Tocá <IconoCompartir /> <b>Compartir</b> y después <b>Agregar a inicio</b>.</span>}
      </div>
      <div className="instalar__acc">
        {modo === 'nativo' && <button type="button" className="btn btn--pri btn--chico" onClick={() => { void instalar(); }}>Instalar</button>}
        <button type="button" className="btn btn--ter btn--chico" onClick={cerrarAviso}>{modo === 'nativo' ? 'Ahora no' : 'Entendido'}</button>
      </div>
    </aside>
  );
}

function IconoCompartir() {
  return (
    <svg className="instalar__compartir" viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
