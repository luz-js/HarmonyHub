import type { SongVersion } from '../../../../shared/types';
import { SongLinksPanel } from '../../../songs/components/links/SongLinksPanel';

/** Wrapper de solo lectura sobre SongLinksPanel — sin controles de gestion. */
export function LinksPanelTab({ songId, version }: { songId: string; version: SongVersion }) {
  return <SongLinksPanel songId={songId} versions={[version]} activeVersionId={version.id} canManage={false} />;
}
