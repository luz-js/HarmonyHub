import { Injectable, Logger } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { access, mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { StoredTrackFile, TrackStorageProvider } from './storage/track-storage.interface';
import { buildStorageKey, resolveWithinRoot } from './storage/storage-path';

/**
 * Proveedor de almacenamiento local en filesystem. Es el fallback por defecto
 * cuando no hay credenciales de un object store configuradas.
 */
@Injectable()
export class LocalTrackStorageService implements TrackStorageProvider {
  readonly name = 'local';
  private readonly logger = new Logger(LocalTrackStorageService.name);
  private readonly root: string;

  constructor() {
    const configured = process.env.TRACK_STORAGE_LOCAL_ROOT?.trim();
    this.root = configured
      ? isAbsolute(configured)
        ? configured
        : resolve(process.cwd(), configured)
      : resolve(process.cwd(), 'var', 'tracks');
  }

  async upload(buffer: Buffer, relativeSegments: string[], filename: string): Promise<StoredTrackFile> {
    const storageKey = buildStorageKey(relativeSegments, filename);
    const absolutePath = resolveWithinRoot(this.root, storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return { storageKey };
  }

  private resolvePath(storageKey: string) {
    return resolveWithinRoot(this.root, storageKey);
  }

  async exists(storageKey: string) {
    try {
      await access(this.resolvePath(storageKey));
      return true;
    } catch {
      return false;
    }
  }

  createReadStream(storageKey: string) {
    return createReadStream(this.resolvePath(storageKey));
  }

  async delete(storageKey: string) {
    const absolutePath = this.resolvePath(storageKey);
    try {
      await unlink(absolutePath);
      await rm(dirname(absolutePath), { recursive: false });
    } catch (error: any) {
      if (error?.code && !['ENOENT', 'ENOTEMPTY'].includes(error.code)) {
        this.logger.warn(`No se pudo eliminar ${storageKey}: ${error.code}`);
      }
    }
  }
}
