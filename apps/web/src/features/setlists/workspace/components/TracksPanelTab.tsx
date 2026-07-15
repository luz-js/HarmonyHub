import type { SongVersion } from '../../../../shared/types';
import { SongTracksPanel } from '../../../songs/components/tracks/SongTracksPanel';

/** Wrapper de solo lectura sobre SongTracksPanel — sin controles de gestion. */
export function TracksPanelTab({ songId, songTitle, version }: { songId: string; songTitle: string; version: SongVersion }) {
  return <SongTracksPanel songId={songId} songTitle={songTitle} versions={[version]} activeVersionId={version.id} canManage={false} />;
}
