import type { SetlistAssignment, SetlistCue, SetlistItem } from '../../../../shared/types';
import type { PerSetlistStageState } from '../hooks/useStagePersistence';
import { CurrentItemView } from './CurrentItemView';
import { CurrentResponsibilities } from './CurrentResponsibilities';
import { CurrentTracks } from './CurrentTracks';
import { LiveCueBar } from './LiveCueBar';
import { NextItemCard } from './NextItemCard';
import { PreviousItemCard } from './PreviousItemCard';
import { StageLyrics } from './StageLyrics';

export function StageLayout({
  organizationId,
  settings,
  currentItem,
  previousItem,
  nextItem,
  elapsedSec,
  remainingSec,
  currentItemAssignments,
  currentUserId,
  previousCue,
  currentCue,
  nextCue,
}: {
  organizationId: string;
  settings: PerSetlistStageState;
  currentItem: SetlistItem | null;
  previousItem: SetlistItem | null;
  nextItem: SetlistItem | null;
  elapsedSec: number;
  remainingSec: number;
  currentItemAssignments: SetlistAssignment[];
  currentUserId?: string;
  previousCue: SetlistCue | null;
  currentCue: SetlistCue | null;
  nextCue: SetlistCue | null;
}) {
  if (settings.layout === 'CLEAN') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-4xl font-bold text-white sm:text-6xl">{currentItem?.title ?? '—'}</p>
        <p className="font-mono text-3xl text-[var(--primary)]">{Math.max(0, Math.floor(remainingSec / 60))} min restantes</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {settings.showPrevious && <PreviousItemCard item={previousItem} />}

      <CurrentItemView
        item={currentItem}
        elapsedSec={elapsedSec}
        remainingSec={remainingSec}
        showKey={settings.showKey}
        showBpm={settings.showBpm}
        showProgress={settings.showProgress}
      />

      {settings.layout !== 'SONG_ONLY' && settings.showLyrics && currentItem?.type === 'SONG' && (
        <StageLyrics organizationId={organizationId} item={currentItem} showChords={settings.showChords} fontSize={settings.zoom} />
      )}

      {(settings.layout === 'SONG_LYRICS_NEXT' || settings.layout === 'PRODUCTION') && settings.showNext && <NextItemCard item={nextItem} />}

      {settings.layout === 'PRODUCTION' && (
        <>
          {settings.showResponsibles && <CurrentResponsibilities assignments={currentItemAssignments} currentUserId={currentUserId} />}
          {currentItem?.type === 'SONG' && <CurrentTracks organizationId={organizationId} item={currentItem} />}
        </>
      )}

      {settings.showCues && <LiveCueBar previousCue={previousCue} currentCue={currentCue} nextCue={nextCue} />}
    </div>
  );
}
