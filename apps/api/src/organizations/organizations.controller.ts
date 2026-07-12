import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { OrganizationsService } from './organizations.service';

@Controller('api/organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly organizationsService: OrganizationsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() body: Record<string, unknown>) {
    return this.organizationsService.create(user.id, body ?? {});
  }

  @Get(':id')
  detail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.organizationsService.detail(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.organizationsService.update(user.id, id, body ?? {});
  }
}
