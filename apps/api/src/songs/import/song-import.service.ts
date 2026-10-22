import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  createSongSchema,
  createSongVersionSchema,
  parseChordPro,
  type ChordProContent,
  type ImportChordProData,
  type ImportChordProResult,
} from '@harmonyhub/contracts';
import type { Prisma } from '@prisma/client';
import type { OrgMember } from '../../permissions/current-membership.decorator';
import { parseOrBadRequest } from '../../shared/zod.pipe';
import { SongsAccessService } from '../songs-access.service';
import { SongsService } from '../songs.service';
import { SongVersionsService } from '../versions/song-versions.service';

/** Estructura derivada del contenido (mismo formato que guarda el editor de la web). */
function structureOf(content: ChordProContent) {
  return {
    version: 1,
    order: content.sections.map((section) => section.id),
    sections: content.sections.map(({ id, type, name, order }) => ({ id, type, name, order })),
  };
}

const plain = (content: ChordProContent, field: 'lyrics' | 'chords') => content.sections.flatMap((section) => section.lines.map((line) => line[field])).join('\n');

/**
 * Importar ChordPro: la API vuelve a leer el texto con el mismo parser que uso la vista previa de la web y crea
 * una cancion nueva (con esa version como predeterminada) o una version nueva de una cancion existente.
 */
@Injectable()
export class SongImportService {
  constructor(
    @Inject(SongsService) private readonly songs: SongsService,
    @Inject(SongVersionsService) private readonly versions: SongVersionsService,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
  ) {}

  async importChordPro(member: OrgMember, data: ImportChordProData): Promise<ImportChordProResult> {
    const parsed = parseChordPro(data.text);
    if (parsed.content.sections.length === 0) throw new BadRequestException('No se encontro letra ni acordes en el texto');

    const { metadata, content } = parsed;
    const key = data.key || metadata.key;
    const notes = parsed.notes.length ? parsed.notes.join('\n') : null;
    const contentJson = content as unknown as Prisma.InputJsonValue;
    const structureJson = structureOf(content) as unknown as Prisma.InputJsonValue;

    if (data.songId) {
      const song = await this.access.assertSongDetailInOrganization(member.organizationId, data.songId);
      const version = parseOrBadRequest(createSongVersionSchema, {
        name: data.versionName || 'Importada de ChordPro',
        key: key || song.currentKey || 'C',
        bpm: metadata.tempo ?? null,
        lyrics: plain(content, 'lyrics'),
        chords: plain(content, 'chords'),
        contentJson: content,
        structureJson: structureOf(content),
        notes,
        isDefault: false,
      });
      const created = await this.versions.createVersion(member, song.id, version);
      return { song: { id: song.id, title: song.title }, version: { id: created.id, name: created.name }, warnings: parsed.warnings };
    }

    const title = data.title || metadata.title;
    const artist = data.artist || metadata.artist;
    if (!title) throw new BadRequestException('Falta el titulo de la cancion');
    if (!artist) throw new BadRequestException('Falta el artista de la cancion');
    const song = parseOrBadRequest(createSongSchema, {
      title,
      artist,
      album: metadata.album ?? null,
      year: metadata.year ?? null,
      originalKey: key || 'C',
      currentKey: key || 'C',
      bpm: metadata.tempo ?? null,
      timeSignature: metadata.time ?? null,
      lyrics: plain(content, 'lyrics'),
      chords: plain(content, 'chords'),
      notes,
    });
    const created = await this.songs.create(member, song, { contentJson, structureJson });
    const version = created.versions[0];
    return { song: { id: created.id, title: created.title }, version: { id: version.id, name: version.name }, warnings: parsed.warnings };
  }
}
