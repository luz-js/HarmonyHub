import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ActiveOrganizationData, ReplaceMyInstrumentsData, UpdateMeData } from '@harmonyhub/contracts';
import { ProfileRepository } from './profile.repository';
import { normalizeInstruments, sortInstruments } from './profile.utils';

/**
 * "Mi perfil": cada persona edita solo sus propios datos (siempre el usuario del token, nunca por id).
 * Los datos ya llegan validados por ZodPipe con los esquemas de @harmonyhub/contracts.
 */
@Injectable()
export class ProfileService {
  constructor(@Inject(ProfileRepository) private readonly profileRepository: ProfileRepository) {}

  async updateMe(userId: string, data: UpdateMeData) {
    const { name, phone } = data;
    return this.profileRepository.updateUser(userId, {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
    });
  }

  /**
   * Guarda en la cuenta la organizacion activa. Solo una donde la persona sea miembro activo (archivadas incluidas,
   * que se abren en solo lectura); cualquier otra responde 404, igual que si no existiera.
   */
  async setActiveOrganization(userId: string, data: ActiveOrganizationData) {
    const { organizationId } = data;
    if (!(await this.profileRepository.findActiveMembership(userId, organizationId))) throw new NotFoundException('Organizacion no encontrada');
    return this.profileRepository.setActiveOrganization(userId, organizationId);
  }

  async replaceInstruments(userId: string, data: ReplaceMyInstrumentsData) {
    const saved = await this.profileRepository.replaceInstruments(userId, normalizeInstruments(data.instruments));
    return sortInstruments(saved);
  }
}
