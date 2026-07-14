import { Logger } from '@nestjs/common';
import { LocalTrackStorageService } from '../local-track-storage.service';
import { S3StorageConfig, S3TrackStorageService } from './s3-track-storage.service';
import type { TrackStorageProvider } from './track-storage.interface';

const S3_DRIVERS = new Set(['s3', 'r2', 'supabase']);

function readBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/**
 * Lee la configuracion S3-compatible desde variables de entorno. Devuelve null
 * si faltan credenciales/datos obligatorios, para poder caer al proveedor local.
 */
export function readS3Config(): S3StorageConfig | null {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !region || !accessKeyId || !secretAccessKey) return null;

  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const prefix = process.env.S3_PREFIX?.trim() || undefined;

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: readBoolean(process.env.S3_FORCE_PATH_STYLE, Boolean(endpoint)),
    prefix,
  };
}

/**
 * Selecciona el proveedor de almacenamiento de pistas segun `TRACK_STORAGE_DRIVER`.
 * - `local` (por defecto): filesystem local.
 * - `s3` | `r2` | `supabase`: object store compatible con S3.
 *
 * Si se solicita un driver S3 pero faltan credenciales, se registra una
 * advertencia y se usa el proveedor local como fallback (arquitectura lista,
 * sin exponer secretos ni romper el arranque).
 */
export function createTrackStorageProvider(logger: Logger = new Logger('TrackStorage')): TrackStorageProvider {
  const driver = (process.env.TRACK_STORAGE_DRIVER || 'local').trim().toLowerCase();

  if (S3_DRIVERS.has(driver)) {
    const config = readS3Config();
    if (config) {
      logger.log(`Storage de pistas: proveedor "${driver}" (bucket=${config.bucket}${config.endpoint ? `, endpoint=${config.endpoint}` : ''})`);
      return new S3TrackStorageService(config);
    }
    logger.warn(`TRACK_STORAGE_DRIVER="${driver}" pero faltan variables S3 obligatorias; usando storage local como fallback.`);
  } else if (driver !== 'local') {
    logger.warn(`TRACK_STORAGE_DRIVER="${driver}" desconocido; usando storage local.`);
  }

  logger.log('Storage de pistas: proveedor local');
  return new LocalTrackStorageService();
}
