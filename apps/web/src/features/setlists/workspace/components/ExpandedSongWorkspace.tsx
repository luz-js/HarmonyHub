import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SetlistItem } from '../../../../shared/types';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { useSongVersion } from '../../../songs/hooks/useSongVersion';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { WORKSPACE_TABS, type WorkspaceTab } from '../utils/workspaceTabs';
import { CollaborationSummaryPanel } from './CollaborationSummaryPanel';
import { FilesPanelTab } from './FilesPanelTab';
import { HistorySummaryPanel } from './HistorySummaryPanel';
import { LinksPanelTab } from './LinksPanelTab';
import { LyricsPanel } from './LyricsPanel';
import { NotesPanel } from './NotesPanel';
import { SongWorkspaceHeader } from './SongWorkspaceHeader';
import { SongWorkspaceTabs } from './SongWorkspaceTabs';
import { TracksPanelTab } from './TracksPanelTab';

export function ExpandedSongWorkspace({
  id,
  item,
  activeTab,
  onTabChange,
}: {
  id: string;
  item: SetlistItem;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}) {
  const organizationId = getCurrentOrganizationId() || '';
  const songId = item.songId || '';
  const versionId = item.songVersionId || '';
  const versionQuery = useSongVersion(organizationId, songId, versionId);
  const version = versionQuery.data;
  const isMobile = !useMediaQuery('(min-width: 640px)');

  function renderActiveTab(): ReactNode {
    if (!version) return null;
    switch (activeTab) {
      case 'lyrics':
        return <LyricsPanel version={version} />;
      case 'tracks':
        return <TracksPanelTab songId={songId} songTitle={item.song?.title || item.title} version={version} />;
      case 'files':
        return <FilesPanelTab songId={songId} songTitle={item.song?.title || item.title} version={version} />;
      case 'links':
        return <LinksPanelTab songId={songId} version={version} />;
      case 'notes':
        return <NotesPanel organizationId={organizationId} songId={songId} versionId={versionId} />;
      case 'history':
        return <HistorySummaryPanel organizationId={organizationId} songId={songId} songTitle={item.song?.title || item.title} version={version} />;
      case 'collaboration':
        return <CollaborationSummaryPanel organizationId={organizationId} songId={songId} version={version} />;
      default:
        return null;
    }
  }

  return (
    <div id={id} className="mt-1 overflow-hidden rounded-xl border border-[#30333A] bg-[#0C0D0F]">
      <SongWorkspaceHeader item={item} liveVersion={version} />

      {versionQuery.isLoading && <p className="p-4 text-sm text-muted">Cargando canción...</p>}
      {versionQuery.error && <p className="p-4 text-sm text-[#F7A39A]">No se pudo cargar la canción.</p>}

      {version && !isMobile && (
        <div>
          <SongWorkspaceTabs activeTab={activeTab} onChange={onTabChange} idPrefix={id} />
          <div role="tabpanel" id={`${id}-panel-${activeTab}`} aria-labelledby={`${id}-tab-${activeTab}`} tabIndex={0}>
            {renderActiveTab()}
          </div>
        </div>
      )}

      {version && isMobile && (
        <div className="divide-y divide-[#30333A]">
          {WORKSPACE_TABS.map((tab) => {
            const isOpen = activeTab === tab.id;
            return (
              <div key={tab.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${id}-panel-${tab.id}`}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)]"
                  onClick={() => onTabChange(tab.id)}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{tab.label}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div id={`${id}-panel-${tab.id}`} role="region" aria-label={tab.label}>
                    {renderActiveTab()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
