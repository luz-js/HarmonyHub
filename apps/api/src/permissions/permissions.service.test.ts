import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PermissionsService } from './permissions.service';

// Estos metodos son puros (no tocan Prisma), por lo que se puede instanciar
// el servicio sin una conexion real a la base de datos.
const permissions = new PermissionsService(null as any);

test('isLeadershipRole identifica OWNER/ADMIN/LEADER unicamente', () => {
  assert.equal(permissions.isLeadershipRole('OWNER'), true);
  assert.equal(permissions.isLeadershipRole('ADMIN'), true);
  assert.equal(permissions.isLeadershipRole('LEADER'), true);
  assert.equal(permissions.isLeadershipRole('MUSICIAN'), false);
  assert.equal(permissions.isLeadershipRole('GUEST'), false);
});

test('canCreateSongNoteVisibility restringe LEADERS_ONLY a roles de liderazgo', () => {
  assert.equal(permissions.canCreateSongNoteVisibility('MUSICIAN', 'LEADERS_ONLY'), false);
  assert.equal(permissions.canCreateSongNoteVisibility('GUEST', 'LEADERS_ONLY'), false);
  assert.equal(permissions.canCreateSongNoteVisibility('LEADER', 'LEADERS_ONLY'), true);
  assert.equal(permissions.canCreateSongNoteVisibility('OWNER', 'LEADERS_ONLY'), true);
});

test('canCreateSongNoteVisibility permite PRIVATE/ORGANIZATION a todos menos GUEST', () => {
  for (const visibility of ['PRIVATE', 'ORGANIZATION'] as const) {
    assert.equal(permissions.canCreateSongNoteVisibility('MUSICIAN', visibility), true);
    assert.equal(permissions.canCreateSongNoteVisibility('LEADER', visibility), true);
    assert.equal(permissions.canCreateSongNoteVisibility('GUEST', visibility), false);
  }
});

test('buildVisibleSongNoteWhere nunca expone PRIVATE ajenas y respeta LEADERS_ONLY por rol', () => {
  const musicianWhere = permissions.buildVisibleSongNoteWhere('user-1', 'MUSICIAN');
  const conditions = (musicianWhere as any).OR;
  assert.ok(conditions.some((c: any) => c.visibility === 'ORGANIZATION'));
  assert.ok(conditions.some((c: any) => c.visibility === 'PRIVATE' && c.authorId === 'user-1'));
  assert.ok(!conditions.some((c: any) => c.visibility === 'LEADERS_ONLY'));

  const leaderWhere = permissions.buildVisibleSongNoteWhere('user-2', 'LEADER');
  const leaderConditions = (leaderWhere as any).OR;
  assert.ok(leaderConditions.some((c: any) => c.visibility === 'LEADERS_ONLY'));
});

test('canModifySongNote: el autor siempre puede, PRIVATE ajena nunca, compartida solo OWNER/ADMIN', () => {
  const privateNote = { authorId: 'author-1', visibility: 'PRIVATE' as const };
  const orgNote = { authorId: 'author-1', visibility: 'ORGANIZATION' as const };

  assert.equal(permissions.canModifySongNote('MUSICIAN', privateNote, 'author-1'), true);
  assert.equal(permissions.canModifySongNote('OWNER', privateNote, 'other-user'), false);
  assert.equal(permissions.canModifySongNote('ADMIN', orgNote, 'other-user'), true);
  assert.equal(permissions.canModifySongNote('LEADER', orgNote, 'other-user'), false);
  assert.equal(permissions.canModifySongNote('MUSICIAN', orgNote, 'other-user'), false);
});

test('canResolveSongThread permite roles de liderazgo o al creador del thread', () => {
  assert.equal(permissions.canResolveSongThread('MUSICIAN', true), true);
  assert.equal(permissions.canResolveSongThread('MUSICIAN', false), false);
  assert.equal(permissions.canResolveSongThread('LEADER', false), true);
});

test('canModerateSongComment solo OWNER/ADMIN', () => {
  assert.equal(permissions.canModerateSongComment('OWNER'), true);
  assert.equal(permissions.canModerateSongComment('ADMIN'), true);
  assert.equal(permissions.canModerateSongComment('LEADER'), false);
  assert.equal(permissions.canModerateSongComment('MUSICIAN'), false);
});

test('canViewSetlists permite a cualquier miembro activo (incluido GUEST)', () => {
  assert.equal(permissions.canViewSetlists('GUEST'), true);
  assert.equal(permissions.canViewSetlists('MUSICIAN'), true);
  assert.equal(permissions.canViewSetlists('OWNER'), true);
});

test('canManageSetlists permite OWNER/ADMIN/LEADER unicamente', () => {
  assert.equal(permissions.canManageSetlists('OWNER'), true);
  assert.equal(permissions.canManageSetlists('ADMIN'), true);
  assert.equal(permissions.canManageSetlists('LEADER'), true);
  assert.equal(permissions.canManageSetlists('MUSICIAN'), false);
  assert.equal(permissions.canManageSetlists('GUEST'), false);
});

test('canPublishSetlists y canArchiveSetlists siguen la regla de liderazgo', () => {
  assert.equal(permissions.canPublishSetlists('LEADER'), true);
  assert.equal(permissions.canPublishSetlists('MUSICIAN'), false);
  assert.equal(permissions.canArchiveSetlists('LEADER'), true);
  assert.equal(permissions.canArchiveSetlists('MUSICIAN'), false);
});

test('canDeleteSetlists solo OWNER/ADMIN', () => {
  assert.equal(permissions.canDeleteSetlists('OWNER'), true);
  assert.equal(permissions.canDeleteSetlists('ADMIN'), true);
  assert.equal(permissions.canDeleteSetlists('LEADER'), false);
});

test('canViewSetlistAssignments permite a cualquier miembro activo (incluido GUEST)', () => {
  assert.equal(permissions.canViewSetlistAssignments('GUEST'), true);
  assert.equal(permissions.canViewSetlistAssignments('MUSICIAN'), true);
});

test('canManageSetlistParticipants/Assignments/Requirements solo roles de liderazgo', () => {
  for (const method of ['canManageSetlistParticipants', 'canManageSetlistAssignments', 'canManageSetlistRequirements'] as const) {
    assert.equal(permissions[method]('OWNER'), true);
    assert.equal(permissions[method]('ADMIN'), true);
    assert.equal(permissions[method]('LEADER'), true);
    assert.equal(permissions[method]('MUSICIAN'), false);
    assert.equal(permissions[method]('GUEST'), false);
  }
});

test('canUpdateOwnPreparationStatus depende exclusivamente de ser el asignado', () => {
  assert.equal(permissions.canUpdateOwnPreparationStatus(true), true);
  assert.equal(permissions.canUpdateOwnPreparationStatus(false), false);
});

test('canUpdateAnyPreparationStatus solo roles de liderazgo', () => {
  assert.equal(permissions.canUpdateAnyPreparationStatus('LEADER'), true);
  assert.equal(permissions.canUpdateAnyPreparationStatus('MUSICIAN'), false);
});

test('canViewSetlistCues permite a cualquier miembro activo (incluido GUEST)', () => {
  assert.equal(permissions.canViewSetlistCues('GUEST'), true);
  assert.equal(permissions.canViewSetlistCues('MUSICIAN'), true);
});

test('canManageSetlistCues solo roles de liderazgo', () => {
  assert.equal(permissions.canManageSetlistCues('OWNER'), true);
  assert.equal(permissions.canManageSetlistCues('ADMIN'), true);
  assert.equal(permissions.canManageSetlistCues('LEADER'), true);
  assert.equal(permissions.canManageSetlistCues('MUSICIAN'), false);
  assert.equal(permissions.canManageSetlistCues('GUEST'), false);
});

test('canUpdateOwnCueStatus depende exclusivamente de ser el responsable', () => {
  assert.equal(permissions.canUpdateOwnCueStatus(true), true);
  assert.equal(permissions.canUpdateOwnCueStatus(false), false);
});

test('canUpdateAnyCueStatus solo roles de liderazgo', () => {
  assert.equal(permissions.canUpdateAnyCueStatus('LEADER'), true);
  assert.equal(permissions.canUpdateAnyCueStatus('MUSICIAN'), false);
});

test('canAssignMembershipRole: solo un OWNER puede asignar el rol OWNER', () => {
  assert.equal(permissions.canAssignMembershipRole('OWNER', 'OWNER'), true);
  assert.equal(permissions.canAssignMembershipRole('ADMIN', 'OWNER'), false);
  assert.equal(permissions.canAssignMembershipRole('ADMIN', 'ADMIN'), true);
  assert.equal(permissions.canAssignMembershipRole('ADMIN', 'GUEST'), true);
});
