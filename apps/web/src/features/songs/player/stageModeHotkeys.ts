/**
 * Flag compartido minimo: mientras Stage Mode esta montado, los atajos globales de
 * AudioPlayerProvider (Space/Flecha izquierda/Flecha derecha) se suspenden para que no
 * disparen a la vez que la navegacion de Stage Mode. No cambia el comportamiento por
 * defecto (el flag es `false` siempre que Stage Mode no este activo).
 */
let suspended = false;

export function suspendAudioHotkeys() {
  suspended = true;
}

export function resumeAudioHotkeys() {
  suspended = false;
}

export function isAudioHotkeysSuspended() {
  return suspended;
}
