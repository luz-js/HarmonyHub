/** Viven en @harmonyhub/contracts: la API comprueba sus respuestas contra estos mismos tipos. */
export type {
  OrganizationFile,
  RevisionSource,
  SongActivity,
  SongActivityPage,
  SongActivityType,
  SongCollaborationUserRef,
  SongComment,
  SongCommentTarget,
  SongCommentThread,
  SongContent,
  SongDetail,
  SongEntityType,
  SongFile,
  SongFileCategory,
  SongLink,
  SongLinkProvider,
  SongNote,
  SongNoteVisibility,
  SongRevisionDiff,
  SongRevisionDiffResult,
  SongRevisionScalarChange,
  SongRevisionSectionChange,
  SongSummary,
  SongThreadStatus,
  SongTrack,
  SongTrackType,
  SongVersion,
  SongVersionRevision,
  TrackProvider,
} from '@harmonyhub/contracts';
import type { SongSummary } from '@harmonyhub/contracts';

/** Lo que manda el formulario de cancion (crear y editar). La API lo valida con createSongSchema / updateSongSchema. */
export type SongPayload = Omit<Partial<SongSummary>, 'tags'> & {
  tags?: string | string[];
  lyrics?: string;
  chords?: string;
  notes?: string;
  youtubeUrl?: string;
};
