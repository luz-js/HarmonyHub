import { Logger } from '@nestjs/common';
import type { Readable } from 'node:stream';
import type { StoredTrackFile, TrackStorageProvider } from './track-storage.interface';
import { buildStorageKey } from './storage-path';

export type S3StorageConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  /** Prefijo opcional dentro del bucket (p.ej. "tracks"). */
  prefix?: string;
};

/**
 * Proveedor de almacenamiento compatible con S3 (AWS S3, Cloudflare R2 y
 * Supabase Storage exponen la misma API). El SDK de AWS se carga de forma
 * perezosa mediante import dinamico, de modo que el proyecto compila y arranca
 * aunque la dependencia no este instalada (por ejemplo, cuando solo se usa el
 * proveedor local). Solo se requiere `@aws-sdk/client-s3` cuando este proveedor
 * se activa y se realiza la primera operacion.
 */
export class S3TrackStorageService implements TrackStorageProvider {
  readonly name = 's3';
  private readonly logger = new Logger(S3TrackStorageService.name);
  private clientPromise: Promise<any> | null = null;
  private sdkPromise: Promise<any> | null = null;

  constructor(private readonly config: S3StorageConfig) {}

  private async loadSdk() {
    if (!this.sdkPromise) {
      // Specifier en variable para que el typecheck/build no exija el modulo.
      const specifier = '@aws-sdk/client-s3';
      this.sdkPromise = import(specifier).catch((error: any) => {
        this.sdkPromise = null;
        throw new Error(
          `El proveedor de storage S3 requiere la dependencia "@aws-sdk/client-s3". Instalala o cambia TRACK_STORAGE_DRIVER a "local". Detalle: ${error?.message || error}`,
        );
      });
    }
    return this.sdkPromise;
  }

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const sdk = await this.loadSdk();
        return new sdk.S3Client({
          region: this.config.region,
          ...(this.config.endpoint ? { endpoint: this.config.endpoint } : {}),
          forcePathStyle: this.config.forcePathStyle,
          credentials: {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
          },
        });
      })();
    }
    return this.clientPromise;
  }

  private objectKey(storageKey: string) {
    return this.config.prefix ? `${this.config.prefix.replace(/\/+$/, '')}/${storageKey}` : storageKey;
  }

  async upload(buffer: Buffer, relativeSegments: string[], filename: string, mimeType?: string): Promise<StoredTrackFile> {
    const storageKey = buildStorageKey(relativeSegments, filename);
    const sdk = await this.loadSdk();
    const client = await this.client();
    await client.send(
      new sdk.PutObjectCommand({
        Bucket: this.config.bucket,
        Key: this.objectKey(storageKey),
        Body: buffer,
        ...(mimeType ? { ContentType: mimeType } : {}),
      }),
    );
    return { storageKey };
  }

  async exists(storageKey: string) {
    const sdk = await this.loadSdk();
    const client = await this.client();
    try {
      await client.send(new sdk.HeadObjectCommand({ Bucket: this.config.bucket, Key: this.objectKey(storageKey) }));
      return true;
    } catch (error: any) {
      if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') {
        return false;
      }
      this.logger.warn(`No se pudo comprobar la existencia de ${storageKey}: ${error?.name || error}`);
      return false;
    }
  }

  async createReadStream(storageKey: string): Promise<Readable> {
    const sdk = await this.loadSdk();
    const client = await this.client();
    const response = await client.send(new sdk.GetObjectCommand({ Bucket: this.config.bucket, Key: this.objectKey(storageKey) }));
    return response.Body as Readable;
  }

  async delete(storageKey: string) {
    try {
      const sdk = await this.loadSdk();
      const client = await this.client();
      await client.send(new sdk.DeleteObjectCommand({ Bucket: this.config.bucket, Key: this.objectKey(storageKey) }));
    } catch (error: any) {
      this.logger.warn(`No se pudo eliminar ${storageKey} en S3: ${error?.name || error}`);
    }
  }
}
