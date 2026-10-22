import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createInvitationSchema, type CreateInvitationData } from '@harmonyhub/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ZodPipe } from '../shared/zod.pipe';
import { InvitationsService } from './invitations.service';

@Controller('api/invitations')
@UseGuards(AuthGuard, PermissionsGuard)
export class InvitationsController {
  constructor(@Inject(InvitationsService) private readonly invitationsService: InvitationsService) {}

  @Get()
  @RequirePermission('invitations.manage', { organizationFrom: 'headerOrQuery' })
  list(@CurrentMembership() member: OrgMember) {
    return this.invitationsService.list(member);
  }

  @Post()
  @RequirePermission('invitations.manage', { organizationFrom: { body: 'organizationId' } })
  create(@CurrentMembership() member: OrgMember, @Body(new ZodPipe(createInvitationSchema)) body: CreateInvitationData) {
    return this.invitationsService.create(member, body);
  }

  /** Excepcion: la organizacion sale de la invitacion; el servicio verifica 'invitations.manage'. */
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.invitationsService.cancel(user.id, id);
  }

  /** Sin etiqueta: quien acepta todavia no es miembro de la organizacion. */
  @Post(':token/accept')
  accept(@CurrentUser() user: CurrentUserPayload, @Param('token') token: string) {
    return this.invitationsService.accept(token, user.id);
  }
}
