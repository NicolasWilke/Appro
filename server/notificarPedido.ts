import { mailDePedido, planDeAvisos } from '@/domain/notificaciones';
import type { Comprador, PedidoCotizacion, Proveedor } from '@/domain/types';
import type { MailSender } from './mail/MailSender';

export interface ColaResumen {
  /** Guarda el pedido para el resumen diario del proveedor (tabla en la base, leída por un cron a las 8:00). */
  encolar(proveedorId: string, pedidoId: string): Promise<void>;
}

/**
 * Se llama después de guardar un pedido nuevo. En producción conviene correrlo
 * en una cola de trabajos (para reintentos) y no dentro del request del comprador.
 */
export async function notificarPedidoPublicado(args: {
  pedido: PedidoCotizacion;
  comprador: Comprador;
  proveedores: Proveedor[];
  mail: MailSender;
  cola: ColaResumen;
  urlPublica: string;
}) {
  const { inmediatos, diarios } = planDeAvisos(args.pedido, args.proveedores);
  const resultados = await Promise.allSettled(
    inmediatos.map((prov) =>
      args.mail.enviar({
        para: { nombre: `${prov.nombre} ${prov.apellido}`, email: prov.contacto.email },
        ...mailDePedido(args.pedido, args.comprador, prov, args.urlPublica),
      }),
    ),
  );
  await Promise.all(diarios.map((prov) => args.cola.encolar(prov.id, args.pedido.id)));
  const fallidos = resultados.filter((r) => r.status === 'rejected').length;
  return { enviados: inmediatos.length - fallidos, fallidos, enCola: diarios.length };
}
