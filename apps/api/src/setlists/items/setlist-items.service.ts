import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { clean } from '../../shared/object.utils';
import { mapSetlistItemDetail } from '../setlist.mapper';
import { SetlistsAccessService } from '../setlists-access.service';
import { assertReorderPayloadValid, computeInsertOrder, normalizeSetlistItemInput } from '../setlist.utils';
import { SetlistsRepository } from '../setlists.repository';
import { SetlistItemsRepository } from './setlist-items.repository';

const SETLIST_ITEM_TYPES = ['SONG', 'SPEAKING', 'PRAYER', 'VIDEO', 'ANNOUNCEMENT', 'SILENCE', 'TRANSITION', 'BREAK', 'CUSTOM'] as const;

const itemFieldsSchema = z.object({
  type: z.enum(SETLIST_ITEM_TYPES).optional(),
  songId: z.string().trim().min(1).optional().nullable(),
  songVersionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  estimatedSec: z.coerce.number().int().min(0).optional().nullable(),
  keyOverride: z.string().trim().min(1).max(10).optional().nullable(),
  bpmOverride: z.coerce.number().int().min(20).max(300).optional().nullable(),
  durationOverrideSec: z.coerce.number().int().min(0).optional().nullable(),
  capo: z.coerce.number().int().min(0).max(12).optional().nullable(),
  transitionNote: z.string().trim().max(2000).optional().nullable(),
  internalNote: z.string().trim().max(5000).optional().nullable(),
  includeClick: z.boolean().optional(),
  includePad: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  isHidden: z.boolean().optional(),
});

const createItemSchema = itemFieldsSchema
  .extend({ type: z.enum(SETLIST_ITEM_TYPES).default('SONG'), insertIndex: z.coerce.number().int().min(0).optional().nullable() })
  .refine((data) => data.type !== 'SONG' || (Boolean(data.songId) && Boolean(data.songVersionId)), {
    message: 'songId y songVersionId son requeridos para items de tipo SONG',
    path: ['songVersionId'],
  })
  .refine((data) => data.type === 'SONG' || Boolean(data.title && data.title.trim()), {
    message: 'title es requerido para items no musicales',
    path: ['title'],
  });

const updateItemSchema = itemFieldsSchema;

const reorderSchema = z.object({ itemIds: z.array(z.string().trim().min(1)).min(1) });

@Injectable()
export class SetlistItemsService {
  constructor(
    @Inject(SetlistItemsRepository) private readonly itemsRepository: SetlistItemsRepository,
    @Inject(SetlistsRepository) private readonly setlistsRepository: SetlistsRepository,
    @Inject(SetlistsAccessService) private readonly access: SetlistsAccessService,
  ) {}

  async list(userId: string, organizationId: string, setlistId: string) {
    await this.access.assertViewSetlists(userId, organizationId);
    await this.access.assertSetlistInOrg(organizationId, setlistId);
    const items = await this.itemsRepository.listItems(setlistId);
    return items.map(mapSetlistItemDetail);
  }

  async get(userId: string, organizationId: string, setlistId: string, itemId: string) {
    await this.access.assertViewSetlists(userId, organizationId);
    await this.access.assertSetlistInOrg(organizationId, setlistId);
    const item = await this.itemsRepository.findItem(setlistId, itemId);
    if (!item) throw new NotFoundException('Item no encontrado');
    return mapSetlistItemDetail(item);
  }

  async create(userId: string, organizationId: string, setlistId: string, body: Record<string, unknown>) {
    await this.access.assertManageSetlists(userId, organizationId);
    await this.access.assertSetlistInOrg(organizationId, setlistId);

    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const data = parsed.data;

    let songId: string | null = null;
    let songVersionId: string | null = null;
    let title = data.title?.trim() || null;
    let estimatedSec = data.estimatedSec ?? null;

    if (data.type === 'SONG') {
      const song = await this.itemsRepository.findSongForValidation(data.songId!, organizationId);
      if (!song) throw new BadRequestException('La cancion no existe en esta organizacion');
      const version = await this.itemsRepository.findVersionForValidation(data.songId!, data.songVersionId!);
      if (!version) throw new BadRequestException('La version indicada no pertenece a esta cancion');

      songId = song.id;
      songVersionId = version.id;
      title = title || song.title;
      if (estimatedSec === null && data.durationOverrideSec == null) estimatedSec = version.durationSec ?? null;
    }

    const order = await this.itemsRepository.countItems(setlistId);
    const created = await this.itemsRepository.createItem(
      normalizeSetlistItemInput(data.type, {
        setlistId,
        type: data.type,
        songId,
        songVersionId,
        title: title || 'Item',
        description: data.description ?? null,
        order,
        estimatedSec,
        keyOverride: data.keyOverride ?? null,
        bpmOverride: data.bpmOverride ?? null,
        durationOverrideSec: data.durationOverrideSec ?? null,
        capo: data.capo ?? null,
        transitionNote: data.transitionNote ?? null,
        internalNote: data.internalNote ?? null,
        includeClick: data.includeClick ?? false,
        includePad: data.includePad ?? false,
        isOptional: data.isOptional ?? false,
        isHidden: data.isHidden ?? false,
      }),
    );

    await this.setlistsRepository.recalculateStats(setlistId);

    if (data.insertIndex != null) {
      const currentIds = (await this.itemsRepository.listItems(setlistId)).map((item) => item.id);
      const orderedIds = computeInsertOrder(currentIds, created.id, data.insertIndex);
      await this.itemsRepository.reorder(setlistId, orderedIds);
      const positioned = await this.itemsRepository.findItem(setlistId, created.id);
      return mapSetlistItemDetail(positioned!);
    }

    return mapSetlistItemDetail(created);
  }

  async update(userId: string, organizationId: string, setlistId: string, itemId: string, body: Record<string, unknown>) {
    await this.access.assertManageSetlists(userId, organizationId);
    await this.access.assertSetlistInOrg(organizationId, setlistId);

    const existing = await this.itemsRepository.findItem(setlistId, itemId);
    if (!existing) throw new NotFoundException('Item no encontrado');

    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const data = parsed.data;
    const nextType = data.type || existing.type;

    let songId = existing.songId;
    let songVersionId = existing.songVersionId;

    if (nextType === 'SONG') {
      const targetSongId = data.songId ?? existing.songId;
      const targetVersionId = data.songVersionId ?? existing.songVersionId;
      if (!targetSongId || !targetVersionId) throw new BadRequestException('songId y songVersionId son requeridos para items de tipo SONG');

      if (data.songId || data.songVersionId) {
        const song = await this.itemsRepository.findSongForValidation(targetSongId, organizationId);
        if (!song) throw new BadRequestException('La cancion no existe en esta organizacion');
        const version = await this.itemsRepository.findVersionForValidation(targetSongId, targetVersionId);
        if (!version) throw new BadRequestException('La version indicada no pertenece a esta cancion');
      }
      songId = targetSongId;
      songVersionId = targetVersionId;
    }

    const merged = normalizeSetlistItemInput(
      nextType,
      clean({
        type: nextType,
        songId,
        songVersionId,
        title: data.title,
        description: data.description,
        estimatedSec: data.estimatedSec,
        keyOverride: data.keyOverride,
        bpmOverride: data.bpmOverride,
        durationOverrideSec: data.durationOverrideSec,
        capo: data.capo,
        transitionNote: data.transitionNote,
        internalNote: data.internalNote,
        includeClick: data.includeClick,
        includePad: data.includePad,
        isOptional: data.isOptional,
        isHidden: data.isHidden,
      }),
    );

    const updated = await this.itemsRepository.updateItem(itemId, merged);
    await this.setlistsRepository.recalculateStats(setlistId);
    return mapSetlistItemDetail(updated);
  }

  async remove(userId: string, organizationId: string, setlistId: string, itemId: string) {
    await this.access.assertManageSetlists(userId, organizationId);
    await this.access.assertSetlistInOrg(organizationId, setlistId);

    const existing = await this.itemsRepository.findItem(setlistId, itemId);
    if (!existing) throw new NotFoundException('Item no encontrado');

    await this.itemsRepository.deleteAndNormalize(setlistId, itemId);
    await this.setlistsRepository.recalculateStats(setlistId);
    return { ok: true };
  }

  async duplicate(userId: string, organizationId: string, setlistId: string, itemId: string, includeCues = false) {
    await this.access.assertManageSetlists(userId, organizationId);
    await this.access.assertSetlistInOrg(organizationId, setlistId);

    const existing = await this.itemsRepository.findItem(setlistId, itemId);
    if (!existing) throw new NotFoundException('Item no encontrado');

    const created = await this.itemsRepository.duplicate(setlistId, itemId, includeCues);
    await this.setlistsRepository.recalculateStats(setlistId);
    return mapSetlistItemDetail(created);
  }

  async reorder(userId: string, organizationId: string, setlistId: string, body: Record<string, unknown>) {
    await this.access.assertManageSetlists(userId, organizationId);
    await this.access.assertSetlistInOrg(organizationId, setlistId);

    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const existing = await this.itemsRepository.listItems(setlistId);
    assertReorderPayloadValid(parsed.data.itemIds, existing.map((item) => item.id));

    await this.itemsRepository.reorder(setlistId, parsed.data.itemIds);
    const updated = await this.itemsRepository.listItems(setlistId);
    return updated.map(mapSetlistItemDetail);
  }

}
