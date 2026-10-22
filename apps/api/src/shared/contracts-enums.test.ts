import assert from 'node:assert/strict';
import { test } from 'node:test';
import { $Enums } from '@prisma/client';
import {
  ASSIGNMENT_PREPARATION_STATUSES,
  SETLIST_CUE_PHASES,
  SETLIST_CUE_PRIORITIES,
  SETLIST_CUE_STATUSES,
  SETLIST_CUE_TYPES,
  SETLIST_ITEM_TYPES,
  SETLIST_PARTICIPANT_STATUSES,
  REVISION_SOURCES,
  SONG_ACTIVITY_TYPES,
  SONG_COMMENT_TARGETS,
  SONG_ENTITY_TYPES,
  SONG_FILE_CATEGORIES,
  SONG_LINK_PROVIDERS,
  SONG_NOTE_VISIBILITIES,
  SONG_THREAD_STATUSES,
  SONG_TRACK_TYPES,
  TRACK_PROVIDERS,
} from '@harmonyhub/contracts';
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
  ['SetlistItemType', SETLIST_ITEM_TYPES, $Enums.SetlistItemType],
  ['SetlistParticipantStatus', SETLIST_PARTICIPANT_STATUSES, $Enums.SetlistParticipantStatus],
  ['AssignmentPreparationStatus', ASSIGNMENT_PREPARATION_STATUSES, $Enums.AssignmentPreparationStatus],
  ['SetlistCueType', SETLIST_CUE_TYPES, $Enums.SetlistCueType],
  ['SetlistCuePhase', SETLIST_CUE_PHASES, $Enums.SetlistCuePhase],
  ['SetlistCueStatus', SETLIST_CUE_STATUSES, $Enums.SetlistCueStatus],
  ['SetlistCuePriority', SETLIST_CUE_PRIORITIES, $Enums.SetlistCuePriority],
  ['SongTrackType', SONG_TRACK_TYPES, $Enums.SongTrackType],
  ['TrackProvider', TRACK_PROVIDERS, $Enums.TrackProvider],
  ['SongCommentTarget', SONG_COMMENT_TARGETS, $Enums.SongCommentTarget],
  ['SongThreadStatus', SONG_THREAD_STATUSES, $Enums.SongThreadStatus],
  ['SongNoteVisibility', SONG_NOTE_VISIBILITIES, $Enums.SongNoteVisibility],
  ['SongActivityType', SONG_ACTIVITY_TYPES, $Enums.SongActivityType],
  ['SongEntityType', SONG_ENTITY_TYPES, $Enums.SongEntityType],
  ['SongFileCategory', SONG_FILE_CATEGORIES, $Enums.SongFileCategory],
  ['SongLinkProvider', SONG_LINK_PROVIDERS, $Enums.SongLinkProvider],
  ['RevisionSource', REVISION_SOURCES, $Enums.RevisionSource],
  ['SetlistMusicalRole', SETLIST_MUSICAL_ROLES, $Enums.SetlistMusicalRole],
];

for (const [name, contract, prisma] of pairs) {
  test(`el contrato ${name} coincide con el enum de Prisma`, () => {
    assert.deepEqual([...contract].sort(), Object.values(prisma).sort());
  });
}
