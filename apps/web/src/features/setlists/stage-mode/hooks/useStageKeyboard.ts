import { useEffect, useRef } from 'react';
import { resumeAudioHotkeys, suspendAudioHotkeys } from '../../../songs/player/stageModeHotkeys';

export interface StageKeyboardActions {
  nextItem: () => void;
  previousItem: () => void;
  nextCue: () => void;
  previousCue: () => void;
  togglePlay: () => void;
  toggleLyrics: () => void;
  toggleCues: () => void;
  toggleNext: () => void;
  toggleFullscreen: () => void;
  exit: () => void;
}

function canUseStageHotkeys(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return true;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return false;
  return true;
}

/**
 * Centraliza los atajos de Stage Mode (nunca hardcodeados por componente) y suspende los
 * atajos globales de audio (Space/Flechas) mientras esta montado, para que no se disparen
 * ambos a la vez. Usa un ref para las acciones: el listener se registra una sola vez
 * (mount/unmount), nunca se reconstruye en cada render aunque `actions` sea un objeto nuevo.
 */
export function useStageKeyboard(actions: StageKeyboardActions) {
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  useEffect(() => {
    suspendAudioHotkeys();

    function handleKeyDown(event: KeyboardEvent) {
      if (!canUseStageHotkeys(event.target)) return;
      const current = actionsRef.current;

      switch (event.code) {
        case 'ArrowRight':
          event.preventDefault();
          current.nextItem();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          current.previousItem();
          break;
        case 'ArrowDown':
          event.preventDefault();
          current.nextCue();
          break;
        case 'ArrowUp':
          event.preventDefault();
          current.previousCue();
          break;
        case 'Space':
          event.preventDefault();
          current.togglePlay();
          break;
        case 'KeyL':
          current.toggleLyrics();
          break;
        case 'KeyC':
          current.toggleCues();
          break;
        case 'KeyN':
          current.toggleNext();
          break;
        case 'KeyF':
          current.toggleFullscreen();
          break;
        case 'Escape':
          current.exit();
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resumeAudioHotkeys();
    };
  }, []);
}
