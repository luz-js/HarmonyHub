import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';
import { z } from 'zod';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';

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

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `org-${Date.now()}`;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

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
        slug: slugify(name),
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

  async detail(userId: string, id: string) {
    await this.permissions.assertOrganizationMember(userId, id);

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

  async update(userId: string, id: string, body: unknown) {
    await this.permissions.assertRole(userId, id, ['OWNER', 'ADMIN']);
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
