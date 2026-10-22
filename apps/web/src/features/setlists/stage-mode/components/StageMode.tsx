import { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useStageKeyboard } from '../hooks/useStageKeyboard';
import { useStageMode } from '../hooks/useStageMode';
import { QuickJumpDialog } from './QuickJumpDialog';
import { StageControls } from './StageControls';
import { StageDrawer } from './StageDrawer';
import { StageFooter } from './StageFooter';
import { StageLayout } from './StageLayout';
import { StageSettings } from './StageSettings';
import { useMarkStageModeOpen } from '../../../../pwa/hooks';
import { canManageSetlistsClientSide, getCurrentUser } from '../../utils';
import { LiveStageBar } from '../live/LiveStageBar';
import { useLiveStage } from '../live/useLiveStage';
import { StageTopBar } from './StageTopBar';

export function StageMode({ organizationId, setlistId, setlistName, onExit }: { organizationId: string; setlistId: string; setlistName: string; onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);

  const stage = useStageMode(organizationId, setlistId);
  useMarkStageModeOpen();
  // En vivo: sigue al lider o, si dirige esta persona, avisa cada cambio de item a los demas dispositivos.
  const live = useLiveStage({
    setlistId,
    currentUserId: stage.currentUser.id,
    currentItemId: stage.navigation.currentItemId,
    goToItem: stage.navigation.goToItem,
    canLead: canManageSetlistsClientSide(getCurrentUser().role),
  });
  const { state, update, navigation, cue, timers, currentUserId } = { ...stage, currentUserId: stage.currentUser.id };

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().then(() => setIsFullscreen(false));
    } else {
      void containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    }
  }

  useStageKeyboard({
    nextItem: navigation.goToNext,
    previousItem: navigation.goToPrevious,
    nextCue: cue.goToNextCue,
    previousCue: cue.goToPreviousCue,
    togglePlay: timers.togglePlay,
    toggleLyrics: () => update({ showLyrics: !state.showLyrics }),
    toggleCues: () => update({ showCues: !state.showCues }),
    toggleNext: () => update({ showNext: !state.showNext }),
    toggleFullscreen,
    exit: onExit,
  });

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-[#111214]">
      <StageTopBar
        name={setlistName}
        showClock={state.showClock}
        clockFormat={state.clockFormat}
        onOpenSettings={() => setSettingsOpen(true)}
        onExit={onExit}
        live={<LiveStageBar live={live} organizationId={organizationId} />}
      />

      <div className="flex-1 overflow-hidden">
        <StageLayout
          organizationId={organizationId}
          settings={state}
          currentItem={navigation.currentItem}
          previousItem={navigation.previousItem}
          nextItem={navigation.nextItem}
          elapsedSec={timers.elapsedSec}
          remainingSec={timers.remainingSec}
          currentItemAssignments={stage.currentItemAssignments}
          currentUserId={currentUserId}
          previousCue={cue.previousCue}
          currentCue={cue.currentCue}
          nextCue={cue.nextCue}
        />
      </div>

      <StageFooter>
        <div className="flex justify-end">
          <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => setQuickJumpOpen(true)}>
            <Search className="h-3.5 w-3.5" /> Ir a...
          </button>
        </div>
        <StageControls
          isRunning={timers.isRunning}
          isFullscreen={isFullscreen}
          layout={state.layout}
          onPrevious={navigation.goToPrevious}
          onTogglePlay={timers.togglePlay}
          onNext={navigation.goToNext}
          onToggleFullscreen={toggleFullscreen}
          onChangeLayout={(layout) => update({ layout })}
        />
      </StageFooter>

      {settingsOpen && (
        <StageDrawer title="Ajustes de Stage Mode" onClose={() => setSettingsOpen(false)}>
          <StageSettings state={state} update={update} />
        </StageDrawer>
      )}

      {quickJumpOpen && (
        <QuickJumpDialog
          items={navigation.visibleItems}
          cues={cue.cues}
          onSelectItem={navigation.goToItem}
          onSelectCue={cue.goToCue}
          onClose={() => setQuickJumpOpen(false)}
        />
      )}
    </div>
  );
}
