import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { PermissionsService } from '../../permissions/permissions.service';
import { clean } from '../../shared/object.utils';
import { assertReorderPayloadValid } from '../setlist.utils';
import { SetlistItemsRepository } from '../items/setlist-items.repository';
import { SetlistsRepository } from '../setlists.repository';
import { SetlistParticipantsRepository } from '../assignments/setlist-participants.repository';
import { mapSetlistCue } from './setlist-cue.mapper';
import {
  buildCueWarnings,
  calculateCueTimelinePosition,
  calculateItemStartTimes,
  CUE_CATEGORIES,
  getCueCategory,
  getCueMetadataSchema,
  isCriticalPriority,
  MAX_METADATA_JSON_LENGTH,
  normalizePhaseForItem,
  SETLIST_CUE_PHASES,
  SETLIST_CUE_PRIORITIES,
  SETLIST_CUE_STATUSES,
  SETLIST_CUE_TYPES,
  type CueCategory,
} from './setlist-cue.utils';
import { SetlistCuesRepository, toNullableJsonInput } from './setlist-cues.repository';

const createCueSchema = z.object({
  setlistItemId: z.string().trim().min(1).optional().nullable(),
  type: z.enum(SETLIST_CUE_TYPES),
  phase: z.enum(SETLIST_CUE_PHASES).optional(),
  priority: z.enum(SETLIST_CUE_PRIORITIES).optional(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(3000).optional().nullable(),
  offsetSec: z.coerce.number().int().min(-3600).max(86400).optional().nullable(),
  durationSec: z.coerce.number().int().min(0).max(86400).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  isOptional: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  responsibleParticipantId: z.string().trim().min(1).optional().nullable(),
  responsibleAssignmentId: z.string().trim().min(1).optional().nullable(),
});

const updateCueSchema = z.object({
  type: z.enum(SETLIST_CUE_TYPES).optional(),
  phase: z.enum(SETLIST_CUE_PHASES).optional(),
  priority: z.enum(SETLIST_CUE_PRIORITIES).optional(),
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(3000).optional().nullable(),
  offsetSec: z.coerce.number().int().min(-3600).max(86400).optional().nullable(),
  durationSec: z.coerce.number().int().min(0).max(86400).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  isOptional: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  responsibleParticipantId: z.string().trim().min(1).optional().nullable(),
  responsibleAssignmentId: z.string().trim().min(1).optional().nullable(),
});

const updateStatusSchema = z.object({ status: z.enum(SETLIST_CUE_STATUSES) });

const reorderSchema = z.object({
  setlistItemId: z.string().trim().min(1).nullable(),
  phase: z.enum(SETLIST_CUE_PHASES),
  cueIds: z.array(z.string().trim().min(1)).min(1),
});

const copySchema = z.object({
  sourceItemId: z.string().trim().min(1),
  phases: z.array(z.enum(SETLIST_CUE_PHASES)).optional(),
  categories: z.array(z.enum(CUE_CATEGORIES)).optional(),
  replaceExisting: z.boolean().optional(),
  includeResponsibles: z.boolean().optional(),
});

type TimelineItemRow = { id: string; isHidden: boolean; durationOverrideSec: number | null; estimatedSec: number | null; songVersion: { durationSec: number | null } | null };
type CueRow = Parameters<typeof mapSetlistCue>[0];

@Injectable()
export class SetlistCuesService {
  constructor(
    @Inject(SetlistCuesRepository) private readonly cuesRepository: SetlistCuesRepository,
    @Inject(SetlistItemsRepository) private readonly itemsRepository: SetlistItemsRepository,
    @Inject(SetlistParticipantsRepository) private readonly participantsRepository: SetlistParticipantsRepository,
    @Inject(SetlistsRepository) private readonly setlistsRepository: SetlistsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list(userId: string, organizationId: string, setlistId: string) {
    await this.assertView(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);
    const cues = await this.cuesRepository.listBySetlist(setlistId);
    return this.mapListWithTimeline(setlistId, cues);
  }

  async listByItem(userId: string, organizationId: string, setlistId: string, itemId: string) {
    await this.assertView(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);
    const cues = await this.cuesRepository.listByItem(itemId);
    return this.mapListWithTimeline(setlistId, cues);
  }

  async get(userId: string, organizationId: string, setlistId: string, cueId: string) {
    await this.assertView(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);
    const cue = await this.findCue(setlistId, cueId);
    return this.mapSingleWithTimeline(setlistId, cue);
  }

  async create(userId: string, organizationId: string, setlistId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);

    const parsed = createCueSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const data = parsed.data;

    if (data.setlistItemId) {
      const item = await this.itemsRepository.findItem(setlistId, data.setlistItemId);
      if (!item) throw new BadRequestException('El item indicado no pertenece a este setlist');
    }

    const phase = normalizePhaseForItem(data.setlistItemId ?? null, data.phase ?? 'BEFORE');
    const metadata = this.validateMetadata(data.type, data.metadata ?? null);
    const { responsibleParticipantId, responsibleAssignmentId } = await this.resolveResponsible(
      setlistId,
      data.responsibleParticipantId,
      data.responsibleAssignmentId,
    );
    const sortOrder = await this.cuesRepository.countByScope(setlistId, data.setlistItemId ?? null, phase);

    const created = await this.cuesRepository.create({
      setlistId,
      setlistItemId: data.setlistItemId ?? null,
      type: data.type,
      phase,
      priority: data.priority ?? 'NORMAL',
      title: data.title,
      description: data.description ?? null,
      offsetSec: data.offsetSec ?? null,
      durationSec: data.durationSec ?? null,
      sortOrder,
      metadata: toNullableJsonInput(metadata),
      isOptional: data.isOptional ?? false,
      isHidden: data.isHidden ?? false,
      responsibleParticipantId,
      responsibleAssignmentId,
      createdById: userId,
    });

    return this.mapSingleWithTimeline(setlistId, created);
  }

  async update(userId: string, organizationId: string, setlistId: string, cueId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);
    const existing = await this.findCue(setlistId, cueId);

    const parsed = updateCueSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const data = parsed.data;

    const nextType = data.type ?? existing.type;
    const metadata = data.metadata !== undefined ? this.validateMetadata(nextType, data.metadata) : undefined;

    let responsiblePatch: { responsibleParticipantId?: string | null; responsibleAssignmentId?: string | null } = {};
    if (data.responsibleParticipantId !== undefined || data.responsibleAssignmentId !== undefined) {
      responsiblePatch = await this.resolveResponsible(setlistId, data.responsibleParticipantId, data.responsibleAssignmentId);
    }

    const updated = await this.cuesRepository.update(
      cueId,
      clean({
        type: data.type,
        phase: data.phase,
        priority: data.priority,
        title: data.title,
        description: data.description,
        offsetSec: data.offsetSec,
        durationSec: data.durationSec,
        metadata: toNullableJsonInput(metadata),
        isOptional: data.isOptional,
        isHidden: data.isHidden,
        ...responsiblePatch,
      }),
    );

    return this.mapSingleWithTimeline(setlistId, updated);
  }

  async updateStatus(userId: string, organizationId: string, setlistId: string, cueId: string, body: Record<string, unknown>) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);
    const cue = await this.findCue(setlistId, cueId);

    const isResponsible = cue.responsibleParticipant?.membership.user.id === userId;
    const allowed = this.permissions.canUpdateOwnCueStatus(isResponsible) || this.permissions.canUpdateAnyCueStatus(membership.role);
    if (!allowed) throw new ForbiddenException('No puedes actualizar el estado de este cue');

    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const updated = await this.cuesRepository.updateStatus(cueId, parsed.data.status, userId);
    return this.mapSingleWithTimeline(setlistId, updated);
  }

  async remove(userId: string, organizationId: string, setlistId: string, cueId: string) {
    await this.assertManage(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);
    await this.findCue(setlistId, cueId);

    await this.cuesRepository.delete(cueId);
    return { ok: true };
  }

  async reorder(userId: string, organizationId: string, setlistId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);

    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const { setlistItemId, phase, cueIds } = parsed.data;

    if (setlistItemId) await this.assertItemInSetlist(organizationId, setlistId, setlistItemId);

    const scopeCues = await this.cuesRepository.listByScope(setlistId, setlistItemId, phase);
    assertReorderPayloadValid(cueIds, scopeCues.map((cue) => cue.id));

    await this.cuesRepository.reorder(cueIds);
    const reordered = await this.cuesRepository.listByScope(setlistId, setlistItemId, phase);
    return this.mapListWithTimeline(setlistId, reordered);
  }

  async duplicate(userId: string, organizationId: string, setlistId: string, cueId: string) {
    await this.assertManage(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);

    const created = await this.cuesRepository.duplicate(setlistId, cueId);
    return this.mapSingleWithTimeline(setlistId, created);
  }

  async copy(userId: string, organizationId: string, setlistId: string, targetItemId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, targetItemId);

    const parsed = copySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const data = parsed.data;

    const source = await this.itemsRepository.findItem(setlistId, data.sourceItemId);
    if (!source) throw new BadRequestException('El item de origen no pertenece a este setlist');

    const copied = await this.cuesRepository.copy(setlistId, data.sourceItemId, targetItemId, {
      phases: data.phases,
      categories: data.categories,
      replaceExisting: data.replaceExisting,
      includeResponsibles: data.includeResponsibles,
    });
    return this.mapListWithTimeline(setlistId, copied);
  }

  async production(userId: string, organizationId: string, setlistId: string) {
    await this.assertView(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);

    const [cues, items, participants] = await Promise.all([
      this.cuesRepository.listBySetlist(setlistId),
      this.itemsRepository.listItems(setlistId),
      this.participantsRepository.list(setlistId),
    ]);

    const startByItemId = calculateItemStartTimes(items);
    const itemById = new Map(items.map((item) => [item.id, item]));
    const mappedCues = cues.map((cue) => this.buildCueResponse(cue, startByItemId, itemById));

    const coverage = {
      total: cues.length,
      ready: cues.filter((cue) => cue.status === 'READY').length,
      pending: cues.filter((cue) => cue.status === 'PENDING').length,
      needsReview: cues.filter((cue) => cue.status === 'NEEDS_REVIEW').length,
      blocked: cues.filter((cue) => cue.status === 'BLOCKED').length,
      critical: cues.filter((cue) => isCriticalPriority(cue.priority)).length,
      withoutResponsible: cues.filter((cue) => !cue.responsibleParticipantId).length,
    };

    const byCategoryMap = new Map<CueCategory, { total: number; pending: number; critical: number }>();
    for (const cue of cues) {
      const category = getCueCategory(cue.type);
      const entry = byCategoryMap.get(category) ?? { total: 0, pending: 0, critical: 0 };
      entry.total += 1;
      if (cue.status === 'PENDING') entry.pending += 1;
      if (isCriticalPriority(cue.priority)) entry.critical += 1;
      byCategoryMap.set(category, entry);
    }
    const byCategory = Array.from(byCategoryMap.entries()).map(([category, stats]) => ({ category, ...stats }));

    type ResponsibleStats = { participantId: string | null; participantName: string; total: number; ready: number; pending: number; critical: number };
    const byResponsibleMap = new Map<string, ResponsibleStats>();
    for (const cue of cues) {
      const key = cue.responsibleParticipantId ?? 'unassigned';
      const entry = byResponsibleMap.get(key) ?? {
        participantId: cue.responsibleParticipantId,
        participantName: cue.responsibleParticipant?.membership.user.name ?? 'Sin responsable',
        total: 0,
        ready: 0,
        pending: 0,
        critical: 0,
      };
      entry.total += 1;
      if (cue.status === 'READY') entry.ready += 1;
      if (cue.status === 'PENDING') entry.pending += 1;
      if (isCriticalPriority(cue.priority)) entry.critical += 1;
      byResponsibleMap.set(key, entry);
    }
    const byResponsible = Array.from(byResponsibleMap.values());

    const warnings = buildCueWarnings(
      cues.map((cue) => ({
        id: cue.id,
        setlistItemId: cue.setlistItemId,
        phase: cue.phase,
        type: cue.type,
        title: cue.title,
        offsetSec: cue.offsetSec,
        status: cue.status,
        priority: cue.priority,
        responsibleParticipantId: cue.responsibleParticipantId,
      })),
      items.map((item) => ({
        id: item.id,
        isHidden: item.isHidden,
        effective: { durationSec: item.durationOverrideSec ?? item.estimatedSec ?? item.songVersion?.durationSec ?? null },
      })),
      participants.map((participant) => ({ id: participant.id, status: participant.status })),
    );

    return { cues: mappedCues, coverage, byCategory, byResponsible, warnings };
  }

  private async resolveResponsible(setlistId: string, responsibleParticipantId?: string | null, responsibleAssignmentId?: string | null) {
    let participantId = responsibleParticipantId ?? null;
    const assignmentId = responsibleAssignmentId ?? null;

    if (assignmentId) {
      const assignment = await this.cuesRepository.findAssignmentInSetlist(setlistId, assignmentId);
      if (!assignment) throw new BadRequestException('La asignacion indicada no pertenece a este setlist');
      participantId = assignment.participantId;
    } else if (participantId) {
      const participant = await this.participantsRepository.findById(setlistId, participantId);
      if (!participant) throw new BadRequestException('El participante indicado no pertenece a este setlist');
    }

    return { responsibleParticipantId: participantId, responsibleAssignmentId: assignmentId };
  }

  private validateMetadata(type: (typeof SETLIST_CUE_TYPES)[number], metadata: unknown): Record<string, unknown> | null {
    if (metadata === undefined || metadata === null) return null;
    if (JSON.stringify(metadata).length > MAX_METADATA_JSON_LENGTH) throw new BadRequestException('metadata excede el tamano maximo permitido');
    const schema = getCueMetadataSchema(type);
    const parsed = schema.safeParse(metadata);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'metadata invalida para este tipo de cue');
    return parsed.data as Record<string, unknown>;
  }

  private async findCue(setlistId: string, cueId: string) {
    const cue = await this.cuesRepository.findById(setlistId, cueId);
    if (!cue) throw new NotFoundException('Cue no encontrado');
    return cue;
  }

  private async mapListWithTimeline(setlistId: string, cues: CueRow[]) {
    const items = await this.itemsRepository.listItems(setlistId);
    const startByItemId = calculateItemStartTimes(items);
    const itemById = new Map(items.map((item) => [item.id, item]));
    return cues.map((cue) => this.buildCueResponse(cue, startByItemId, itemById));
  }

  private async mapSingleWithTimeline(setlistId: string, cue: CueRow) {
    const [mapped] = await this.mapListWithTimeline(setlistId, [cue]);
    return mapped;
  }

  private buildCueResponse(cue: CueRow, startByItemId: Map<string, number>, itemById: Map<string, TimelineItemRow>) {
    const itemStartSec = cue.setlistItemId ? (startByItemId.get(cue.setlistItemId) ?? null) : null;
    const item = cue.setlistItemId ? itemById.get(cue.setlistItemId) : undefined;
    const itemDurationSec = item ? (item.durationOverrideSec ?? item.estimatedSec ?? item.songVersion?.durationSec ?? null) : null;
    const timelinePositionSec = calculateCueTimelinePosition({
      phase: cue.phase as any,
      offsetSec: cue.offsetSec,
      itemStartSec,
      itemDurationSec,
    });
    return mapSetlistCue(cue, timelinePositionSec);
  }

  private async assertView(userId: string, organizationId: string) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!this.permissions.canViewSetlistCues(membership.role)) throw new ForbiddenException('No tienes permisos para ver la produccion del setlist');
    return membership;
  }

  private async assertManage(userId: string, organizationId: string) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!this.permissions.canManageSetlistCues(membership.role)) throw new ForbiddenException('No tienes permisos para gestionar cues');
    return membership;
  }

  private async assertSetlistInOrg(organizationId: string, setlistId: string) {
    const setlist = await this.setlistsRepository.findById(setlistId, organizationId);
    if (!setlist) throw new NotFoundException('Setlist no encontrado');
    return setlist;
  }

  private async assertItemInSetlist(organizationId: string, setlistId: string, itemId: string) {
    await this.assertSetlistInOrg(organizationId, setlistId);
    const item = await this.itemsRepository.findItem(setlistId, itemId);
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }
}
