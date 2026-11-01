import { useSyncExternalStore } from 'react';

/**
 * App instalable (PWA): registra el service worker y guarda el pedido de instalación del navegador.
 * - Chrome/Edge (Android y PC) avisan con `beforeinstallprompt`: lo guardamos y lo disparamos desde nuestro botón.
 * - iPhone/iPad no tienen ese evento: solo se instala con Compartir → "Agregar a inicio", así que mostramos los pasos.
 */
type PedidoInstalacion = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export type Instalacion = {
  /** 'nativo': el navegador puede instalar con un toque. 'ios': hay que hacerlo a mano. null: no corresponde (ya instalada, demo, etc.). */
  modo: 'nativo' | 'ios' | null;
  /** El aviso se cerró hace poco (se respeta 30 días). */
  cerrado: boolean;
};

const CLAVE_CIERRE = 'proveo:instalar-cerrado';
const DIAS_SILENCIO = 30;

let pedido: PedidoInstalacion | null = null;
let estado: Instalacion = { modo: null, cerrado: leerCierre() };
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());
const cambiar = (parcial: Partial<Instalacion>) => { estado = { ...estado, ...parcial }; avisar(); };

function leerCierre(): boolean {
  try {
    const t = Number(localStorage.getItem(CLAVE_CIERRE));
    return !!t && Date.now() - t < DIAS_SILENCIO * 864e5;
  } catch { return false; }
}

export function yaInstalada(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function esIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** Se llama una vez al arrancar, antes de React, para no perder el evento del navegador. */
export function prepararInstalacion() {
  if (import.meta.env.VITE_ROUTER === 'memory' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* sin SW la app anda igual */ }); });
  }
  if (yaInstalada()) return;
  if (esIOS()) estado = { ...estado, modo: 'ios' };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pedido = e as PedidoInstalacion;
    cambiar({ modo: 'nativo' });
  });
  window.addEventListener('appinstalled', () => { pedido = null; cambiar({ modo: null }); });
}

/** Abre el diálogo del navegador. Devuelve true si la persona aceptó. */
export async function instalar(): Promise<boolean> {
  if (!pedido) return false;
  const p = pedido;
  pedido = null;
  await p.prompt();
  const { outcome } = await p.userChoice;
  if (outcome === 'accepted') cambiar({ modo: null });
  else cambiar({ modo: null, cerrado: true }); // Chrome no deja volver a usar el mismo pedido
  return outcome === 'accepted';
}

export function cerrarAviso() {
  try { localStorage.setItem(CLAVE_CIERRE, String(Date.now())); } catch { /* sin persistencia */ }
  cambiar({ cerrado: true });
}

/** Vuelve a mostrar el aviso (desde el pie: "Instalar la app"). */
export function reabrirAviso() {
  try { localStorage.removeItem(CLAVE_CIERRE); } catch { /* nada */ }
  cambiar({ cerrado: false });
}

export function useInstalacion(): Instalacion {
  return useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, () => estado);
}
