/** Descarga un archivo generado en el navegador (ChordPro, calendario...). */
export function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/** "Sublime Gracia (en vivo)" -> "sublime-gracia-en-vivo" (sin tildes ni simbolos, para nombres de archivo). */
export function fileSlug(value: string, fallback = 'archivo') {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return slug || fallback;
}
