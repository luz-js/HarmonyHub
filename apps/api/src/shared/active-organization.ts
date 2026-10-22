import type { Prisma } from '@prisma/client';

type Db = Pick<Prisma.TransactionClient, 'user' | 'membership'>;

/**
 * Si la organizacion activa guardada de la persona es `organizationId` (y la acaba de dejar o la desactivaron),
 * la cambia por otra donde siga activa, o la deja vacia (la web muestra la bienvenida).
 */
export async function repointActiveOrganization(db: Db, userId: string, organizationId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { activeOrganizationId: true } });
  if (user?.activeOrganizationId !== organizationId) return;
  const next = await db.membership.findFirst({
    where: { userId, status: 'ACTIVE', organizationId: { not: organizationId } },
    orderBy: { joinedAt: 'asc' },
    select: { organizationId: true },
  });
  await db.user.update({ where: { id: userId }, data: { activeOrganizationId: next?.organizationId ?? null } });
}
