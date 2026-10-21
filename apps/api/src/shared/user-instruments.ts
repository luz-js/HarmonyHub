import type { Prisma, SetlistMusicalRole } from '@prisma/client';

/** Lo que la persona sabe tocar (su perfil), con el principal primero. Se usa al incluir `user` en cualquier consulta. */
export const userInstrumentsSelect = {
  select: { instrument: true, isPrimary: true },
  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
} satisfies Prisma.User$instrumentsArgs;

export type UserInstrumentRef = { instrument: SetlistMusicalRole; isPrimary: boolean };
