import type { Readable } from 'node:stream';

/**
 * Token de inyeccion para el proveedor de almacenamiento de pistas.
 * El proveedor concreto (local, S3, R2, Supabase) se resuelve en tiempo de
 * arranque a partir de variables de entorno, sin acoplar el servicio a una
 * implementacion especifica.
 */
export const TRACK_STORAGE = Symbol('TRACK_STORAGE');

export type StoredTrackFile = {
  /** Clave logica dentro del proveedor (organizacion/cancion/version/pista/archivo). */
  storageKey: string;
};

/**
 * Contrato minimo que debe cumplir cualquier backend de almacenamiento de
 * pistas para mantener compatibilidad con el flujo actual de upload/stream/download.
 */
export interface TrackStorageProvider {
  /** Identificador del proveedor activo, util para logs/diagnostico. */
  readonly name: string;

  /** Sube un binario y devuelve su clave logica de almacenamiento. */
  upload(buffer: Buffer, relativeSegments: string[], filename: string, mimeType?: string): Promise<StoredTrackFile>;

  /** Indica si existe un objeto para la clave dada. */
  exists(storageKey: string): Promise<boolean>;

  /** Devuelve un stream de lectura del objeto (para stream/download). */
  createReadStream(storageKey: string): Readable | Promise<Readable>;

  /** Elimina el objeto asociado a la clave (idempotente). */
  delete(storageKey: string): Promise<void>;
}
