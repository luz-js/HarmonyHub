import { Body, Controller, Get, HttpCode, Inject, Ip, Post, Req, Res, UseGuards } from '@nestjs/common';
import { loginSchema, registerSchema, type LoginData, type RegisterData } from '@harmonyhub/contracts';
import { ZodPipe } from '../shared/zod.pipe';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser, CurrentUserPayload } from './current-user.decorator';
import { clearRefreshCookie, CookieRequest, CookieResponse, readRefreshCookie, setRefreshCookie } from './refresh-cookie';

@Controller('api')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body(new ZodPipe(loginSchema)) body: LoginData, @Ip() ip: string, @Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse) {
    const { refresh, ...session } = await this.authService.login(body, ip, request.headers['user-agent']);
    setRefreshCookie(response, refresh);
    return { ok: true, ...session };
  }

  @Post('auth/register')
  async register(@Body(new ZodPipe(registerSchema)) body: RegisterData, @Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse) {
    const { refresh, ...session } = await this.authService.register(body, request.headers['user-agent']);
    setRefreshCookie(response, refresh);
    return { ok: true, ...session, next: 'onboarding' };
  }

  /** Renueva la sesion con la cookie httpOnly: rota el refresh token y devuelve un access token nuevo. */
  @Post('auth/refresh')
  @HttpCode(200)
  async refresh(@Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse) {
    try {
      const { refresh, accessToken } = await this.authService.refresh(readRefreshCookie(request), request.headers['user-agent']);
      setRefreshCookie(response, refresh);
      return { ok: true, accessToken };
    } catch (error) {
      clearRefreshCookie(response);
      throw error;
    }
  }

  @Post('auth/logout')
  @HttpCode(200)
  async logout(@Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse) {
    await this.authService.logout(readRefreshCookie(request));
    clearRefreshCookie(response);
    return { ok: true };
  }

  @Get('auth/me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() currentUser: CurrentUserPayload) {
    const user = await this.authService.me(currentUser.id);
    return { ok: true, user };
  }
}
