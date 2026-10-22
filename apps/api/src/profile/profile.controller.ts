import { Body, Controller, Inject, Patch, Put, UseGuards } from '@nestjs/common';
import {
  activeOrganizationSchema,
  replaceInstrumentsSchema,
  updateMeSchema,
  type ActiveOrganizationData,
  type ReplaceMyInstrumentsData,
  type UpdateMeData,
} from '@harmonyhub/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { ZodPipe } from '../shared/zod.pipe';
import { ProfileService } from './profile.service';

@Controller('api/me')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(@Inject(ProfileService) private readonly profileService: ProfileService) {}

  @Patch()
  async update(@CurrentUser() user: CurrentUserPayload, @Body(new ZodPipe(updateMeSchema)) body: UpdateMeData) {
    const profile = await this.profileService.updateMe(user.id, body);
    return { ok: true, user: profile };
  }

  @Put('active-organization')
  async setActiveOrganization(@CurrentUser() user: CurrentUserPayload, @Body(new ZodPipe(activeOrganizationSchema)) body: ActiveOrganizationData) {
    const result = await this.profileService.setActiveOrganization(user.id, body);
    return { ok: true, ...result };
  }

  @Put('instruments')
  async replaceInstruments(@CurrentUser() user: CurrentUserPayload, @Body(new ZodPipe(replaceInstrumentsSchema)) body: ReplaceMyInstrumentsData) {
    const instruments = await this.profileService.replaceInstruments(user.id, body);
    return { ok: true, instruments };
  }
}
