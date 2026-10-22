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

test('los setlists (read) los ve cualquier miembro activo, incluido GUEST', () => {
  assert.equal(permissions.can('GUEST', 'read'), true);
  assert.equal(permissions.can('MUSICIAN', 'read'), true);
  assert.equal(permissions.can('OWNER', 'read'), true);
});

test('setlists.manage permite OWNER/ADMIN/LEADER unicamente', () => {
  assert.equal(permissions.can('OWNER', 'setlists.manage'), true);
  assert.equal(permissions.can('ADMIN', 'setlists.manage'), true);
  assert.equal(permissions.can('LEADER', 'setlists.manage'), true);
  assert.equal(permissions.can('MUSICIAN', 'setlists.manage'), false);
  assert.equal(permissions.can('GUEST', 'setlists.manage'), false);
});

test('setlists.publish y setlists.archive siguen la regla de liderazgo', () => {
  assert.equal(permissions.can('LEADER', 'setlists.publish'), true);
  assert.equal(permissions.can('MUSICIAN', 'setlists.publish'), false);
  assert.equal(permissions.can('LEADER', 'setlists.archive'), true);
  assert.equal(permissions.can('MUSICIAN', 'setlists.archive'), false);
});

test('setlists.delete solo OWNER/ADMIN', () => {
  assert.equal(permissions.can('OWNER', 'setlists.delete'), true);
  assert.equal(permissions.can('ADMIN', 'setlists.delete'), true);
  assert.equal(permissions.can('LEADER', 'setlists.delete'), false);
});

test('el equipo del setlist (read) lo ve cualquier miembro activo, incluido GUEST', () => {
  assert.equal(permissions.can('GUEST', 'read'), true);
  assert.equal(permissions.can('MUSICIAN', 'read'), true);
});

test('setlists.participants/assignments/requirements.manage solo roles de liderazgo', () => {
  for (const permission of ['setlists.participants.manage', 'setlists.assignments.manage', 'setlists.requirements.manage'] as const) {
    assert.equal(permissions.can('OWNER', permission), true);
    assert.equal(permissions.can('ADMIN', permission), true);
    assert.equal(permissions.can('LEADER', permission), true);
    assert.equal(permissions.can('MUSICIAN', permission), false);
    assert.equal(permissions.can('GUEST', permission), false);
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

test('la produccion del setlist (read) la ve cualquier miembro activo, incluido GUEST', () => {
  assert.equal(permissions.can('GUEST', 'read'), true);
  assert.equal(permissions.can('MUSICIAN', 'read'), true);
});

test('setlists.cues.manage solo roles de liderazgo', () => {
  assert.equal(permissions.can('OWNER', 'setlists.cues.manage'), true);
  assert.equal(permissions.can('ADMIN', 'setlists.cues.manage'), true);
  assert.equal(permissions.can('LEADER', 'setlists.cues.manage'), true);
  assert.equal(permissions.can('MUSICIAN', 'setlists.cues.manage'), false);
  assert.equal(permissions.can('GUEST', 'setlists.cues.manage'), false);
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
