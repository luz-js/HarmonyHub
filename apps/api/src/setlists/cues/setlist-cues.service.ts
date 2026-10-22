import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  updateSetlistCueStatusSchema,
  type CopySetlistCuesData,
  type CreateSetlistCueData,
  type ReorderSetlistCuesData,
  type UpdateSetlistCueData,
} from '@harmonyhub/contracts';
import { parseOrBadRequest } from '../../shared/zod.pipe';
import { PermissionsService } from '../../permissions/permissions.service';
import { clean } from '../../shared/object.utils';
import { assertReorderPayloadValid } from '../setlist.utils';
import { SetlistItemsRepository } from '../items/setlist-items.repository';
import { SetlistsAccessService } from '../setlists-access.service';
import { SetlistParticipantsRepository } from '../assignments/setlist-participants.repository';
import { mapSetlistCue } from './setlist-cue.mapper';
import {
  buildCueWarnings,
  calculateCueTimelinePosition,
  calculateItemStartTimes,
  getCueCategory,
  getCueMetadataSchema,
  isCriticalPriority,
  MAX_METADATA_JSON_LENGTH,
  normalizePhaseForItem,
  SETLIST_CUE_TYPES,
  type CueCategory,
} from './setlist-cue.utils';
import { SetlistCuesRepository, toNullableJsonInput } from './setlist-cues.repository';
import type { OrgMember } from '../../permissions/current-membership.decorator';

type TimelineItemRow = { id: string; isHidden: boolean; durationOverrideSec: number | null; estimatedSec: number | null; songVersion: { durationSec: number | null } | null };
type CueRow = Parameters<typeof mapSetlistCue>[0];

@Injectable()
export class SetlistCuesService {
  constructor(
    @Inject(SetlistCuesRepository) private readonly cuesRepository: SetlistCuesRepository,
    @Inject(SetlistItemsRepository) private readonly itemsRepository: SetlistItemsRepository,
    @Inject(SetlistParticipantsRepository) private readonly participantsRepository: SetlistParticipantsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(SetlistsAccessService) private readonly access: SetlistsAccessService,
  ) {}

  async list(member: OrgMember, setlistId: string) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);
    const cues = await this.cuesRepository.listBySetlist(setlistId);
    return this.mapListWithTimeline(setlistId, cues);
  }

  async listByItem(member: OrgMember, setlistId: string, itemId: string) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);
    const cues = await this.cuesRepository.listByItem(itemId);
    return this.mapListWithTimeline(setlistId, cues);
  }

  async get(member: OrgMember, setlistId: string, cueId: string) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);
    const cue = await this.findCue(setlistId, cueId);
    return this.mapSingleWithTimeline(setlistId, cue);
  }

  async create(member: OrgMember, setlistId: string, data: CreateSetlistCueData) {
    const { userId, organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);

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

  async update(member: OrgMember, setlistId: string, cueId: string, data: UpdateSetlistCueData) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);
    const existing = await this.findCue(setlistId, cueId);

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

  async updateStatus(member: OrgMember, setlistId: string, cueId: string, body: unknown) {
    const { userId, organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);
    const cue = await this.findCue(setlistId, cueId);

    const isResponsible = cue.responsibleParticipant?.membership.user.id === userId;
    const allowed = this.permissions.canUpdateOwnCueStatus(isResponsible) || this.permissions.canUpdateAnyCueStatus(member.role);
    if (!allowed) throw new ForbiddenException('No puedes actualizar el estado de este cue');

    // Se valida aqui y no con ZodPipe: quien no tiene permiso recibe 403 aunque el cuerpo sea invalido.
    const { status } = parseOrBadRequest(updateSetlistCueStatusSchema, body);
    const updated = await this.cuesRepository.updateStatus(cueId, status, userId);
    return this.mapSingleWithTimeline(setlistId, updated);
  }

  async remove(member: OrgMember, setlistId: string, cueId: string) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);
    await this.findCue(setlistId, cueId);

    await this.cuesRepository.delete(cueId);
    return { ok: true };
  }

  async reorder(member: OrgMember, setlistId: string, data: ReorderSetlistCuesData) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);

    const { setlistItemId, phase, cueIds } = data;

    if (setlistItemId) await this.access.assertItemInSetlist(organizationId, setlistId, setlistItemId);

    const scopeCues = await this.cuesRepository.listByScope(setlistId, setlistItemId, phase);
    assertReorderPayloadValid(cueIds, scopeCues.map((cue) => cue.id));

    await this.cuesRepository.reorder(cueIds);
    const reordered = await this.cuesRepository.listByScope(setlistId, setlistItemId, phase);
    return this.mapListWithTimeline(setlistId, reordered);
  }

  async duplicate(member: OrgMember, setlistId: string, cueId: string) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);

    const created = await this.cuesRepository.duplicate(setlistId, cueId);
    return this.mapSingleWithTimeline(setlistId, created);
  }

  async copy(member: OrgMember, setlistId: string, targetItemId: string, data: CopySetlistCuesData) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, targetItemId);

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

  async production(member: OrgMember, setlistId: string) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);

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

}
