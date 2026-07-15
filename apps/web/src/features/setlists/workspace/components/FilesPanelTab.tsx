import type { SongVersion } from '../../../../shared/types';
import { SongFilesPanel } from '../../../songs/components/files/SongFilesPanel';

/** Wrapper de solo lectura sobre SongFilesPanel — sin controles de gestion. */
export function FilesPanelTab({ songId, songTitle, version }: { songId: string; songTitle: string; version: SongVersion }) {
  return <SongFilesPanel songId={songId} songTitle={songTitle} versions={[version]} activeVersionId={version.id} canManage={false} />;
}
