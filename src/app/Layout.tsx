import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useRepo } from '@/data/DataProvider';
import { MARCA } from '@/config/marca';
import { REGION } from '@/config/region';
import { t } from '@/i18n';
import { useToast } from '@/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';

const NAV = [
  { a: '/', texto: t.nav.inicio, fin: true },
  { a: '/red', texto: t.nav.red },
  { a: '/cotizaciones', texto: t.nav.cotizaciones },
  { a: '/valores', texto: t.nav.valores },
  { a: '/precios', texto: t.nav.precios },
  { a: '/planes', texto: t.nav.planes },
];

const iniciales = (empresa: string) => empresa.split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

export function Layout() {
  const { auth, cuenta } = useAuth();
  const { pathname } = useLocation();
  const repo = useRepo();
  const avisar = useToast();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera__in envoltura">
          <NavLink to="/" className="marca" aria-label={`${t.marca}, inicio`}>
            <img className="marca__logo" src={MARCA.logo} alt="" width={38} height={38} />
            <span className="marca__txt">{t.marca}<small>{t.bajada}</small></span>
          </NavLink>
          <nav className="nav" aria-label="Principal">
            {NAV.map((n) => <NavLink key={n.a} to={n.a} end={n.fin} className="nav__link">{n.texto}</NavLink>)}
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
                <NavLink to="/panel" className="btn btn--pri btn--chico cabecera__panel">{t.nav.panel}</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/ingresar" className="btn btn--sec btn--chico">Iniciar sesión</NavLink>
                <NavLink to="/ingresar?modo=registro" className="btn btn--pri btn--chico">Registrarme</NavLink>
              </>
            )}
          </div>
        </div>
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
      <main className="principal"><Outlet /></main>
      <footer className="pie">
        <div className="envoltura pie__in">
          <div>
            <p><strong>{t.marca}</strong> · {t.bajada} · {REGION.pais}</p>
            <p className="tenue">Datos personales tratados según la {REGION.leyDatos}. Base registrada ante la {REGION.autoridadDatos}. Ningún perfil se carga sin el consentimiento de su titular.</p>
          </div>
          <p className="tenue mono">v0.1 · datos guardados en este navegador</p>
        </div>
      </footer>
    </div>
  );
}
