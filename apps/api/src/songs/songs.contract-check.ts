/**
 * Comprobaciones solo de tipos (no corren): si lo que devuelve la API deja de encajar con el tipo de respuesta de
 * @harmonyhub/contracts que usa la web, `npm run typecheck` falla aqui.
 *
 * Las columnas JSON (contentJson, structureJson, metadata) quedan afuera: Prisma las tipa como "cualquier JSON",
 * asi que no se pueden comprobar al compilar.
 */
import type {
  AssertAssignable,
  OrganizationFile,
  SongActivity,
  SongCommentThread,
  SongFile,
  SongLink,
  SongNote,
  SongSummary,
  SongTrack,
  SongVersion,
  SongVersionRevision,
  Wire,
} from '@harmonyhub/contracts';
import type { SongActivityService } from './activity/song-activity.service';
import type { SongCollaborationService } from './collaboration/song-collaboration.service';
import type { SongRevisionsService } from './history/song-revisions.service';
import type { SongNotesService } from './notes/song-notes.service';
import type { SongFilesService } from './files/song-files.service';
import type { SongLinksService } from './links/song-links.service';
import type { SongTracksService } from './tracks/song-tracks.service';
import type { SongVersionsService } from './versions/song-versions.service';
import type { SongsService } from './songs.service';

type Returned<Method extends (...args: never[]) => unknown> = Wire<Awaited<ReturnType<Method>>>;
type Item<List> = List extends readonly (infer Element)[] ? Element : never;
type WithoutJson<T> = Omit<T, 'contentJson' | 'structureJson' | 'metadata'>;

export type SongsContractCheck = [
  AssertAssignable<Returned<SongsService['list']>, SongSummary[]>,
  AssertAssignable<WithoutJson<Item<Returned<SongVersionsService['versions']>>>, WithoutJson<SongVersion>>,
  AssertAssignable<Returned<SongLinksService['links']>, SongLink[]>,
  AssertAssignable<Returned<SongTracksService['tracks']>, SongTrack[]>,
  AssertAssignable<Returned<SongFilesService['files']>, SongFile[]>,
  AssertAssignable<Returned<SongFilesService['organizationFiles']>, { items: OrganizationFile[] }>,
  AssertAssignable<Returned<SongNotesService['list']>, SongNote[]>,
  AssertAssignable<Returned<SongCollaborationService['listThreads']>, SongCommentThread[]>,
  AssertAssignable<WithoutJson<Item<Returned<SongActivityService['list']>['items']>>, WithoutJson<SongActivity>>,
  AssertAssignable<WithoutJson<Item<Returned<SongRevisionsService['list']>>>, WithoutJson<SongVersionRevision>>,
];
