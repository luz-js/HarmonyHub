import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';
import { z } from 'zod';
import type { OrgMember } from '../permissions/current-membership.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { repointActiveOrganization } from '../shared/active-organization';

const organizationCreateSchema = z.object({
  name: z.string().min(1).transform((value) => value.trim()),
  type: z.nativeEnum(OrganizationType).default('BAND'),
  description: z.string().optional(),
  primaryColor: z.string().optional(),
});

const organizationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  primaryColor: z.string().optional(),
});

const transferSchema = z.object({
  membershipId: z.string().trim().min(1, 'Elige a quien le pasas la propiedad'),
  /** Por defecto quien transfiere deja de ser propietario y queda como administrador. */
  stepDown: z.boolean().default(true),
});

const archiveSchema = z.object({ confirmName: z.string() });

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `org-${Date.now()}`;
}

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { organization: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async create(userId: string, body: unknown) {
    const parsed = organizationCreateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const { name, type, description, primaryColor } = parsed.data;

    return this.prisma.organization.create({
      data: {
        name,
        slug: await this.uniqueSlug(name),
        type,
        description,
        primaryColor: primaryColor || '#18e0ae',
        memberships: {
          create: { userId, role: 'OWNER', status: 'ACTIVE' },
        },
      },
      include: { memberships: true },
    });
  }

  /** El slug es unico: si "alabanza" ya existe se usa "alabanza-2", "alabanza-3"... */
  private async uniqueSlug(name: string) {
    const base = slugify(name);
    const taken = await this.prisma.organization.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
    const used = new Set(taken.map((item) => item.slug));
    if (!used.has(base)) return base;
    let suffix = 2;
    while (used.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  async detail(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, active: true, createdAt: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        songs: { take: 5, orderBy: { updatedAt: 'desc' } },
        events: { take: 5, orderBy: { startsAt: 'asc' } },
        setlists: { take: 5, orderBy: { updatedAt: 'desc' } },
      },
    });
    if (!organization) throw new NotFoundException('Organizacion no encontrada');
    return organization;
  }

  /**
   * Salir: la membresia queda INACTIVE (no se borra nada). El ultimo propietario activo no puede salir; los
   * propietarios se bloquean con FOR UPDATE para que dos que salen a la vez no dejen la organizacion sin ninguno.
   */
  async leave(member: OrgMember) {
    await this.prisma.$transaction(async (tx) => {
      if (member.role === 'OWNER') {
        const owners = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Membership" WHERE "organizationId" = ${member.organizationId} AND "role" = 'OWNER' AND "status" = 'ACTIVE' FOR UPDATE`;
        if (!owners.some((owner) => owner.id !== member.id)) {
          throw new ConflictException('Eres la unica persona propietaria: transfiere la propiedad o nombra a otra persona propietaria antes de salir');
        }
      }
      await tx.membership.update({ where: { id: member.id }, data: { status: 'INACTIVE' } });
      await repointActiveOrganization(tx, member.userId, member.organizationId);
    });
    return { ok: true };
  }

  /** Pasa la propiedad a otro miembro activo. La organizacion nunca queda sin propietario: el nuevo se nombra primero. */
  async transfer(member: OrgMember, body: unknown) {
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const { membershipId, stepDown } = parsed.data;
    if (membershipId === member.id) throw new BadRequestException('Elige a otra persona del equipo');

    const target = await this.prisma.membership.findFirst({ where: { id: membershipId, organizationId: member.organizationId, status: 'ACTIVE' } });
    if (!target) throw new NotFoundException('Miembro no encontrado en la organizacion');

    await this.prisma.$transaction(async (tx) => {
      await tx.membership.update({ where: { id: target.id }, data: { role: 'OWNER' } });
      if (stepDown) await tx.membership.update({ where: { id: member.id }, data: { role: 'ADMIN' } });
    });
    return { ok: true, newOwnerMembershipId: target.id, yourRole: stepDown ? 'ADMIN' : 'OWNER' };
  }

  /** Archivar pide escribir el nombre de la organizacion (sin importar mayusculas ni espacios extra). No borra nada. */
  async archive(member: OrgMember, body: unknown) {
    const parsed = archiveSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Escribe el nombre de la organizacion para confirmar');
    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: member.organizationId } });
    if (normalizeName(parsed.data.confirmName) !== normalizeName(organization.name)) {
      throw new BadRequestException('El nombre no coincide con el de la organizacion');
    }
    if (organization.archivedAt) return organization;
    return this.prisma.organization.update({ where: { id: organization.id }, data: { archivedAt: new Date(), archivedById: member.userId } });
  }

  async restore(member: OrgMember) {
    return this.prisma.organization.update({ where: { id: member.organizationId }, data: { archivedAt: null, archivedById: null } });
  }

  async update(id: string, body: unknown) {
    const parsed = organizationUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        primaryColor: parsed.data.primaryColor,
      },
    });
  }
}
