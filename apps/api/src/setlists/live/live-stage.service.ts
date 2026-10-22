import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { AdvanceLiveStageData, HandoverLiveStageData, LiveStageLeader, StartLiveStageData } from '@harmonyhub/contracts';
import type { OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsService } from '../../permissions/permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SetlistsAccessService } from '../setlists-access.service';
import { LiveStageError, LiveStageHub, type LiveSubscriber } from './live-stage.hub';

/**
 * Reglas del modo escenario en vivo: el setlist tiene que ser de la organizacion, el item del setlist, y solo quien
 * dirige avanza, pasa el liderazgo o termina. Los permisos por rol (leer o 'stage.lead') los revisa PermissionsGuard.
 */
@Injectable()
export class LiveStageService {
  constructor(
    @Inject(LiveStageHub) private readonly hub: LiveStageHub,
    @Inject(SetlistsAccessService) private readonly access: SetlistsAccessService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async state(member: OrgMember, setlistId: string) {
    await this.access.assertSetlistInOrg(member.organizationId, setlistId);
    return this.hub.state(member.organizationId, setlistId);
  }

  /** Conecta un dispositivo al stream (despues de comprobar que el setlist es de su organizacion). */
  async connect(member: OrgMember, setlistId: string, subscriber: LiveSubscriber) {
    await this.access.assertSetlistInOrg(member.organizationId, setlistId);
    return this.hub.subscribe(member.organizationId, setlistId, subscriber);
  }

  async start(member: OrgMember, setlistId: string, data: StartLiveStageData) {
    if (data.currentItemId) await this.access.assertItemInSetlist(member.organizationId, setlistId, data.currentItemId);
    else await this.access.assertSetlistInOrg(member.organizationId, setlistId);
    const leader = await this.leaderFor(member.id, member.organizationId);
    return this.run(() => this.hub.start(member.organizationId, setlistId, leader, { takeOver: data.takeOver, currentItemId: data.currentItemId }));
  }

  async advance(member: OrgMember, setlistId: string, data: AdvanceLiveStageData) {
    await this.access.assertItemInSetlist(member.organizationId, setlistId, data.currentItemId);
    return this.run(() => this.hub.advance(member.organizationId, setlistId, member.userId, data.currentItemId));
  }

  async handover(member: OrgMember, setlistId: string, data: HandoverLiveStageData) {
    await this.access.assertSetlistInOrg(member.organizationId, setlistId);
    const next = await this.leaderFor(data.membershipId, member.organizationId);
    return this.run(() => this.hub.handover(member.organizationId, setlistId, member.userId, next));
  }

  async end(member: OrgMember, setlistId: string) {
    await this.access.assertSetlistInOrg(member.organizationId, setlistId);
    return this.run(() => this.hub.end(member.organizationId, setlistId, member.userId));
  }

  /** Quien dirige: un miembro activo de la organizacion cuyo rol puede dirigir el modo escenario. */
  private async leaderFor(membershipId: string, organizationId: string): Promise<LiveStageLeader> {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId, status: 'ACTIVE', user: { active: true } },
      select: { id: true, role: true, userId: true, user: { select: { name: true } } },
    });
    if (!membership) throw new NotFoundException('Miembro no encontrado en la organizacion');
    if (!this.permissions.can(membership.role, 'stage.lead')) throw new BadRequestException('Esa persona no puede dirigir el modo escenario');
    return { userId: membership.userId, membershipId: membership.id, name: membership.user.name };
  }

  private run<T>(action: () => T): T {
    try {
      return action();
    } catch (error) {
      if (!(error instanceof LiveStageError)) throw error;
      if (error.code === 'CONFLICT') throw new ConflictException({ statusCode: 409, message: error.message, leader: error.leader });
      if (error.code === 'NOT_LEADER') throw new ForbiddenException(error.message);
      throw new ConflictException(error.message);
    }
  }
}
