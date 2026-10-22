import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProfileRepository } from './profile.repository';
import { activeOrganizationSchema, normalizeInstruments, replaceInstrumentsSchema, sortInstruments, updateMeSchema } from './profile.utils';

/** "Mi perfil": cada persona edita solo sus propios datos (siempre el usuario del token, nunca por id). */
@Injectable()
export class ProfileService {
  constructor(@Inject(ProfileRepository) private readonly profileRepository: ProfileRepository) {}

  async updateMe(userId: string, body: unknown) {
    const parsed = updateMeSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const { name, phone } = parsed.data;
    return this.profileRepository.updateUser(userId, {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
    });
  }

  /**
   * Guarda en la cuenta la organizacion activa. Solo una donde la persona sea miembro activo (archivadas incluidas,
   * que se abren en solo lectura); cualquier otra responde 404, igual que si no existiera.
   */
  async setActiveOrganization(userId: string, body: unknown) {
    const parsed = activeOrganizationSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const { organizationId } = parsed.data;
    if (!(await this.profileRepository.findActiveMembership(userId, organizationId))) throw new NotFoundException('Organizacion no encontrada');
    return this.profileRepository.setActiveOrganization(userId, organizationId);
  }

  async replaceInstruments(userId: string, body: unknown) {
    const parsed = replaceInstrumentsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const saved = await this.profileRepository.replaceInstruments(userId, normalizeInstruments(parsed.data.instruments));
    return sortInstruments(saved);
  }
}
