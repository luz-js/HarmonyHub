/**
 * Comprobaciones solo de tipos (no corren): si lo que devuelve la API deja de encajar con el tipo de respuesta de
 * @harmonyhub/contracts que usa la web, `npm run typecheck` falla aqui.
 */
import type { AssertAssignable, InvitationSummary, MyInvitation, OrganizationMember, OrganizationSummary, Wire } from '@harmonyhub/contracts';
import type { InvitationsService } from '../invitations/invitations.service';
import type { MembershipsService } from '../memberships/memberships.service';
import type { OrganizationsService } from './organizations.service';

type Returned<Method extends (...args: never[]) => unknown> = Wire<Awaited<ReturnType<Method>>>;

export type OrganizationsContractCheck = [
  AssertAssignable<Returned<OrganizationsService['create']>, OrganizationSummary>,
  AssertAssignable<Returned<OrganizationsService['archive']>, OrganizationSummary>,
  AssertAssignable<Returned<MembershipsService['list']>, OrganizationMember[]>,
  AssertAssignable<Returned<InvitationsService['list']>, InvitationSummary[]>,
  AssertAssignable<Returned<InvitationsService['listMine']>, MyInvitation[]>,
];
