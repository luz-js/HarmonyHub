import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { OrgMember } from './current-membership.decorator';
import { PermissionsService } from './permissions.service';
import { OrganizationSource, PERMISSION_KEY, PermissionRequirement } from './require-permission.decorator';

type GuardRequest = {
  user?: { id: string };
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  membership?: OrgMember;
};

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function resolveOrganizationId(request: GuardRequest, source: OrganizationSource) {
  const header = asString(request.headers['x-organization-id']);
  if (source === 'header') return header;
  if (source === 'headerOrQuery') return header || asString(request.query?.organizationId);
  if ('param' in source) return asString(request.params?.[source.param]);
  return asString(request.body?.[source.body]);
}

/**
 * Corre despues de AuthGuard (que deja `req.user`). Si la ruta tiene @RequirePermission, comprueba que la
 * persona sea miembro activo de la organizacion y que su rol tenga ese permiso; guarda la membresia en
 * `req.membership` para @CurrentMembership(). Sin etiqueta no hace nada.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement | undefined>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!requirement) return true;

    const request = context.switchToHttp().getRequest<GuardRequest>();
    const organizationId = resolveOrganizationId(request, requirement.organizationFrom);
    const membership = await this.permissions.assertPermission(request.user!.id, organizationId, requirement.permission);
    request.membership = { id: membership.id, userId: membership.userId, organizationId: membership.organizationId, role: membership.role };
    return true;
  }
}
