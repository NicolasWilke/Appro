import { useSesion } from '@/app/session';
import { PanelComprador } from './PanelComprador';
import { PanelProveedor } from './PanelProveedor';

/** Inicio por tarea: cada rol abre en lo que tiene que resolver hoy. */
export function Panel() {
  const { rol } = useSesion();
  return rol === 'comprador' ? <PanelComprador /> : <PanelProveedor />;
}
