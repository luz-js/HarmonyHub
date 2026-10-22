import assert from 'node:assert/strict';
import { test } from 'node:test';
import { $Enums } from '@prisma/client';
import { ATTENDANCE_STATUSES, EVENT_STATUSES, SETLIST_STATUSES, INVITATION_STATUSES, MEMBERSHIP_ROLES, MEMBERSHIP_STATUSES, ORGANIZATION_TYPES, SETLIST_MUSICAL_ROLES } from '@harmonyhub/contracts';

/** Los contratos copian los enums de Prisma (la web no puede importar Prisma): tienen que seguir iguales. */
const pairs: [string, readonly string[], Record<string, string>][] = [
  ['MembershipRole', MEMBERSHIP_ROLES, $Enums.MembershipRole],
  ['MembershipStatus', MEMBERSHIP_STATUSES, $Enums.MembershipStatus],
  ['OrganizationType', ORGANIZATION_TYPES, $Enums.OrganizationType],
  ['InvitationStatus', INVITATION_STATUSES, $Enums.InvitationStatus],
  ['EventStatus', EVENT_STATUSES, $Enums.EventStatus],
  ['AttendanceStatus', ATTENDANCE_STATUSES, $Enums.AttendanceStatus],
  ['SetlistStatus', SETLIST_STATUSES, $Enums.SetlistStatus],
  ['SetlistMusicalRole', SETLIST_MUSICAL_ROLES, $Enums.SetlistMusicalRole],
];

for (const [name, contract, prisma] of pairs) {
  test(`el contrato ${name} coincide con el enum de Prisma`, () => {
    assert.deepEqual([...contract].sort(), Object.values(prisma).sort());
  });
}
