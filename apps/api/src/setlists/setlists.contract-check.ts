/**
 * Comprobaciones solo de tipos (no corren): si lo que devuelve la API deja de encajar con el tipo de respuesta de
 * @harmonyhub/contracts que usa la web, `npm run typecheck` falla aqui.
 */
import type {
  AssertAssignable,
  SetlistAssignment,
  SetlistCue,
  SetlistDetail,
  SetlistItem,
  SetlistListResponse,
  SetlistParticipant,
  SetlistProduction,
  SetlistRoleRequirement,
  SetlistTeam,
  Wire,
} from '@harmonyhub/contracts';
import type { SetlistAssignmentsService } from './assignments/setlist-assignments.service';
import type { SetlistParticipantsService } from './assignments/setlist-participants.service';
import type { SetlistRoleRequirementsService } from './assignments/setlist-role-requirements.service';
import type { SetlistCuesService } from './cues/setlist-cues.service';
import type { SetlistItemsService } from './items/setlist-items.service';
import type { SetlistsService } from './setlists.service';

type Returned<Method extends (...args: never[]) => unknown> = Wire<Awaited<ReturnType<Method>>>;

export type SetlistsContractCheck = [
  AssertAssignable<Returned<SetlistsService['list']>, SetlistListResponse>,
  AssertAssignable<Returned<SetlistsService['detail']>, SetlistDetail>,
  AssertAssignable<Returned<SetlistItemsService['list']>, SetlistItem[]>,
  AssertAssignable<Returned<SetlistItemsService['create']>, SetlistItem>,
  AssertAssignable<Returned<SetlistParticipantsService['list']>, SetlistParticipant[]>,
  AssertAssignable<Returned<SetlistAssignmentsService['list']>, SetlistAssignment[]>,
  AssertAssignable<Returned<SetlistAssignmentsService['team']>, SetlistTeam>,
  AssertAssignable<Returned<SetlistRoleRequirementsService['list']>, SetlistRoleRequirement[]>,
  AssertAssignable<Returned<SetlistCuesService['list']>, SetlistCue[]>,
  AssertAssignable<Returned<SetlistCuesService['production']>, SetlistProduction>,
];
