import type { MailSaliente } from '@/domain/types';

export type MailAEnviar = Pick<MailSaliente, 'para' | 'asunto' | 'html' | 'texto'>;

/** Puerto de envío. Cambiar de proveedor de mail es escribir otra implementación de esto. */
export interface MailSender {
  enviar(mail: MailAEnviar): Promise<{ id: string }>;
}

/** Para desarrollo: imprime el mail en la terminal en lugar de mandarlo. */
export class ConsolaMailSender implements MailSender {
  async enviar(m: MailAEnviar) {
    console.log(`\n── Mail para ${m.para.nombre} <${m.para.email}>\n   Asunto: ${m.asunto}\n\n${m.texto}\n`);
    return { id: `consola-${Date.now()}` };
  }
}

/** Envío real con Resend (https://resend.com). La clave vive solo en el servidor, nunca en el navegador. */
export class ResendMailSender implements MailSender {
  constructor(private apiKey: string, private remitente: string) {}

  async enviar(m: MailAEnviar) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.remitente, to: [m.para.email], subject: m.asunto, html: m.html, text: m.texto }),
    });
    if (!r.ok) throw new Error(`Resend respondió ${r.status}: ${await r.text()}`);
    return (await r.json()) as { id: string };
  }
}

export function crearMailSender(env: Record<string, string | undefined> = process.env): MailSender {
  if (env.MAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new Error('Faltan RESEND_API_KEY o MAIL_FROM en el entorno.');
    return new ResendMailSender(env.RESEND_API_KEY, env.MAIL_FROM);
  }
  return new ConsolaMailSender();
}
