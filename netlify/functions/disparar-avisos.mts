// Dispara el workflow "Avisos por mail" de GitHub cada 30 minutos.
// El horario propio de GitHub (schedule) es poco confiable en repos con poca actividad: a veces pasa horas sin correr.
// Netlify sí respeta el horario, así que desde acá le pedimos a GitHub que corra el workflow.
//
// Variables en Netlify (Site configuration → Environment variables), solo en el sitio de producción:
//   AVISOS_GITHUB_TOKEN  token de GitHub con permiso "Actions: Read and write" sobre el repositorio
//   AVISOS_REPO          opcional, por defecto NicolasWilke/Proveo
// Sin AVISOS_GITHUB_TOKEN no hace nada, así los otros sitios que compilan este repo no disparan avisos duplicados.

export default async () => {
  // Se limpia lo que suele colarse al pegar: espacios, saltos de línea, comillas o un "Bearer " delante.
  const token = (process.env.AVISOS_GITHUB_TOKEN ?? '')
    .trim()
    .replace(/^bearer\s+/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
  if (!token) return new Response('Sin AVISOS_GITHUB_TOKEN: no se dispara nada.');

  // El repositorio se llamaba Appro y ahora es Proveo.
  const repo = process.env.AVISOS_REPO?.trim() || 'NicolasWilke/Proveo';
  const ahora = new Date();
  // El resumen diario sale en la corrida de las 8:00 de Argentina (11:00 UTC).
  const resumen = ahora.getUTCHours() === 11 && ahora.getUTCMinutes() < 30;

  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/avisos.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'proveo-avisos',
    },
    body: JSON.stringify({ ref: 'main', inputs: { resumen: String(resumen) } }),
  });
  if (!r.ok) {
    const pista =
      r.status === 401
        ? ' El token no es válido: creá uno nuevo y cargalo en AVISOS_GITHUB_TOKEN.'
        : r.status === 403 || r.status === 404
          ? ` El token no tiene permiso "Actions: Read and write" sobre ${repo}.`
          : '';
    const detalle = `GitHub respondió ${r.status}.${pista} ${await r.text()}`;
    console.error(detalle);
    return new Response(detalle, { status: 502 });
  }
  console.log(`Avisos disparados${resumen ? ' (resumen diario)' : ''}.`);
  return new Response('ok');
};

export const config = { schedule: '*/30 * * * *' };
