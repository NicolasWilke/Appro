import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useRepo } from '@/data/DataProvider';
import { MOTIVO_MAX, MOTIVO_MIN, cupoRestante } from '@/domain/reglas';
import type { Comprador, Proveedor } from '@/domain/types';
import { Modal } from '@/ui/Modal';
import { useToast } from '@/ui/Toast';

export function PedirContacto({ comprador, proveedorId, onCerrar }: { comprador: Comprador; proveedorId: string; onCerrar: () => void }) {
  const repo = useRepo();
  const avisar = useToast();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { data } = useQuery(async (r) => ({ yo: (await r.obtenerPersona(proveedorId)) as Proveedor, uso: await r.uso(proveedorId) }), [proveedorId]);
  const restante = data ? cupoRestante(data.yo.plan, data.uso).solicitudes : null;
  const nombre = comprador.semiAnonimo ? `${comprador.cargo} de ${comprador.empresa}` : `${comprador.nombre} ${comprador.apellido}`;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await repo.enviarSolicitud(proveedorId, comprador.id, motivo);
      avisar(`Solicitud enviada. ${comprador.semiAnonimo ? 'La persona' : comprador.nombre} la ve en su resumen y responde con un toque.`);
      onCerrar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={`Pedir contacto a ${nombre}`} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="form">
        <p className="tenue">Contá qué ofrecés y por qué encaja con lo que está comprando. Si acepta, se liberan mail, teléfono y agenda.</p>
        <label className="campo" htmlFor="motivo">
          <span>Motivo</span>
          <textarea id="motivo" rows={5} maxLength={MOTIVO_MAX} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej.: Tenemos 40 posiciones a −18 °C a 12 km de su planta y trabajamos con dos alimenticias del Litoral." />
          <span className={`contador mono ${motivo.trim().length < MOTIVO_MIN ? 'is-bajo' : ''}`}>{motivo.length}/{MOTIVO_MAX}</span>
        </label>
        <p className="nota">Acepta: <strong>{comprador.acepta}</strong>. No acepta: <strong>{comprador.noAcepta}</strong>.</p>
        {restante !== null && (
          <p className="nota">Te quedan <strong>{restante}</strong> solicitudes este mes. {restante <= 2 && <Link to="/planes" onClick={onCerrar}>Ver planes con más cupo</Link>}</p>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form__acciones">
          <button type="button" className="btn btn--ter" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn--pri" disabled={enviando || motivo.trim().length < MOTIVO_MIN}>Enviar solicitud</button>
        </div>
      </form>
    </Modal>
  );
}
