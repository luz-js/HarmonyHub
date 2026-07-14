import { extname } from 'node:path';
import { FileType } from '@prisma/client';

/**
 * Validacion de MIME/extension/tamaño para archivos de SongFile (partituras,
 * charts, letras, imagenes, documentos, MIDI/MusicXML). No incluye audio:
 * el audio musical reproducible pertenece a SongTrack (Fase 4).
 */

export class UnsupportedFileTypeError extends Error {}
export class AudioNotAllowedFileError extends Error {}
export class FileTooLargeError extends Error {}

const PDF_MIME_TYPES = new Set(['application/pdf']);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const DOCUMENT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
]);

const PRESENTATION_MIME_TYPES = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const MIDI_MUSICXML_MIME_TYPES = new Set([
  'audio/midi',
  'audio/x-midi',
  'application/vnd.recordare.musicxml+xml',
  'application/vnd.recordare.musicxml',
  'application/xml',
  'text/xml',
]);

const ALLOWED_MIME_TYPES = new Set([
  ...PDF_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
  ...PRESENTATION_MIME_TYPES,
  ...MIDI_MUSICXML_MIME_TYPES,
]);

/** Mimetypes de audio comunes: si el usuario intenta subirlos como SongFile, se redirige a Pistas. */
const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/webm',
]);

const BLOCKED_EXTENSIONS = new Set(['.exe', '.bat', '.cmd', '.ps1', '.sh', '.js', '.mjs', '.cjs', '.html', '.htm', '.svg']);

export function maxSongFileUploadBytes() {
  const mb = Number(process.env.MAX_SONG_FILE_UPLOAD_MB || 25);
  return Math.max(1, Number.isFinite(mb) ? mb : 25) * 1024 * 1024;
}

export function validateSongFileUpload(file: { mimetype?: string; size?: number; originalname?: string }) {
  const mimeType = (file.mimetype || '').toLowerCase();
  const extension = extname(file.originalname || '').toLowerCase();

  if (BLOCKED_EXTENSIONS.has(extension)) {
    throw new UnsupportedFileTypeError('Este tipo de archivo no esta permitido');
  }

  if (AUDIO_MIME_TYPES.has(mimeType)) {
    throw new AudioNotAllowedFileError('El audio musical se sube desde la sección Pistas, no como archivo');
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new UnsupportedFileTypeError('Tipo de archivo no soportado');
  }

  const maxBytes = maxSongFileUploadBytes();
  if ((file.size || 0) > maxBytes) {
    throw new FileTooLargeError(`El archivo supera el limite de ${Math.round(maxBytes / 1024 / 1024)} MB`);
  }
}

/** Clasificacion fisica generica para File.type (la semantica musical detallada vive en SongFile.category). */
export function mapMimeTypeToFileType(mimeType: string): FileType {
  const normalized = mimeType.toLowerCase();
  if (PDF_MIME_TYPES.has(normalized)) return 'PDF';
  if (IMAGE_MIME_TYPES.has(normalized)) return 'IMAGE';
  if (DOCUMENT_MIME_TYPES.has(normalized) || PRESENTATION_MIME_TYPES.has(normalized)) return 'DOCUMENT';
  if (MIDI_MUSICXML_MIME_TYPES.has(normalized)) return 'OTHER';
  return 'OTHER';
}
