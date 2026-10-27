import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useQuery, useRepo } from '@/data/DataProvider';
import { DESCUENTO_ANUAL, PLANES, precioMensual } from '@/domain/planes';
import type { PlanId, Proveedor } from '@/domain/types';
import { fmt } from '@/i18n';
import { Pill } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';

const DETALLE: Record<PlanId, string[]> = {
  gratis: ['Perfil y vitrina', '3 solicitudes de contacto por mes', '3 respuestas a pedidos por mes', 'Reseñas de compradores'],
  pro: ['25 solicitudes de contacto por mes', 'Todos los pedidos de tu rubro, sin límite', 'Analítica del embudo', 'Lectura contra el índice al cotizar'],
  empresa: ['80 solicitudes de contacto por mes', 'Hasta 5 usuarios del equipo comercial', 'Varias regiones', 'Posición destacada en la red'],
};

export function Planes() {
  const { cuenta } = useAuth();
  const ir = useNavigate();
  const esProveedor = cuenta?.perfil.rol === 'proveedor';
  const repo = useRepo();
  const avisar = useToast();
  const [anual, setAnual] = useState(false);
  const { data: yo } = useQuery((r) => (esProveedor ? r.obtenerPersona(cuenta.uid) : Promise.resolve(null)) as Promise<Proveedor | null>, [esProveedor, cuenta?.uid]);

  const elegir = async (id: PlanId) => {
    if (!cuenta) { ir('/ingresar?modo=registro&rol=proveedor'); return; }
    if (!esProveedor) { avisar('Los planes pagos son para proveedores. Como comprador usás la red gratis.', 'info'); return; }
    const resultado = await repo.cambiarPlan(cuenta.uid, id);
    avisar(resultado === 'activo'
      ? `Plan ${PLANES[id].nombre} activo en ${cuenta.perfil.empresa}.`
      : `Recibimos tu pedido del plan ${PLANES[id].nombre}. Te escribimos para coordinar el pago y lo activamos.`, resultado === 'activo' ? 'ok' : 'info');
  };

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab">
        <p className="eyebrow">Planes</p>
        <h1>Paga el proveedor. El comprador entra gratis, siempre.</h1>
        <p className="tenue">Precios de referencia en dólares, facturados en pesos con ajuste trimestral. Sin comisión por negocio cerrado.</p>
      </header>
      <div className="segmento" role="group" aria-label="Frecuencia de pago">
        <button type="button" aria-pressed={!anual} className={!anual ? 'is-activo' : ''} onClick={() => setAnual(false)}>Mensual</button>
        <button type="button" aria-pressed={anual} className={anual ? 'is-activo' : ''} onClick={() => setAnual(true)}>Anual · {Math.round(DESCUENTO_ANUAL * 100)}% menos</button>
      </div>

      <h2 className="sub">Proveedores</h2>
      <div className="planes">
        {(Object.keys(PLANES) as PlanId[]).map((id) => {
          const p = PLANES[id];
          const actual = yo?.plan === id;
          return (
            <article key={id} className={`plan ${id === 'pro' ? 'plan--clave' : ''}`}>
              <header>
                <h3>{p.nombre}</h3>
                {id === 'pro' && <Pill tono="sello">El más elegido</Pill>}
              </header>
              <p className="plan__precio"><span className="mono">{p.precioUsd ? fmt.usd(precioMensual(p, anual)) : 'USD 0'}</span><span className="tenue">/mes</span></p>
              <ul className="lista-check">{DETALLE[id].map((d) => <li key={d}>{d}</li>)}</ul>
              <button className={`btn ${id === 'pro' ? 'btn--pri' : 'btn--sec'}`} disabled={actual} onClick={() => elegir(id)}>{actual ? 'Tu plan actual' : `Elegir ${p.nombre}`}</button>
            </article>
          );
        })}
      </div>

      <h2 className="sub">Compradores</h2>
      <div className="planes planes--dos">
        <article className="plan">
          <header><h3>Comprador</h3></header>
          <p className="plan__precio"><span className="mono">Gratis</span><span className="tenue"> para siempre</span></p>
          <ul className="lista-check"><li>Perfil verificado</li><li>Pedidos de cotización ilimitados</li><li>Comparador e índice de precios</li><li>Reseñas y círculos de compradores</li></ul>
        </article>
        <article className="plan plan--proximo">
          <header><h3>Equipo de compras</h3><Pill tono="senal">Próximamente</Pill></header>
          <p className="plan__precio"><span className="tenue">Para empresas medianas y grandes</span></p>
          <ul className="lista-check"><li>Varios compradores en una cuenta</li><li>Flujo de aprobación</li><li>Historial de proveedores</li><li>Exportación al ERP</li></ul>
          <button className="btn btn--sec" onClick={() => avisar('Te sumamos a la lista de espera del plan Equipo.', 'info')}>Sumarme a la lista de espera</button>
        </article>
      </div>
    </div>
  );
}
