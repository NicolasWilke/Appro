// Convierte el HTML autocontenido de `vite build --mode artifact` en el
// fragmento que publica el visor de Artifacts (sin doctype/html/head/body).
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-artifact/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const keep = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
// Los scripts de módulo se mueven al final para que #root exista al ejecutarse.
const scripts = [];
const resto = keep.replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/g, (m) => { scripts.push(m); return ''; });
writeFileSync('dist-artifact/appro.html', `${resto.trim()}\n${body.trim()}\n${scripts.join('\n')}\n`);
console.log('dist-artifact/appro.html', (readFileSync('dist-artifact/appro.html').length / 1024).toFixed(0), 'KB');
