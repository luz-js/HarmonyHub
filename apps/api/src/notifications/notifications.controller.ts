import { Controller, Get, Headers, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { notificationsListQuerySchema, type NotificationsListQueryData } from '@harmonyhub/contracts';
import { ZodPipe } from '../shared/zod.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

/**
 * Avisos de la persona de la sesion. Sin @RequirePermission: cada aviso es de una sola persona y el servicio filtra
 * por ella; la organizacion del header solo acota la lista (y solo si sigue siendo miembro activo de ella).
 */
@Controller('api/notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string | undefined, @Query(new ZodPipe(notificationsListQuerySchema)) query: NotificationsListQueryData) {
    return this.notifications.list(user.id, organizationId || undefined, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string | undefined) {
    return this.notifications.unreadCount(user.id, organizationId || undefined);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string | undefined) {
    return this.notifications.markAllRead(user.id, organizationId || undefined);
  }
}
