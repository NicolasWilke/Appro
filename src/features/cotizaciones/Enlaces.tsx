import { useState } from 'react';
import { ENLACES_MAX, urlValida } from '@/domain/rfq';
import type { Enlace } from '@/domain/types';

/** Archivos compartidos como enlace: el plan gratuito de Firebase no guarda archivos. */
export function EditorEnlaces({ valor, onCambio, id, ayuda }: { valor: Enlace[]; onCambio: (v: Enlace[]) => void; id: string; ayuda: string }) {
  const [nombre, setNombre] = useState('');
  const [url, setUrl] = useState('');
  const valido = nombre.trim().length > 0 && urlValida(url);
  const sumar = () => {
    if (!valido) return;
    onCambio([...valor, { nombre: nombre.trim(), url: url.trim() }]);
    setNombre(''); setUrl('');
  };
  return (
    <fieldset className="campo">
      <legend>Archivos como enlace (opcional)</legend>
      <span className="tenue">{ayuda}</span>
      {valor.length > 0 && <ListaEnlaces enlaces={valor} onQuitar={(i) => onCambio(valor.filter((_, n) => n !== i))} />}
      {valor.length < ENLACES_MAX && (
        <div className="enlaces__nuevo">
          <input aria-label="Nombre del archivo" id={`${id}-nombre`} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Plano de planta" />
          <input aria-label="Enlace" id={`${id}-url`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sumar(); } }} />
          <button type="button" className="btn btn--sec btn--chico" disabled={!valido} onClick={sumar}>Agregar</button>
        </div>
      )}
      {url && !urlValida(url) && <span className="error">El enlace tiene que empezar con https://</span>}
    </fieldset>
  );
}

export function ListaEnlaces({ enlaces, onQuitar }: { enlaces: Enlace[]; onQuitar?: (i: number) => void }) {
  return (
    <ul className="enlaces">
      {enlaces.map((e, i) => (
        <li key={`${e.url}-${i}`}>
          <a href={e.url} target="_blank" rel="noopener noreferrer">{e.nombre}</a>
          {onQuitar && <button type="button" className="enlace" onClick={() => onQuitar(i)} aria-label={`Quitar ${e.nombre}`}>Quitar</button>}
        </li>
      ))}
    </ul>
  );
}
