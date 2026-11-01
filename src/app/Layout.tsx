import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useRepo } from '@/data/DataProvider';
import { MARCA } from '@/config/marca';
import { REGION } from '@/config/region';
import { t } from '@/i18n';
import { useToast } from '@/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import type { Rol } from '@/domain/types';

type Item = { a: string; texto: string; fin?: boolean; icono: keyof typeof ICONOS; activo?: string[] };

/** Íconos de trazo para la barra del celular (24×24, heredan el color del texto). */
const ICONOS = {
  inicio: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  planes: 'M4 6h16M4 12h16M4 18h10',
  panel: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  pedidos: 'M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1zM9 8h6M9 12h6',
  red: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.7',
  referencias: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
};

/** Las referencias (valores, índices, convenios, compras recientes) comparten una sola entrada. */
const REFERENCIAS: { a: string; texto: string; rol?: Rol }[] = [
  { a: '/valores', texto: t.nav.valores },
  { a: '/precios', texto: t.nav.precios },
  { a: '/referencias', texto: t.nav.referencias, rol: 'comprador' },
  { a: '/compras-recientes', texto: t.nav.recientes, rol: 'comprador' },
];
const RUTAS_REF = REFERENCIAS.map((r) => r.a);

/** Cuatro entradas por rol; sin sesión, solo lo público. */
function navDe(rol: Rol | undefined): Item[] {
  if (!rol) return [
    { a: '/', texto: t.nav.inicio, fin: true, icono: 'inicio' },
    { a: '/planes', texto: t.nav.planes, icono: 'planes' },
  ];
  return [
    { a: '/panel', texto: 'Panel', icono: 'panel' },
    { a: '/cotizaciones', texto: 'Pedidos', icono: 'pedidos' },
    { a: '/red', texto: rol === 'comprador' ? 'Proveedores' : 'Compradores', icono: 'red' },
    { a: '/valores', texto: 'Referencias', icono: 'referencias', activo: RUTAS_REF },
  ];
}

type Enlace = { a: string; texto: string };

/** Columnas del pie: solo páginas que existen; cambian según haya sesión y rol. */
function columnasPie(rol: Rol | undefined): { titulo: string; enlaces: Enlace[] }[] {
  const producto: Enlace[] = [{ a: '/', texto: t.nav.inicio }, { a: '/planes', texto: t.nav.planes }];
  const legal = { titulo: 'Legal', enlaces: [{ a: '/terminos', texto: 'Términos y condiciones' }, { a: '/privacidad', texto: 'Política de privacidad' }] };
  if (!rol) return [
    { titulo: 'Producto', enlaces: producto },
    { titulo: 'Empezá', enlaces: [
      { a: '/ingresar?modo=registro&rol=comprador', texto: 'Quiero comprar' },
      { a: '/ingresar?modo=registro&rol=proveedor', texto: 'Quiero vender' },
      { a: '/ingresar', texto: 'Iniciar sesión' },
    ] },
    legal,
  ];
  return [
    { titulo: 'Producto', enlaces: producto },
    { titulo: 'Tu cuenta', enlaces: [
      { a: '/panel', texto: 'Panel' },
      rol === 'comprador' ? { a: '/cotizaciones/nuevo', texto: 'Nuevo pedido' } : { a: '/cotizaciones', texto: 'Para cotizar' },
      { a: '/red', texto: rol === 'comprador' ? 'Proveedores' : 'Compradores' },
      { a: '/perfil', texto: 'Mi perfil' },
    ] },
    { titulo: 'Referencias', enlaces: REFERENCIAS.filter((r) => !r.rol || r.rol === rol) },
    legal,
  ];
}

const iniciales = (empresa: string) => empresa.split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

export function Layout() {
  const { auth, cuenta } = useAuth();
  const { pathname } = useLocation();
  const repo = useRepo();
  const avisar = useToast();

  const [menuAbierto, setMenuAbierto] = useState(false);
  useEffect(() => { window.scrollTo(0, 0); setMenuAbierto(false); }, [pathname]);
  useEffect(() => {
    if (!menuAbierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAbierto(false); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [menuAbierto]);
  const rol = cuenta?.perfil.rol;
  const nav = navDe(rol);
  const clase = (n: Item, base: string) => ({ isActive }: { isActive: boolean }) =>
    `${base} ${isActive || n.activo?.some((r) => pathname.startsWith(r)) ? 'active' : ''}`;
  const enReferencias = !!rol && RUTAS_REF.some((r) => pathname.startsWith(r));

  return (
    <div className="app">
      <header className={`cabecera ${cuenta ? 'cabecera--sesion' : ''}`}>
        <div className="cabecera__in envoltura">
          <NavLink to="/" className="marca" aria-label={`${t.marca}, inicio`}>
            <img className="marca__logo" src={MARCA.logo} alt="" width={40} height={40} />
            <span className="marca__txt">
              <img className="marca__nombre" src={MARCA.wordmark} alt={t.marca} width={109} height={26} />
              {/* textLength estira cada renglón al ancho exacto de la palabra, con cualquier fuente. */}
              <svg className="marca__lema" viewBox="0 0 109 21" width={109} height={21} aria-hidden="true">
                {MARCA.lemaRenglones.map((r, i) => <text key={r} x={0} y={8 + i * 11} textLength={109} lengthAdjust="spacing">{r}</text>)}
              </svg>
            </span>
          </NavLink>
          <nav className="nav" aria-label="Principal">
            {nav.map((n) => <NavLink key={n.a} to={n.a} end={n.fin} className={clase(n, 'nav__link')}>{n.texto}</NavLink>)}
          </nav>
          <div className="cabecera__acc">
            {cuenta ? (
              <>
                <NavLink to="/perfil" className="usuario" aria-label={`Mi perfil: ${cuenta.perfil.empresa}`}>
                  {cuenta.perfil.logoUrl
                    ? <img className="usuario__logo" src={cuenta.perfil.logoUrl} alt="" />
                    : <span className="usuario__logo usuario__logo--ini" aria-hidden="true">{iniciales(cuenta.perfil.empresa)}</span>}
                  <span className="usuario__txt">{cuenta.perfil.empresa}<small>{t.rol[cuenta.perfil.rol]}</small></span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/ingresar" className="btn btn--sec btn--chico">Iniciar sesión</NavLink>
                <NavLink to="/ingresar?modo=registro" className="btn btn--pri btn--chico">Registrarme</NavLink>
              </>
            )}
          </div>
          <button type="button" className="hamburguesa" aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuAbierto} aria-controls="menu-chico" onClick={() => setMenuAbierto((v) => !v)}>
            <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true"><path d={menuAbierto ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
          </button>
        </div>
        {menuAbierto && (
          <nav id="menu-chico" className="menu-chico" aria-label="Menú">
            <div className="envoltura">
              {nav.map((n) => <NavLink key={n.a} to={n.a} end={n.fin} className={clase(n, 'menu-chico__link')}>{n.texto}</NavLink>)}
              {rol && REFERENCIAS.filter((r) => !r.rol || r.rol === rol).map((r) => <NavLink key={r.a} to={r.a} className="menu-chico__link menu-chico__link--sub">{r.texto}</NavLink>)}
              {cuenta
                ? <NavLink to="/perfil" className="menu-chico__link">Mi perfil</NavLink>
                : (
                  <div className="menu-chico__acc">
                    <NavLink to="/ingresar" className="btn btn--sec">Iniciar sesión</NavLink>
                    <NavLink to="/ingresar?modo=registro" className="btn btn--pri">Registrarme</NavLink>
                  </div>
                )}
            </div>
          </nav>
        )}
      </header>
      {auth.modo === 'demo' && (
        <div className="aviso-demo">
          <div className="envoltura">
            <span>{t.demo.aviso}</span>
            <span className="aviso-demo__acc">
            <NavLink to="/mails" className="enlace">Mails enviados</NavLink>
            <button type="button" className="enlace" onClick={async () => { await repo.reiniciarDemo(); if (cuenta) await repo.sincronizarCuenta({ ...cuenta.perfil, ...cuenta.contacto }); avisar('Demo reiniciada con los datos de ejemplo.', 'info'); }}>{t.demo.reiniciar}</button>
            </span>
          </div>
        </div>
      )}
      {enReferencias && (
        <nav className="subnav envoltura" aria-label="Referencias">
          {REFERENCIAS.filter((r) => !r.rol || r.rol === rol).map((r) => <NavLink key={r.a} to={r.a} className="subnav__link">{r.texto}</NavLink>)}
        </nav>
      )}
      <main className="principal"><Outlet /></main>
      {cuenta && (
        <nav className="barra-movil" aria-label="Principal en el celular">
          {nav.map((n) => (
            <NavLink key={n.a} to={n.a} end={n.fin} className={clase(n, 'barra-movil__link')}>
              <svg className="barra-movil__ico" viewBox="0 0 24 24" width={22} height={22} aria-hidden="true"><path d={ICONOS[n.icono]} /></svg>{n.texto}
            </NavLink>
          ))}
        </nav>
      )}
      <footer className="pie">
        <div className="envoltura">
          <div className="pie__grilla">
            <div className="pie__marca">
              <NavLink to="/" className="marca" aria-label={`${t.marca}, inicio`}>
                <img className="marca__logo" src={MARCA.logo} alt="" width={36} height={36} />
                <img className="marca__nombre" src={MARCA.wordmark} alt={t.marca} width={109} height={26} />
              </NavLink>
              <p>La red B2B de {REGION.pais} donde compradores y proveedores verificados piden, comparan y adjudican cotizaciones en un solo lugar.</p>
            </div>
            {columnasPie(rol).map((c) => (
              <nav key={c.titulo} className="pie__col" aria-label={c.titulo}>
                <h2 className="pie__titulo">{c.titulo}</h2>
                <ul>{c.enlaces.map((e) => <li key={e.a}><NavLink to={e.a} className="pie__link">{e.texto}</NavLink></li>)}</ul>
              </nav>
            ))}
          </div>
          <p className="pie__datos tenue">Datos personales tratados según la {REGION.leyDatos}. Base registrada ante la {REGION.autoridadDatos}. Ningún perfil se carga sin el consentimiento de su titular.</p>
          <div className="pie__base tenue">
            <span>© {new Date().getFullYear()} {t.marca}. {MARCA.lema}{MARCA.contacto && <> · <a className="pie__link" href={`mailto:${MARCA.contacto}`}>{MARCA.contacto}</a></>}</span>
            <span className="mono">v0.1 · {auth.modo === 'firebase' ? `Firebase · ${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'sin proyecto'}` : 'modo demo'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
