export const TIPOS_LOGO = ['image/png', 'image/jpeg', 'image/webp'];
export const LOGO_MAX_ENTRADA = 5 * 1024 * 1024;

/**
 * Valida y achica la imagen antes de subirla: cuadrada, `lado` px como máximo, en PNG.
 * Así el archivo queda muy por debajo del límite de 2 MB de las reglas de Storage.
 */
export async function prepararLogo(archivo: File, lado = 512): Promise<Blob> {
  if (!TIPOS_LOGO.includes(archivo.type)) throw new Error('Subí una imagen PNG, JPG o WebP.');
  if (archivo.size > LOGO_MAX_ENTRADA) throw new Error('La imagen pesa más de 5 MB.');
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo procesar la imagen.'))), 'image/png'));
}

export const blobADataUrl = (b: Blob) => new Promise<string>((ok, mal) => {
  const lector = new FileReader();
  lector.onload = () => ok(lector.result as string);
  lector.onerror = () => mal(lector.error);
  lector.readAsDataURL(b);
});
