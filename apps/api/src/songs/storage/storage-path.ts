import { extname, join, normalize, resolve } from 'node:path';

/**
 * Normaliza un segmento de ruta (organizacion, cancion, version, pista, etc.)
 * para que sea seguro tanto en un filesystem local como en un object store.
 */
export function sanitizeSegment(value: string) {
  return (
    value
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'track'
  );
}

/**
 * Construye la clave logica de almacenamiento a partir de segmentos jerarquicos
 * (organizacion/cancion/version/pista) mas el nombre de archivo. La clave usa
 * siempre separadores "/" para ser identica en local, S3, R2 o Supabase.
 */
export function buildStorageKey(relativeSegments: string[], filename: string) {
  const safeSegments = relativeSegments.map(sanitizeSegment);
  const extension = extname(filename).toLowerCase();
  const base = sanitizeSegment(filename.slice(0, filename.length - extname(filename).length));
  const safeFilename = `${base}${extension}`;
  return join(...safeSegments, safeFilename).replace(/\\/g, '/');
}

/**
 * Verifica que una ruta absoluta calculada permanezca dentro del root permitido
 * (defensa contra path traversal en el proveedor local).
 */
export function ensureWithinRoot(root: string, target: string) {
  const normalizedRoot = normalize(root);
  const normalizedTarget = normalize(target);
  if (!normalizedTarget.startsWith(normalizedRoot)) {
    throw new Error('Ruta de storage invalida');
  }
}

export function resolveWithinRoot(root: string, storageKey: string) {
  const absolutePath = resolve(root, storageKey);
  ensureWithinRoot(root, absolutePath);
  return absolutePath;
}
