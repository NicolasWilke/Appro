import { EditarValores } from '@/features/admin/EditarValores';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { Landing } from '@/features/landing/Landing';
import { Acceso } from '@/features/acceso/Acceso';
import { MiPerfil } from '@/features/cuenta/MiPerfil';
import { Directorio } from '@/features/red/Directorio';
import { Perfil } from '@/features/red/Perfil';
import { Panel } from '@/features/panel/Panel';
import { Cotizaciones } from '@/features/cotizaciones/Cotizaciones';
import { DetallePedido } from '@/features/cotizaciones/DetallePedido';
import { NuevoPedido } from '@/features/cotizaciones/NuevoPedido';
import { ResumenEjecutivo } from '@/features/cotizaciones/ResumenEjecutivo';
import { IndicePrecios } from '@/features/precios/IndicePrecios';
import { Planes } from '@/features/planes/Planes';
import { Bandeja } from '@/features/mails/Bandeja';
import { ValoresReferencia } from '@/features/valores/ValoresReferencia';
import { Layout } from './Layout';
import { RequiereSesion } from './RequiereSesion';

/** Enlaces viejos a /registro?rol=… siguen funcionando. */
function RedirigirRegistro() {
  const [params] = useSearchParams();
  const rol = params.get('rol');
  return <Navigate to={`/ingresar?modo=registro${rol ? `&rol=${rol}` : ''}`} replace />;
}

const rutas = (
  <Route element={<Layout />}>
    <Route index element={<Landing />} />
    <Route path="ingresar" element={<Acceso />} />
    <Route path="registro" element={<RedirigirRegistro />} />
    <Route path="planes" element={<Planes />} />
    <Route element={<RequiereSesion />}>
      <Route path="perfil" element={<MiPerfil />} />
      <Route path="panel" element={<Panel />} />
      <Route path="red" element={<Directorio />} />
      <Route path="red/:id" element={<Perfil />} />
      <Route path="cotizaciones" element={<Cotizaciones />} />
      <Route path="cotizaciones/nuevo" element={<NuevoPedido />} />
      <Route path="cotizaciones/:id" element={<DetallePedido />} />
      <Route path="cotizaciones/:id/resumen" element={<ResumenEjecutivo />} />
      <Route path="precios" element={<IndicePrecios />} />
      <Route path="mails" element={<Bandeja />} />
      <Route path="valores" element={<ValoresReferencia />} />
      <Route path="admin/valores" element={<EditarValores />} />
    </Route>
    <Route path="*" element={<Landing />} />
  </Route>
);

// La demo publicada no puede cambiar la URL del visor: usa un router en memoria
// y acepta un ancla simple (#precios, #planes...) para abrir una sección.
const ANCLAS: Record<string, string> = {
  registro: '/ingresar?modo=registro', ingresar: '/ingresar', perfil: '/perfil', panel: '/panel', red: '/red', cotizaciones: '/cotizaciones', precios: '/precios', planes: '/planes', mails: '/mails', valores: '/valores',
};

export function AppRouter() {
  if (import.meta.env.VITE_ROUTER === 'memory') {
    const inicio = ANCLAS[window.location.hash.slice(1)] ?? '/';
    return <MemoryRouter initialEntries={[inicio]}><Routes>{rutas}</Routes></MemoryRouter>;
  }
  return <BrowserRouter><Routes>{rutas}</Routes></BrowserRouter>;
}
