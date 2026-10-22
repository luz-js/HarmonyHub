import assert from 'node:assert/strict';
import { test } from 'node:test';
import { $Enums } from '@prisma/client';
import { MEMBERSHIP_ROLES, SETLIST_MUSICAL_ROLES } from '@harmonyhub/contracts';

/** Los contratos copian los enums de Prisma (la web no puede importar Prisma): tienen que seguir iguales. */
const pairs: [string, readonly string[], Record<string, string>][] = [
  ['MembershipRole', MEMBERSHIP_ROLES, $Enums.MembershipRole],
  ['SetlistMusicalRole', SETLIST_MUSICAL_ROLES, $Enums.SetlistMusicalRole],
];

for (const [name, contract, prisma] of pairs) {
  test(`el contrato ${name} coincide con el enum de Prisma`, () => {
    assert.deepEqual([...contract].sort(), Object.values(prisma).sort());
  });
}
