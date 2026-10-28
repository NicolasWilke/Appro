// npm run mail:prueba
// Sin configuración imprime los mails en la terminal. Con MAIL_PROVIDER=resend,
// RESEND_API_KEY, MAIL_FROM y MAIL_PRUEBA_A los manda de verdad, todos a MAIL_PRUEBA_A.
import { compradores, pedidos, proveedores } from '@/data/mock/seed';
import { crearMailSender } from './mail/MailSender';
import { notificarPedidoPublicado } from './notificarPedido';

const destino = process.env.MAIL_PRUEBA_A;
if (process.env.MAIL_PROVIDER === 'resend' && !destino) {
  console.error('Definí MAIL_PRUEBA_A con tu propio mail para no escribirle a las direcciones ficticias de la demo.');
  process.exit(1);
}

const pedido = pedidos.find((p) => p.id === 'PC-2611')!;
const comprador = compradores.find((c) => c.id === pedido.compradorId)!;
const destinatarios = proveedores.map((p) => (destino ? { ...p, contacto: { ...p.contacto, email: destino } } : p));

const r = await notificarPedidoPublicado({
  pedido, comprador, proveedores: destinatarios,
  mail: crearMailSender(),
  cola: { encolar: async (prov, ped) => console.log(`(en cola para el resumen diario: ${prov} · ${ped})`) },
  urlPublica: process.env.PUBLIC_URL ?? 'http://localhost:5173',
});
console.log(r);
