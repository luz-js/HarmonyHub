import { Controller, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { InvitationsService } from './invitations.service';

/**
 * "Mis invitaciones": las de la persona que inicio sesion, buscadas por el correo de su cuenta.
 * Sin @RequirePermission: todavia no es miembro de esas organizaciones (excepciones del test guardian).
 */
@Controller('api/me/invitations')
@UseGuards(AuthGuard)
export class MyInvitationsController {
  constructor(@Inject(InvitationsService) private readonly invitationsService: InvitationsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.invitationsService.listMine(user.id);
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.invitationsService.acceptMine(user.id, id);
  }

  @Post(':id/decline')
  @HttpCode(200)
  decline(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.invitationsService.declineMine(user.id, id);
  }
}
