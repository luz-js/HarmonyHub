import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser, CurrentUserPayload } from './current-user.decorator';

@Controller('api')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: unknown) {
    const session = await this.authService.login(body ?? {});
    return { ok: true, ...session };
  }

  @Post('auth/register')
  async register(@Body() body: Record<string, unknown>) {
    const session = await this.authService.register(body ?? {});
    return { ok: true, ...session, next: 'onboarding' };
  }

  @Get('auth/me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() currentUser: CurrentUserPayload) {
    const user = await this.authService.me(currentUser.id);
    return { ok: true, user };
  }
}
