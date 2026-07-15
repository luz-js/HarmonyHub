import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SetlistRoleRequirementsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listByItem(setlistItemId: string) {
    return this.prisma.setlistRoleRequirement.findMany({ where: { setlistItemId }, orderBy: { createdAt: 'asc' } });
  }

  listBySetlist(setlistId: string) {
    return this.prisma.setlistRoleRequirement.findMany({ where: { setlistItem: { setlistId } } });
  }

  findById(setlistItemId: string, requirementId: string) {
    return this.prisma.setlistRoleRequirement.findFirst({ where: { id: requirementId, setlistItemId } });
  }

  findByRole(setlistItemId: string, role: Prisma.SetlistRoleRequirementUncheckedCreateInput['role']) {
    return this.prisma.setlistRoleRequirement.findFirst({ where: { setlistItemId, role } });
  }

  create(data: Prisma.SetlistRoleRequirementUncheckedCreateInput) {
    return this.prisma.setlistRoleRequirement.create({ data });
  }

  update(id: string, data: Prisma.SetlistRoleRequirementUncheckedUpdateInput) {
    return this.prisma.setlistRoleRequirement.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.setlistRoleRequirement.delete({ where: { id } });
  }
}
