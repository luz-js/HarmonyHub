import { BadRequestException, ConflictException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { z } from 'zod';
import { AuthRepository } from './auth.repository';
import { JwtService } from './jwt.service';
import { LoginRateLimiter, TooManyLoginAttemptsError } from './login-rate-limiter';
import { hashPassword, isLegacyDevPassword, verifyPassword } from './password';

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(1).transform((value) => value.trim()),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Las contrasenas no coinciden',
  path: ['confirmPassword'],
});

@Injectable()
export class AuthService {
  private readonly loginLimiter = new LoginRateLimiter();

  constructor(
    @Inject(AuthRepository) private readonly authRepository: AuthRepository,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  private toSessionUser(user: NonNullable<Awaited<ReturnType<AuthRepository['findUserForLogin']>>>) {
    const currentMembership = user.memberships[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      active: user.active,
      createdAt: user.createdAt,
      instruments: user.instruments.map(({ id, instrument, isPrimary }) => ({ id, instrument, isPrimary })),
      role: currentMembership?.role,
      currentOrganizationId: currentMembership?.organizationId,
      currentOrganizationSlug: currentMembership?.organization.slug,
      organizations: user.memberships.map((membership) => ({
        id: membership.organizationId,
        slug: membership.organization.slug,
        name: membership.organization.name,
        type: membership.organization.type,
        description: membership.organization.description,
        primaryColor: membership.organization.primaryColor,
        role: membership.role,
      })),
    };
  }

  /** `ip` alimenta el limitador de intentos (ip + correo); sin ip se limita solo por correo. */
  async login(input: unknown, ip?: string) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const { email, password } = parsed.data;
    const limiterKey = LoginRateLimiter.key(ip, email);
    try {
      this.loginLimiter.assertAllowed(limiterKey);
    } catch (error) {
      if (error instanceof TooManyLoginAttemptsError) throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      throw error;
    }

    const user = await this.authRepository.findUserForLogin(email);
    const validPassword = user ? verifyPassword(password, user.passwordHash) || isLegacyDevPassword(password, user.passwordHash) : false;

    if (!user || !user.active || !validPassword) {
      this.loginLimiter.registerFailure(limiterKey);
      throw new UnauthorizedException('Credenciales invalidas');
    }
    this.loginLimiter.registerSuccess(limiterKey);

    if (isLegacyDevPassword(password, user.passwordHash)) {
      await this.authRepository.updatePasswordHash(user.id, hashPassword(password));
    }

    // Sin organizacion activa el usuario igual entra, pero el cliente lo lleva al onboarding.
    const sessionUser = this.toSessionUser(user);
    return {
      user: sessionUser,
      accessToken: this.jwtService.sign({ sub: sessionUser.id, email: sessionUser.email }),
      next: user.memberships.length > 0 ? ('app' as const) : ('onboarding' as const),
    };
  }

  async register(input: unknown) {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const { name, email, password } = parsed.data;
    if (await this.authRepository.findUserForLogin(email)) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    const user = await this.authRepository.createUser({
      name,
      email,
      passwordHash: hashPassword(password),
    });

    const sessionUser = this.toSessionUser(user);
    return {
      user: sessionUser,
      accessToken: this.jwtService.sign({ sub: sessionUser.id, email: sessionUser.email }),
    };
  }

  async me(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toSessionUser(user);
  }
}
