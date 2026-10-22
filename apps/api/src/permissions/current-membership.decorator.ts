import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { MembershipRole } from '@prisma/client';

/** La membresia activa que PermissionsGuard ya verifico para esta peticion. */
export type OrgMember = {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
};

export const CurrentMembership = createParamDecorator((_data: unknown, context: ExecutionContext): OrgMember => {
  const request = context.switchToHttp().getRequest<{ membership?: OrgMember }>();
  if (!request.membership) {
    // Error de programacion: la ruta usa @CurrentMembership() sin @RequirePermission.
    throw new Error('@CurrentMembership() requiere @RequirePermission en la ruta');
  }
  return request.membership;
});
