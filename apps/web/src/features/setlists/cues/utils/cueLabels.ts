import {
  AudioLines,
  Guitar,
  Heart,
  Keyboard,
  Lightbulb,
  ListOrdered,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  Mic,
  Moon,
  Music2,
  Play,
  Presentation,
  Sliders,
  Sparkles,
  Speaker,
  Timer,
  TimerReset,
  TrendingDown,
  TrendingUp,
  Video,
  VolumeX,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { CueWarningCode, SetlistCuePhase, SetlistCuePriority, SetlistCueStatus, SetlistCueType } from '../../../../shared/types';
import { getCueCategory } from './cueCategory';

export const TYPE_LABELS: Record<SetlistCueType, string> = {
  COUNT_IN: 'Conteo de entrada',
  CLICK_START: 'Iniciar click',
  CLICK_STOP: 'Detener click',
  PAD_START: 'Iniciar pad',
  PAD_STOP: 'Detener pad',
  TRACK_START: 'Iniciar pista',
  TRACK_STOP: 'Detener pista',
  MUSIC_ENTRY: 'Entrada musical',
  MUSIC_STOP: 'Corte musical',
  DYNAMICS_UP: 'Subir intensidad',
  DYNAMICS_DOWN: 'Bajar intensidad',
  REPEAT_SECTION: 'Repetir sección',
  SKIP_SECTION: 'Saltar sección',
  MODULATION: 'Modulacion',
  TEMPO_CHANGE: 'Cambio de tempo',
  FREE_TIME: 'Tiempo libre',
  HOLD: 'Sostener',
  ENDING: 'Final',
  SPEAKING: 'Habla',
  PRAYER: 'Oración',
  ANNOUNCEMENT: 'Aviso',
  SILENCE: 'Silencio',
  VIDEO_START: 'Iniciar video',
  VIDEO_STOP: 'Detener video',
  SLIDE_CHANGE: 'Cambio de slide',
  LYRICS_ON: 'Mostrar letra',
  LYRICS_OFF: 'Ocultar letra',
  LIGHTS_SCENE: 'Escena de luces',
  LIGHTS_BLACKOUT: 'Apagon',
  LIGHTS_FADE: 'Fundido de luces',
  AUDIO_MUTE: 'Silenciar audio',
  AUDIO_UNMUTE: 'Activar audio',
  AUDIO_LEVEL: 'Nivel de audio',
  MONITOR_CHANGE: 'Cambio de monitor',
  INSTRUMENT_CHANGE: 'Cambio de instrumento',
  CAPO_CHANGE: 'Cambio de capo',
  PATCH_CHANGE: 'Cambio de patch',
  TUNING_CHANGE: 'Cambio de afinación',
  ENTER_STAGE: 'Entrar a escena',
  EXIT_STAGE: 'Salir de escena',
  POSITION_CHANGE: 'Cambio de posición',
  TIMER: 'Temporizador',
  MARKER: 'Marcador',
  CUSTOM: 'Personalizado',
};

export function getCueTypeLabel(type: SetlistCueType): string {
  return TYPE_LABELS[type] ?? type;
}

export const PHASE_LABELS: Record<SetlistCuePhase, string> = {
  BEFORE: 'Antes',
  DURING: 'Durante',
  AFTER: 'Después',
  GLOBAL: 'General',
};

export const STATUS_LABELS: Record<SetlistCueStatus, string> = {
  PENDING: 'Pendiente',
  READY: 'Listo',
  NEEDS_REVIEW: 'Necesita revisión',
  BLOCKED: 'Bloqueado',
  COMPLETED: 'Completado',
  SKIPPED: 'Omitido',
};

export const STATUS_BADGE_CLASS: Record<SetlistCueStatus, string> = {
  PENDING: 'badge-neutral',
  READY: 'badge-primary',
  NEEDS_REVIEW: 'badge-warning',
  BLOCKED: 'badge-danger',
  COMPLETED: 'badge-teal',
  SKIPPED: 'badge-neutral',
};

export const PRIORITY_LABELS: Record<SetlistCuePriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const PRIORITY_BADGE_CLASS: Record<SetlistCuePriority, string> = {
  LOW: 'badge-neutral',
  NORMAL: 'badge-blue',
  HIGH: 'badge-orange',
  CRITICAL: 'badge-danger',
};

export const WARNING_LABELS: Record<CueWarningCode, string> = {
  CRITICAL_WITHOUT_RESPONSIBLE: 'Cue crítico sin responsable',
  BLOCKED: 'Cue bloqueado',
  OFFSET_BEYOND_DURATION: 'Programado después de la duración estimada del item',
  HIDDEN_ITEM: 'Asociado a un item oculto',
  DECLINED_RESPONSIBLE: 'El responsable rechazo su participacion',
  PROBABLE_DUPLICATE: 'Posible cue duplicado',
};

const CATEGORY_ICON: Record<string, LucideIcon> = {
  MUSICAL: Music2,
  TRACKS: AudioLines,
  SPEAKING: Mic,
  VIDEO: Video,
  LIGHTING: Lightbulb,
  AUDIO: Sliders,
  INSTRUMENT: Guitar,
  LOGISTICS: ListOrdered,
  CUSTOM: Sparkles,
};

const TYPE_ICON_OVERRIDES: Partial<Record<SetlistCueType, LucideIcon>> = {
  COUNT_IN: ListOrdered,
  CLICK_START: TimerReset,
  CLICK_STOP: TimerReset,
  PAD_START: Waves,
  PAD_STOP: Waves,
  TRACK_START: Play,
  TRACK_STOP: Play,
  DYNAMICS_UP: TrendingUp,
  DYNAMICS_DOWN: TrendingDown,
  PRAYER: Heart,
  ANNOUNCEMENT: Megaphone,
  SILENCE: VolumeX,
  SLIDE_CHANGE: Presentation,
  LIGHTS_BLACKOUT: Moon,
  MONITOR_CHANGE: Speaker,
  PATCH_CHANGE: Keyboard,
  ENTER_STAGE: LogIn,
  EXIT_STAGE: LogOut,
  TIMER: Timer,
  MARKER: MapPin,
};

export function getCueTypeIcon(type: SetlistCueType): LucideIcon {
  return TYPE_ICON_OVERRIDES[type] ?? CATEGORY_ICON[getCueCategory(type)] ?? Sparkles;
}
