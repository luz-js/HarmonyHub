import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import type { OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsService } from '../permissions/permissions.service';
import { clean } from '../shared/object.utils';
import { mapSetlistDetail, mapSetlistSummary } from './setlist.mapper';
import { SetlistsAccessService } from './setlists-access.service';
import {
  assertSetlistStatusTransition,
  assertTemplateAllowsAction,
  InvalidSetlistStatusTransitionError,
  InvalidSetlistTemplateActionError,
  parseBooleanQueryParam,
  SetlistTemplateAction,
} from './setlist.utils';
import { SetlistsRepository } from './setlists.repository';

const createSetlistSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['DRAFT', 'READY', 'PUBLISHED']).optional(),
  sourceTemplateId: z.string().trim().min(1).optional().nullable(),
});

const updateSetlistSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED']).optional(),
});

const saveAsTemplateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional().nullable(),
});

const listQuerySchema = z.object({
  status: z.enum(['DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED']).optional(),
  search: z.string().trim().min(1).optional(),
  includeArchived: z.preprocess(parseBooleanQueryParam, z.boolean().optional()),
  isTemplate: z.preprocess(parseBooleanQueryParam, z.boolean().optional().default(false)),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

type SetlistDetailForValidation = {
  isTemplate?: boolean;
  items: Array<{ isHidden: boolean; type: string; songVersionId: string | null }>;
};

@Injectable()
export class SetlistsService {
  constructor(
    @Inject(SetlistsRepository) private readonly setlistsRepository: SetlistsRepository,
    @Inject(SetlistsAccessService) private readonly access: SetlistsAccessService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list(member: OrgMember, query: Record<string, unknown>) {
    const { organizationId } = member;

    const parsed = listQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Filtros invalidos');

    const { page, pageSize, status, search, includeArchived, isTemplate } = parsed.data;
    const { items, total } = await this.setlistsRepository.list(organizationId, {
      status,
      search,
      includeArchived,
      isTemplate,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map(mapSetlistSummary),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async detail(member: OrgMember, id: string) {
    const { organizationId } = member;
    return mapSetlistDetail(await this.findOwnedDetail(organizationId, id));
  }

  async create(member: OrgMember, body: Record<string, unknown>) {
    const { userId, organizationId } = member;
    const parsed = createSetlistSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    if (parsed.data.sourceTemplateId) {
      if (parsed.data.status && parsed.data.status !== 'DRAFT') {
        throw new BadRequestException('Un setlist creado desde plantilla siempre inicia en borrador');
      }
      const template = await this.findOwnedDetail(organizationId, parsed.data.sourceTemplateId);
      if (!template.isTemplate) throw new BadRequestException('El setlist de origen no es una plantilla');
      const createdFromTemplate = await this.setlistsRepository.cloneSetlist({
        sourceSetlistId: template.id,
        organizationId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isTemplate: false,
        createdById: userId,
        updatedById: userId,
      });
      return mapSetlistDetail(createdFromTemplate);
    }

    const created = await this.setlistsRepository.create({
      organizationId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: parsed.data.status || 'DRAFT',
      createdById: userId,
      updatedById: userId,
    });
    return mapSetlistDetail({ ...created, items: [] });
  }

  async saveAsTemplate(member: OrgMember, id: string, body: Record<string, unknown>) {
    const { userId, organizationId } = member;
    await this.findOwnedDetail(organizationId, id);
    const parsed = saveAsTemplateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const createdTemplate = await this.setlistsRepository.cloneSetlist({
      sourceSetlistId: id,
      organizationId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      isTemplate: true,
      createdById: userId,
      updatedById: userId,
    });
    return mapSetlistDetail(createdTemplate);
  }

  async update(member: OrgMember, id: string, body: Record<string, unknown>) {
    const { userId, organizationId } = member;
    const current = await this.findOwnedDetail(organizationId, id);
    const parsed = updateSetlistSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    if (parsed.data.status && parsed.data.status !== current.status) {
      this.assertTemplateAllows(current.isTemplate, 'status-change');
    }

    if (parsed.data.status && parsed.data.status !== current.status) {
      this.assertStatusChangeAllowed(member, current, parsed.data.status);
    }

    await this.setlistsRepository.update(
      id,
      clean({ name: parsed.data.name, description: parsed.data.description, status: parsed.data.status, updatedById: userId }),
    );
    return mapSetlistDetail(await this.findOwnedDetail(organizationId, id));
  }

  async archive(member: OrgMember, id: string) {
    const { userId, organizationId } = member;
    const current = await this.findOwnedDetail(organizationId, id);
    this.assertTemplateAllows(current.isTemplate, 'archive');
    this.assertTransition(current.status, 'ARCHIVED');
    await this.setlistsRepository.update(id, { status: 'ARCHIVED', updatedById: userId });
    return mapSetlistDetail(await this.findOwnedDetail(organizationId, id));
  }

  async publish(member: OrgMember, id: string) {
    const { userId, organizationId } = member;
    const current = await this.findOwnedDetail(organizationId, id);
    this.assertTemplateAllows(current.isTemplate, 'publish');
    this.assertTransition(current.status, 'PUBLISHED');
    this.assertPublishable(current);
    await this.setlistsRepository.update(id, { status: 'PUBLISHED', updatedById: userId });
    return mapSetlistDetail(await this.findOwnedDetail(organizationId, id));
  }

  async delete(member: OrgMember, id: string) {
    const { organizationId } = member;
    await this.findOwnedDetail(organizationId, id);
    const eventsCount = await this.setlistsRepository.countEvents(id);
    if (eventsCount > 0) throw new BadRequestException('No se puede eliminar un setlist con eventos asociados; archivalo en su lugar');

    await this.setlistsRepository.delete(id);
    return { ok: true };
  }

  /** Archivar o publicar desde PATCH exige ademas el permiso de esa accion (depende del estado pedido). */
  private assertStatusChangeAllowed(member: OrgMember, current: SetlistDetailForValidation & { status: string }, nextStatus: string) {
    if (nextStatus === 'ARCHIVED') {
      this.permissions.assertRoleCan(member.role, 'setlists.archive');
    }
    if (nextStatus === 'PUBLISHED') {
      this.permissions.assertRoleCan(member.role, 'setlists.publish');
      this.assertPublishable(current);
    }
    this.assertTransition(current.status as any, nextStatus as any);
  }

  private assertTemplateAllows(isTemplate: boolean, action: SetlistTemplateAction) {
    try {
      assertTemplateAllowsAction(isTemplate, action);
    } catch (error) {
      if (error instanceof InvalidSetlistTemplateActionError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private assertTransition(from: any, to: any) {
    try {
      assertSetlistStatusTransition(from, to);
    } catch (error) {
      if (error instanceof InvalidSetlistStatusTransitionError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private assertPublishable(setlist: SetlistDetailForValidation) {
    const visibleItems = setlist.items.filter((item) => !item.isHidden);
    if (visibleItems.length === 0) throw new BadRequestException('El setlist debe tener al menos un item visible para publicarse');
    const invalidSongItem = visibleItems.find((item) => item.type === 'SONG' && !item.songVersionId);
    if (invalidSongItem) throw new BadRequestException('Todos los items de tipo cancion deben tener una version valida antes de publicar');
  }

  private async findOwnedDetail(organizationId: string, id: string) {
    const setlist = await this.setlistsRepository.findDetail(id, organizationId);
    if (!setlist) throw new NotFoundException('Setlist no encontrado');
    return setlist;
  }
}
