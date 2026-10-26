import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { REGION } from '@/config/region';
import { region, rubro } from '@/domain/catalogos';
import type { Comprador } from '@/domain/types';
import { fmt } from '@/i18n';
import { Avatar, Chip, Pill, Sello } from '@/ui/primitivas';

export const ventanaAbierta = (c: Comprador) => !!c.ventanaHasta && fmt.diasHasta(c.ventanaHasta) >= 0;

/** La pieza central de la marca: el comprador con nombre, apellido y qué está comprando. */
export function FichaComprador({ c, nombreVisible = !c.semiAnonimo, accion, conSello = false, enlace = true }: {
  c: Comprador; nombreVisible?: boolean; accion?: ReactNode; conSello?: boolean; enlace?: boolean;
}) {
  const nombre = nombreVisible ? `${c.nombre} ${c.apellido}` : 'Nombre visible al aceptar';
  const abierta = ventanaAbierta(c);
  return (
    <article className="ficha">
      <div className="ficha__tira mono">
        <span>Ficha de comprador</span>
        <span>{REGION.idFiscal.nombre} {c.verificaciones.idFiscal ? 'verificado' : 'sin verificar'}</span>
      </div>
      {conSello && <Sello className="ficha__sello">Verificado<br />{REGION.autoridadFiscal}</Sello>}
      <div className="ficha__cab">
        <Avatar p={c} oculto={!nombreVisible} grande />
        <div className="ficha__id">
          <h3 className={nombreVisible ? '' : 'is-oculto'}>
            {enlace ? <Link to={`/red/${c.id}`}>{nombre}</Link> : nombre}
          </h3>
          <p>{c.cargo} · {c.empresa}</p>
          <p className="tenue">{c.ciudad || region(c.region).nombre}</p>
        </div>
      </div>
      <ul className="ficha__checks">
        <li>{REGION.idFiscal.nombre} de la empresa validado en {REGION.autoridadFiscal}</li>
        <li>Mail corporativo verificado</li>
      </ul>
      <div className="ficha__rubros">{c.rubros.map((r) => <Chip key={r}>{rubro(r).nombre}</Chip>)}</div>
      <div className={`ficha__ventana ${abierta ? 'is-abierta' : ''}`}>
        <div>
          <span className="etq">Ventana de compra</span>
          <strong>{abierta && c.ventanaHasta ? `Abierta hasta ${fmt.fecha(c.ventanaHasta)}` : 'Sin compras en curso'}</strong>
          {c.foco && <span className="tenue">{c.foco}</span>}
        </div>
        {accion}
      </div>
      <dl className="ficha__reglas">
        <div><dt>Acepta</dt><dd>{c.acepta}</dd></div>
        <div><dt>No acepta</dt><dd>{c.noAcepta}</dd></div>
        {c.tasaRespuesta > 0 && <div><dt>Responde</dt><dd><Pill tono={c.tasaRespuesta >= 70 ? 'ok' : 'neutro'}>{c.tasaRespuesta}% de las solicitudes</Pill></dd></div>}
      </dl>
    </article>
  );
}
